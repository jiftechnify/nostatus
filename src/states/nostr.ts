import {
  RelayList,
  getFirstTagValueByName,
  getTagValuesByName,
  parseRelayListInEvent,
  selectRelaysByUsage,
} from "../nostr";
import { currUnixtime, wait } from "../utils";
import {
  AccountMetadata,
  StatusData,
  UserProfile,
  UserStatus,
  UserStatusCategory,
  isSupportedUserStatusCategory,
  userStatusCategories,
} from "./nostrModels";

import { atom, getDefaultStore, useAtomValue, useSetAtom } from "jotai";
import { RESET, atomFamily, atomWithReset, atomWithStorage, loadable, selectAtom } from "jotai/utils";
import { useCallback } from "react";

import { rxNostrAdapter } from "@nostr-fetch/adapter-rx-nostr";
import { waitNostr } from "nip07-awaiter";
import { NostrEvent, NostrFetcher } from "nostr-fetch";
import { getPublicKey } from "nostr-tools";
import { createRxForwardReq, createRxNostr, getSignedEvent, uniq, verify } from "rx-nostr";
import { Subscription } from "rxjs";

const jotaiStore = getDefaultStore();

const inputPubkeyAtom = atomWithStorage<string | undefined>("nostr_pubkey", undefined);
const inputPrivkeyAtom = atomWithReset<string | undefined>(undefined);

const myPubkeyAtom = atom((get) => {
  const pubkey = get(inputPubkeyAtom);
  if (pubkey !== undefined) {
    return pubkey;
  }
  const privkey = get(inputPrivkeyAtom);
  if (privkey !== undefined) {
    return getPublicKey(privkey);
  }
  return undefined;
});

const isLoggedInAtom = atom((get) => {
  return get(myPubkeyAtom) !== undefined;
});

// temporarily mask my pubkey. used to cause hard reload
const isMyPubkeyMaskedAtom = atom(false);
const maskedMyPubkeyAtom = atom((get) => {
  if (get(isMyPubkeyMaskedAtom)) {
    return undefined;
  }
  return get(myPubkeyAtom);
});

export const useMyPubkey = () => {
  return useAtomValue(myPubkeyAtom);
};

export const useLoginWithPubkey = () => {
  return useSetAtom(inputPubkeyAtom);
};

export const useLoginWithPrivkey = () => {
  return useSetAtom(inputPrivkeyAtom);
};

export const useLogout = () => {
  const setPubkey = useSetAtom(inputPubkeyAtom);
  const setPrivkey = useSetAtom(inputPrivkeyAtom);

  const logout = useCallback(() => {
    setPubkey(RESET);
    setPrivkey(RESET);
  }, [setPubkey, setPrivkey]);

  return logout;
};

export const useHardReload = () => {
  const setIsPubkeyMasked = useSetAtom(isMyPubkeyMaskedAtom);

  const hardReload = useCallback(async () => {
    setIsPubkeyMasked(true);

    // clear all caches
    localStorage.removeItem(ACCT_DATA_CACHE_KEY);
    localStorage.removeItem(PROFILE_CACHE_KEY);
    localStorage.removeItem(STATUSES_CACHE_KEY);

    // TODO: properly wait for state reset
    await wait(200);

    setIsPubkeyMasked(false);
  }, [setIsPubkeyMasked]);

  return hardReload;
};

const ACCT_DATA_CACHE_KEY = "nostr_my_data";
const ACCT_DATA_CACHE_TTL = 10 * 60; // 10 mins

const saveMyAccountDataCache = (metadata: AccountMetadata) => {
  localStorage.setItem(ACCT_DATA_CACHE_KEY, JSON.stringify(metadata));
};
const getMyAccountDataCache = (): AccountMetadata | undefined => {
  const json = localStorage.getItem(ACCT_DATA_CACHE_KEY);
  if (json === null) {
    return undefined;
  }
  try {
    const data = JSON.parse(json) as AccountMetadata;
    return data;
  } catch (err) {
    console.error(err);
    return undefined;
  }
};

