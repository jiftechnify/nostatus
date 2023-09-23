import {
  RelayList,
  getFirstTagValueByName,
  getTagValuesByName,
  parseRelayListInEvent,
  selectRelaysByUsage,
} from "../nostr";
import { currUnixtime } from "../utils";
import {
  AccountMetadata,
  StatusData,
  UserProfile,
  UserStatus,
  UserStatusCategory,
  isSupportedUserStatusCategory,
} from "./nostrModels";

import { atom, getDefaultStore, useAtom, useAtomValue, useSetAtom } from "jotai";
import { RESET, atomFamily, atomWithStorage, loadable, selectAtom } from "jotai/utils";
import { useCallback, useEffect, useRef, useState } from "react";

import { rxNostrAdapter } from "@nostr-fetch/adapter-rx-nostr";
import { NostrEvent, NostrFetcher } from "nostr-fetch";
import { createRxForwardReq, createRxNostr, getSignedEvent, uniq, verify } from "rx-nostr";
import { Subscription } from "rxjs";

const jotaiStore = getDefaultStore();

const myPubkeyAtom = atomWithStorage<string | undefined>("nostr_pubkey", undefined);

export const useMyPubkey = () => {
  const myPubkey = useAtomValue(myPubkeyAtom);
  return myPubkey;
};

export const useLogin = () => {
  const setPubkey = useSetAtom(myPubkeyAtom);
  return setPubkey;
};

export const useLogout = () => {
  const setPubkey = useSetAtom(myPubkeyAtom);
  const logout = useCallback(() => {
    setPubkey(RESET);
  }, [setPubkey]);

  return logout;
};

const ACCT_DATA_CACHE_TTL = 12 * 60 * 60; // 12 hour