export const myAccountDataAtom = atom<Promise<AccountMetadata | undefined>>(async (get) => {
  const pubkey = get(maskedMyPubkeyAtom);
  if (pubkey === undefined) {
    return undefined;
  }
  const cache = getMyAccountDataCache();
  if (
    cache !== undefined &&
    currUnixtime() - cache.lastFetchedAt <= ACCT_DATA_CACHE_TTL &&
    cache.profile.pubkey === pubkey
  ) {
    console.log("using cached account data");
    return cache;
  }

  console.log("cache not found; fetching account data from relays");
  return fetchAccountData(pubkey);
});

const myAcctDataAvailableAtom = atom((get) => {
  const d = get(loadable(myAccountDataAtom));
  return d.state === "hasData" && d.data !== undefined;
});

export const followingsProfilesAtom = atom(new Map<string, UserProfile>());
export const userProfileAtomFamily = atomFamily((pubkey: string) => {
  return selectAtom(
    followingsProfilesAtom,
    (profilesMap) => {
      return profilesMap.get(pubkey) ?? { srcEventId: "undefined", pubkey };
    },
    (a, b) => {
      return a.srcEventId === b.srcEventId;
    }
  );
});

export const followingsStatusesAtom = atom(new Map<string, UserStatus>());
export const userStatusAtomFamily = atomFamily((pubkey: string) => {
  return selectAtom(
    followingsStatusesAtom,
    (statusesMap) => {
      return statusesMap.get(pubkey);
    },
    (a, b) => {
      if (a === undefined || b === undefined) {
        return a === b;
      }
      return UserStatus.contentId(a) === UserStatus.contentId(b);
    }
  );
});

export const myGeneralStatusAtom = atom((get) => {
  const myPubkey = get(maskedMyPubkeyAtom);
  if (myPubkey === undefined) {
    return undefined;
  }
  return get(userStatusAtomFamily(myPubkey))?.general;
});

export const myMusicStatusAtom = atom((get) => {
  const myPubkey = get(maskedMyPubkeyAtom);
  if (myPubkey === undefined) {
    return undefined;
  }
  return get(userStatusAtomFamily(myPubkey))?.music;
});

export const pubkeysOrderByLastStatusUpdateTimeAtom = atom((get) => {
  const statusesMap = get(followingsStatusesAtom);
  return [...statusesMap.values()]
    .toSorted((s1, s2) => {
      const updTimeDiff = UserStatus.lastUpdateTime(s2) - UserStatus.lastUpdateTime(s1);
      if (updTimeDiff !== 0) {
        return updTimeDiff;
      }
      return s1.pubkey.localeCompare(s2.pubkey); // ensure stable order
    })
    .map((s) => s.pubkey);
});

export const isNostrExtAvailableAtom = atom<boolean>(window.nostr !== undefined);
if (window.nostr === undefined) {
  isNostrExtAvailableAtom.onMount = (set) => {
    const setNostrExt = async () => {
      set((await waitNostr(1500)) !== undefined);
    };
    setNostrExt().catch((e) => console.error("failed to detect Nostr extension:", e));
  };
}

// get user's pubkey from nostr extension on login
const pubkeyInNostrExtAtomBase = loadable(
  atom(async (get) => {
    const isLoggedIn = get(isLoggedInAtom);
    const isNostrExtAvailable = get(isNostrExtAvailableAtom);
    if (isLoggedIn && isNostrExtAvailable) {
      await wait(1000); // HACK: wait for nos2x overrides alby extension if both extensions coexist
      return window.nostr.getPublicKey();
    }
    return Promise.resolve(undefined);
  })
);

const pubkeyInNostrExtAtom = atom((get) => {
  const pkLoadable = get(pubkeyInNostrExtAtomBase);
  console.log(pkLoadable);
  return pkLoadable.state === "hasData" ? pkLoadable.data : undefined;
});

// write ops are enabled if:
// - logged in via privkey
// - logged in via NIP-07 extension
// - logged in via pubkey and it matches with pubkey in NIP-07 extension
export const useWriteOpsEnabled = () => {
  const inputPrivkey = useAtomValue(inputPrivkeyAtom);

  const inputPubkey = useAtomValue(inputPubkeyAtom);
  const pubkeyInNostrExt = useAtomValue(pubkeyInNostrExtAtom);

  return inputPrivkey !== undefined || (inputPubkey !== undefined && inputPubkey === pubkeyInNostrExt);
};

const bootstrapFetcher = NostrFetcher.init();

const rxNostr = createRxNostr();
const fetcherOnRxNostr = NostrFetcher.withCustomPool(rxNostrAdapter(rxNostr));

const defaultBootstrapRelays = ["wss://relay.nostr.band", "wss://relayable.org", "wss://directory.yabu.me"];

const fallbackRelayList: RelayList = {
  "wss://relay.nostr.band": { read: true, write: true },
  "wss://relayable.org": { read: true, write: true },
  "wss://relay.damus.io": { read: false, write: true },
  "wss://yabu.me": { read: true, write: false },
};

// first, get read relays from NIP-07 extension if available. if no relays found, use default relays.
// 2nd element of return value: whether relays are default or not
const getBootstrapRelays = async (): Promise<[string[], boolean]> => {
  if (window.nostr === undefined || typeof window.nostr.getRelays !== "function") {
    return [defaultBootstrapRelays, true];
  }
  const nostrExtRelays = await window.nostr.getRelays();
  const nostrExtReadRelays = nostrExtRelays !== undefined ? selectRelaysByUsage(nostrExtRelays, "read") : [];
  return nostrExtReadRelays.length > 0 ? [nostrExtReadRelays, false] : [defaultBootstrapRelays, true];
};

const extractRelayListOrDefault = (evs: (NostrEvent | undefined)[]): RelayList => {
  const relayListEvs = evs.filter((ev): ev is NostrEvent => ev !== undefined && [3, 10002].includes(ev.kind));
  if (relayListEvs.length === 0) {
    console.warn("failed to fetch events that have relay list; using fallback relays");
    return fallbackRelayList;
  }

  // 1. try newer one out of kind:3 and kind:10002
  // 2. if fails, try older one
  // 3. if both fail, return default
  const evsLatestOrder = relayListEvs.sort((a, b) => b.created_at - a.created_at);
  for (const ev of evsLatestOrder) {
    const res = parseRelayListInEvent(ev);
    if (res !== undefined) {
      console.log("extracted relay list from kind %d: %O", ev.kind, res);
      return res;
    }
  }
  console.warn("failed to extract relay list from events; using fallback relays");
  return fallbackRelayList;
};

/* fetch account data */
export const fetchAccountData = async (pubkey: string): Promise<AccountMetadata> => {
  const fetchBody = async (bootstrapRelays: string[], isDefault: boolean): Promise<AccountMetadata> => {
    const [k0, k3, k10002] = await Promise.all(
      [0, 3, 10002].map((kind) =>
        bootstrapFetcher.fetchLastEvent(
          bootstrapRelays,
          {
            authors: [pubkey],
            kinds: [kind],
          },
          { connectTimeoutMs: 3000 }
        )
      )
    );
    if (!isDefault && (k0 === undefined || [k3, k10002].every((ev) => ev === undefined))) {
      // if some of event are not found in relays from NIP-07 ext, fallback to default relays
      console.log("fallback to default bootstrap relays");
      return fetchBody(defaultBootstrapRelays, true);
    }

    const profile = k0 !== undefined ? UserProfile.fromEvent(k0) : { srcEventId: "undefined", pubkey };
    const followings = k3 !== undefined ? getTagValuesByName(k3, "p") : [];
    const relayList = extractRelayListOrDefault([k3, k10002]);
    return { profile, followings, relayList, lastFetchedAt: currUnixtime() };
  };

  const [bootstrapRelays, isDefault] = await getBootstrapRelays();
  console.log("bootstrapRelays:", bootstrapRelays);
  const data = await fetchBody(bootstrapRelays, isDefault);

  saveMyAccountDataCache(data);

  return data;
};