const saveMyAccountDataCache = (metadata: AccountMetadata) => {
  localStorage.setItem("nostr_my_data", JSON.stringify(metadata));
};
const getMyAccountDataCache = (): AccountMetadata | undefined => {
  const json = localStorage.getItem("nostr_my_data");
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
  const pubkey = get(myPubkeyAtom);
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
  const myPubkey = get(myPubkeyAtom);
  if (myPubkey === undefined) {
    return undefined;
  }
  return get(userStatusAtomFamily(myPubkey))?.general;
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

const isNip07AvailableAtom = atom(false);

const MAX_NIP07_CHECKS = 5;
export const useNip07Availability = () => {
  const [available, setAvailable] = useAtom(isNip07AvailableAtom);
  const checkCnt = useRef(0);

  useEffect(() => {
    const nip07CheckInterval = setInterval(() => {
      if (window.nostr) {
        clearInterval(nip07CheckInterval);
        setAvailable(true);
      } else if (checkCnt.current > MAX_NIP07_CHECKS) {
        clearInterval(nip07CheckInterval);
        setAvailable(false);
      } else {
        checkCnt.current++;
      }
    }, 300);
    return () => clearInterval(nip07CheckInterval);
  }, [setAvailable]);

  return available;
};

export const usePubkeyInNip07 = () => {
  const nip07Available = useNip07Availability();
  const [pubkey, setPubkey] = useState<string | undefined>(undefined);

  useEffect(() => {
    const pollPubkey = async () => {
      try {
        if (window.nostr) {
          const pubkey = await window.nostr.getPublicKey();
          setPubkey(pubkey);
        } else {
          setPubkey(undefined);
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (nip07Available) {
      pollPubkey().catch((e) => console.error(e));
    } else {
      setPubkey(undefined);
    }
  }, [nip07Available]);

  return pubkey;
};

const bootstrapFetcher = NostrFetcher.init();

const rxNostr = createRxNostr();
const fetcherOnRxNostr = NostrFetcher.withCustomPool(rxNostrAdapter(rxNostr));

const defaultBootstrapRelays = ["wss://relay.nostr.band", "wss://relayable.org", "wss://yabu.me"];

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
  const nip07Relays = await window.nostr.getRelays();
  const nip07ReadRelays = nip07Relays !== undefined ? selectRelaysByUsage(nip07Relays, "read") : [];
  return nip07ReadRelays.length > 0 ? [nip07ReadRelays, false] : [defaultBootstrapRelays, true];
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
const PROFILE_CACHE_TTL = 12 * 60 * 60; // 12 hour

const getProfilesFromCache = (pubkeys: string[]): [UserProfile[], string[]] => {
  const json = localStorage.getItem("nostr_profiles");
  if (json === null) {
    return [[], pubkeys];
  }
  try {
    const cache = JSON.parse(json) as UserProfileCache[];
    const cacheMap = new Map(cache.map((c) => [c.profile.pubkey, c]));

    const cachedProfiles: UserProfile[] = [];
    const cacheMissPubkeys: string[] = [];

    for (const pubkey of pubkeys) {
      const c = cacheMap.get(pubkey);
      if (c !== undefined && currUnixtime() - c.lastFetchedAt <= PROFILE_CACHE_TTL) {
        cachedProfiles.push(c.profile);
      } else {
        cacheMissPubkeys.push(pubkey);
      }
    }
    return [cachedProfiles, cacheMissPubkeys];
  } catch (err) {
    console.error(err);
    return [[], pubkeys];
  }
};
const saveProfilesCache = (newProfiles: UserProfile[]) => {
  const json = localStorage.getItem("nostr_profiles");
  const cache = json !== null ? (JSON.parse(json) as UserProfileCache[]) : [];
  const cacheMap = new Map(cache.map((c: UserProfileCache) => [c.profile.pubkey, c]));

  for (const profile of newProfiles) {
    cacheMap.set(profile.pubkey, { profile, lastFetchedAt: currUnixtime() });
  }
  localStorage.setItem("nostr_profiles", JSON.stringify([...cacheMap.values()]));
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

let fetchPastStatusesAbortCtrl: AbortController | undefined;
let statusUpdateSub: Subscription | undefined;
const cancelFetchStatuses = () => {
  if (fetchPastStatusesAbortCtrl !== undefined) {
    fetchPastStatusesAbortCtrl.abort();
    fetchPastStatusesAbortCtrl = undefined;
  }
  if (statusUpdateSub !== undefined) {
    statusUpdateSub.unsubscribe();
    statusUpdateSub = undefined;
  }
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

  const { followings, relayList } = myData;
  const readRelays = selectRelaysByUsage(relayList, "read");

  // fetch past events
  fetchPastStatusesAbortCtrl = new AbortController();
  const pastStatusEvIter = fetcherOnRxNostr.allEventsIterator(
    readRelays,
    { kinds: [30315], authors: followings, "#d": ["general", "music"] },
    {},
    { abortSignal: fetchPastStatusesAbortCtrl.signal, connectTimeoutMs: 3000 }
  );
  for await (const ev of pastStatusEvIter) {
    applyStatusUpdate(ev);
  }

  // subscribe realtime updates
  const req = createRxForwardReq();
  statusUpdateSub = rxNostr
    .use(req)
    .pipe(verify(), uniq())
    .subscribe((p) => applyStatusUpdate(p.event));
  req.emit({
    kinds: [30315],
    authors: followings,
    "#d": ["general", "music"],
    since: currUnixtime,
  });
});

type UpdateStatusInput = {
  content: string;
  linkUrl: string;
  ttl: number | undefined;
};

// update my general status
// update local statuses map, then send a user status event (kind:30315) to write relays
export const updateMyStatus = async ({ content, linkUrl, ttl }: UpdateStatusInput) => {
  const created_at = currUnixtime();
  const exp = ttl !== undefined ? created_at + ttl : undefined;

  const ev = {
    kind: 30315,
    content,
    created_at,
    tags: [
      ["d", "general"],
      ...(linkUrl !== "" ? [["r", linkUrl]] : []),
      ...(exp !== undefined ? [["expiration", String(exp)]] : []),
    ],
  };
  const signedEv = await getSignedEvent(ev);

  applyStatusUpdate(signedEv);
  rxNostr.send(signedEv);
};