// turn into `true` when rxNostr.switchRelays() has finished
// triggers fetching followings profiles and statuses
const bootstrapFinishedAtom = atom(false);

/* switch relays after fetched my account data */
jotaiStore.sub(myAcctDataAvailableAtom, async () => {
  const myDataAvailable = jotaiStore.get(myAcctDataAvailableAtom);

  if (myDataAvailable) {
    const data = await jotaiStore.get(myAccountDataAtom);
    if (data === undefined) {
      console.error("unreachable");
      return;
    }
    console.log("switching relays to:", data.relayList);
    await rxNostr.switchRelays(data.relayList);

    jotaiStore.set(bootstrapFinishedAtom, true);
  } else {
    // myData cleared -> disconnect from all relays
    console.log("disconnect from all relays");
    await rxNostr.switchRelays([]);
    jotaiStore.set(bootstrapFinishedAtom, false);
  }
});

/* fetch profiles of followings */
const profilesMap = new Map<string, UserProfile>();

let fetchProfilesAbortCtrl: AbortController | undefined;
const cancelFetchProfiles = () => {
  if (fetchProfilesAbortCtrl !== undefined) {
    fetchProfilesAbortCtrl.abort();
    fetchProfilesAbortCtrl = undefined;
  }
};

// profiles cache
type UserProfileCache = {
  profile: UserProfile;
  lastFetchedAt: number;
};
const PROFILE_CACHE_KEY = "nostr_profiles";
const PROFILE_CACHE_TIME_TO_STALE = 10 * 60; // 10 mins
const PROFILE_CACHE_TIME_TO_EXPIRE = 3 * 24 * 60 * 60; // 3 days

const getProfilesFromCache = (pubkeys: string[]): [UserProfile[], string[]] => {
  const json = localStorage.getItem(PROFILE_CACHE_KEY);
  if (json === null) {
    return [[], pubkeys];
  }
  try {
    const cache = JSON.parse(json) as UserProfileCache[];
    const cacheMap = new Map(cache.map((c) => [c.profile.pubkey, c]));

    const cachedProfiles: UserProfile[] = [];
    const cacheMissPubkeys: string[] = [];

    const now = currUnixtime();

    for (const pubkey of pubkeys) {
      const c = cacheMap.get(pubkey);
      if (c === undefined) {
        cacheMissPubkeys.push(pubkey);
      } else {
        const age = now - c.lastFetchedAt;
        if (age > PROFILE_CACHE_TIME_TO_EXPIRE) {
          // cache has been completely expired
          cacheMissPubkeys.push(pubkey);
        } else if (age > PROFILE_CACHE_TIME_TO_STALE) {
          // cache is stale
          // -> use "stale-while-revalidate" strategy: use stale cache while fetching new data
          cachedProfiles.push(c.profile);
          cacheMissPubkeys.push(pubkey);
        } else {
          // cache is fresh
          cachedProfiles.push(c.profile);
        }
      }
    }
    return [cachedProfiles, cacheMissPubkeys];
  } catch (err) {
    console.error(err);
    return [[], pubkeys];
  }
};
const saveProfilesCache = (newProfiles: UserProfile[]) => {
  const json = localStorage.getItem(PROFILE_CACHE_KEY);
  const cache = json !== null ? (JSON.parse(json) as UserProfileCache[]) : [];
  const cacheMap = new Map(cache.map((c: UserProfileCache) => [c.profile.pubkey, c]));

  const now = currUnixtime();
  for (const profile of newProfiles) {
    cacheMap.set(profile.pubkey, { profile, lastFetchedAt: now });
  }
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify([...cacheMap.values()]));
};

jotaiStore.sub(bootstrapFinishedAtom, async () => {
  cancelFetchProfiles();

  const myData = await jotaiStore.get(myAccountDataAtom);
  if (myData === undefined) {
    console.log("fetch profiles: clear");
    profilesMap.clear();
    jotaiStore.set(followingsProfilesAtom, new Map<string, UserProfile>());
    return;
  }

  const { followings, relayList } = myData;

  // restore from cache
  const [cached, cacheMissPubkeys] = getProfilesFromCache(followings);
  for (const profile of cached) {
    profilesMap.set(profile.pubkey, profile);
  }
  jotaiStore.set(followingsProfilesAtom, new Map(profilesMap));

  // fetch cache-missed profiles
  const readRelays = selectRelaysByUsage(relayList, "read");

  fetchProfilesAbortCtrl = new AbortController();
  const iter = fetcherOnRxNostr.fetchLastEventPerAuthor(
    { authors: cacheMissPubkeys, relayUrls: readRelays },
    { kinds: [0] },
    { abortSignal: fetchProfilesAbortCtrl.signal, connectTimeoutMs: 3000 }
  );

  const newProfiles: UserProfile[] = [];
  for await (const { event } of iter) {
    if (event !== undefined) {
      const profile = UserProfile.fromEvent(event);
      profilesMap.set(profile.pubkey, profile);
      jotaiStore.set(followingsProfilesAtom, new Map(profilesMap));

      newProfiles.push(profile);
    }
  }
  saveProfilesCache(newProfiles);
});

/* fetch user status of followings */
const statusesMap = new Map<string, UserStatus>();

// status invalidation logic
const invalidateStatus = (pubkey: string, category: UserStatusCategory) => {
  const prevStatus = statusesMap.get(pubkey);
  if (prevStatus === undefined || prevStatus[category] === undefined) {
    return;
  }

  const updated = { ...prevStatus, [category]: undefined };
  if (UserStatus.isEmpty(updated)) {
    statusesMap.delete(pubkey);
  } else {
    statusesMap.set(pubkey, updated);
  }

  jotaiStore.set(followingsStatusesAtom, new Map(statusesMap));
};

// manages timers for automatic status invalidation
class StatusInvalidationScheduler {
  #invalidations = new Map<string, NodeJS.Timeout>();

  static #invalidationKey(pubkey: string, category: UserStatusCategory) {
    return `${pubkey}:${category}`;
  }

  #clearTimer(key: string) {
    const prev = this.#invalidations.get(key);
    if (prev !== undefined) {
      clearTimeout(prev);
      this.#invalidations.delete(key);
    }
  }

  // schedule status invalidation for given pubkey and category
  // cancel previous timer and schedule new one
  schedule(pubkey: string, category: UserStatusCategory, ttl: number) {
    const key = StatusInvalidationScheduler.#invalidationKey(pubkey, category);

    this.#clearTimer(key);

    const timeout = setTimeout(() => {
      invalidateStatus(pubkey, category);
      this.#invalidations.delete(key);
    }, ttl * 1000);
    this.#invalidations.set(key, timeout);
  }

  // cancel status invalidation
  cancel(pubkey: string, category: UserStatusCategory) {
    const key = StatusInvalidationScheduler.#invalidationKey(pubkey, category);
    this.#clearTimer(key);
  }

  // cancel all status invalidations
  cancelAll() {
    for (const timeout of this.#invalidations.values()) {
      clearTimeout(timeout);
    }
    this.#invalidations.clear();
  }
}
const invalidationScheduler = new StatusInvalidationScheduler();

const applyStatusUpdate = (ev: NostrEvent) => {
  const pubkey = ev.pubkey;

  const newStatus = StatusData.fromEvent(ev);
  if (newStatus.expiration !== undefined && currUnixtime() >= newStatus.expiration) {
    // ignore already expired statuses
    return;
  }
  const category = getFirstTagValueByName(ev, "d");
  if (!isSupportedUserStatusCategory(category)) {
    // ignore statuses other than "general" and "music"
    return;
  }
  const prevStatus = statusesMap.get(pubkey);
  const prevSameCatStatus = prevStatus?.[category];
  if (prevSameCatStatus !== undefined && newStatus.createdAt <= prevSameCatStatus.createdAt) {
    // ignore older statuses
    return;
  }

  if (newStatus.content !== "") {
    const updated = { ...(prevStatus ?? { pubkey }), [category]: newStatus };

    statusesMap.set(pubkey, updated);
    if (newStatus.expiration === undefined) {
      invalidationScheduler.cancel(pubkey, category);
    } else {
      const ttl = newStatus.expiration - currUnixtime();
      invalidationScheduler.schedule(pubkey, category, ttl);
    }
    jotaiStore.set(followingsStatusesAtom, new Map(statusesMap));
  } else {
    // status update with emtpy content -> invalidate
    invalidationScheduler.cancel(pubkey, category);
    invalidateStatus(pubkey, category);
  }
};

// statuses cache
type StatusesCache = {
  statuses: UserStatus[];
  latestUpdateTime: number;
  myPubkey: string;
};
const STATUSES_CACHE_KEY = "nostr_statuses";

const getStatusesCache = (myPubkey: string, followings: string[]): [StatusesCache | undefined, string[]] => {
  const json = localStorage.getItem(STATUSES_CACHE_KEY);
  if (json === null) {
    return [undefined, followings];
  }
  try {
    const cache = JSON.parse(json) as StatusesCache;

    if (myPubkey !== cache.myPubkey) {
      // ignore cache when logged in as different account from previous session
      localStorage.removeItem(STATUSES_CACHE_KEY);
      return [undefined, followings];
    }

    const cacheMap = new Map(cache.statuses.map((s) => [s.pubkey, s]));

    const cachedStatuses: UserStatus[] = [];
    const cacheMissPubkeys: string[] = [];

    for (const pubkey of followings) {
      const s = cacheMap.get(pubkey);
      if (s !== undefined) {
        // invalidate expired statuses
        for (const cat of userStatusCategories) {
          const statusData = s[cat];
          if (statusData?.expiration !== undefined && currUnixtime() >= statusData.expiration) {
            s[cat] = undefined;
          }
        }
        if (UserStatus.isEmpty(s)) {
          continue;
        }
        cachedStatuses.push(s);
      } else {
        cacheMissPubkeys.push(pubkey);
      }
    }
    return [
      { statuses: cachedStatuses, latestUpdateTime: cache.latestUpdateTime, myPubkey: cache.myPubkey },
      cacheMissPubkeys,
    ];
  } catch (err) {
    console.error(err);
    return [undefined, followings];
  }
};

const saveStatusesCache = (myPubkey: string, statuses: UserStatus[]) => {
  if (statuses.length === 0) {
    localStorage.removeItem(STATUSES_CACHE_KEY);
    return;
  }
  const latestUpdateTime = statuses.reduce((latest, s) => Math.max(UserStatus.lastUpdateTime(s), latest), 0);
  const cache: StatusesCache = { statuses, latestUpdateTime, myPubkey };
  localStorage.setItem(STATUSES_CACHE_KEY, JSON.stringify(cache));
};

let fetchPastStatusesAbortCtrl: AbortController | undefined;
let statusEventsSubscription: Subscription | undefined;

const cancelFetchStatuses = () => {
  if (fetchPastStatusesAbortCtrl !== undefined) {
    fetchPastStatusesAbortCtrl.abort();
  }
  if (statusEventsSubscription !== undefined) {
    statusEventsSubscription.unsubscribe();
    statusEventsSubscription = undefined;
  }
};

/**
 * fetch past user status events for given pubkeys.
 * if `since` is specified, fetch only events after the timestamp.
 *
 * returns whether fetch was aborted or not.
 */
const fetchPastStatuses = async (
  pubkeys: string[],
  readRelays: string[],
  since: number | undefined,
  myPubkey: string
): Promise<boolean> => {
  fetchPastStatusesAbortCtrl = new AbortController();
  const pastStatusEvIter = fetcherOnRxNostr.allEventsIterator(
    readRelays,
    { kinds: [30315], authors: pubkeys, "#d": ["general", "music"] },
    { since },
    { abortSignal: fetchPastStatusesAbortCtrl.signal, connectTimeoutMs: 3000 }
  );

  // save statuses cache periodically
  let isMapDirty = false;
  const saveCacheInterval = setInterval(() => {
    if (isMapDirty) {
      saveStatusesCache(myPubkey, [...statusesMap.values()]);
      isMapDirty = false;
    }
  }, 1000);

  try {
    for await (const ev of pastStatusEvIter) {
      applyStatusUpdate(ev);
      isMapDirty = true;
    }
  } catch (err) {
    console.error(err);
  }

  // post process
  clearInterval(saveCacheInterval);

  const { aborted } = fetchPastStatusesAbortCtrl.signal;
  fetchPastStatusesAbortCtrl = undefined;
  return aborted;
};

jotaiStore.sub(bootstrapFinishedAtom, async () => {
  cancelFetchStatuses();

  const myData = await jotaiStore.get(myAccountDataAtom);
  if (myData === undefined) {
    console.log("fetch statuses: clear");
    statusesMap.clear();
    invalidationScheduler.cancelAll();
    jotaiStore.set(followingsStatusesAtom, new Map<string, UserStatus>());
    return;
  }

  const { followings, relayList, profile } = myData;
  const myPubkey = profile.pubkey;
  const readRelays = selectRelaysByUsage(relayList, "read");

  // subscribe realtime updates
  const req = createRxForwardReq();
  statusEventsSubscription = rxNostr
    .use(req)
    .pipe(verify(), uniq())
    .subscribe((p) => {
      applyStatusUpdate(p.event);
      saveStatusesCache(myPubkey, [...statusesMap.values()]);
    });
  req.emit({
    kinds: [30315],
    authors: followings,
    "#d": ["general", "music"],
    since: currUnixtime,
  });

  const [cache, cacheMissPubkeys] = getStatusesCache(myPubkey, followings);
  if (cache !== undefined) {
    // restore from cache
    const { statuses, latestUpdateTime } = cache;

    for (const status of statuses) {
      statusesMap.set(status.pubkey, status);
    }
    jotaiStore.set(followingsStatusesAtom, new Map(statusesMap));

    // fetch status updates for status-cached pubkeys
    const statusCachedPubkeys = statuses.map((s) => s.pubkey);
    const aborted = await fetchPastStatuses(statusCachedPubkeys, readRelays, latestUpdateTime, myPubkey);
    if (aborted) {
      return;
    }
  }

  // fetch all the past status events for cache-missed pubkeys
  const aborted = await fetchPastStatuses(cacheMissPubkeys, readRelays, undefined, myPubkey);
  if (aborted) {
    return;
  }
});

type UpdateStatusInput = {
  category: UserStatusCategory;
  content: string;
  linkUrl: string;
  ttl: number | undefined;
};

// update my general status
// update local statuses map, then send a user status event (kind:30315) to write relays
export const updateMyStatus = async ({ category, content, linkUrl, ttl }: UpdateStatusInput) => {
  const created_at = currUnixtime();
  const exp = ttl !== undefined ? created_at + ttl : undefined;

  const ev = {
    kind: 30315,
    content,
    created_at,
    tags: [
      ["d", category],
      ...(linkUrl !== "" ? [["r", linkUrl]] : []),
      ...(exp !== undefined ? [["expiration", String(exp)]] : []),
    ],
  };

  // precondition: logged in via privkey or NIP-07 extension is available
  // in latter case, privkey will be undefined and getSignedEvent() will use NIP-07 extension to sign
  const privkey = jotaiStore.get(inputPrivkeyAtom);
  const signedEv = await getSignedEvent(ev, privkey);

  applyStatusUpdate(signedEv);
  rxNostr.send(signedEv);
};
