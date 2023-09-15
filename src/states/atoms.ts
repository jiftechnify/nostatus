import { rxNostrAdapter } from "@nostr-fetch/adapter-rx-nostr";
import { atom, getDefaultStore } from "jotai";
import { atomFamily, atomWithStorage, loadable, selectAtom } from "jotai/utils";
import { NostrEvent, NostrFetcher } from "nostr-fetch";
import { createRxForwardReq, createRxNostr, uniq, verify } from "rx-nostr";
import { Subscription } from "rxjs";
import { currUnixtime } from "../utils";
import { AccountMetadata, StatusData, UserProfile, UserStatus } from "./models";
import { getFirstTagValue, getTagValues, parseReadRelayList } from "./nostr";

export const myPubkeyAtom = atomWithStorage<string | undefined>("nostr_pubkey", undefined);

export const myAccountDataAtom = atom<Promise<AccountMetadata | undefined>>(async (get) => {
  const pubkey = get(myPubkeyAtom);
  if (pubkey === undefined) {
    return undefined;
  }
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

const MAX_NIP07_CHECKS = 5;
export const isNip07AvailableAtom = atom(async () => {
  let numChecks = 0;

  return new Promise<boolean>((resolve) => {
    const nip07CheckInterval = setInterval(() => {
      if (window.nostr) {
        clearInterval(nip07CheckInterval);
        resolve(true);
      } else if (numChecks > MAX_NIP07_CHECKS) {
        clearInterval(nip07CheckInterval);
        resolve(false);
      } else {
        numChecks++;
      }
    }, 300);
  });
});

const jotaiStore = getDefaultStore();

const rxNostr = createRxNostr();
const nostrFetcher = NostrFetcher.withCustomPool(rxNostrAdapter(rxNostr));

const bootstrapRelays = ["wss://relay.nostr.band", "wss://relayable.org", "wss://yabu.me"];

/* fetch account data */
export const fetchAccountData = async (pubkey: string): Promise<AccountMetadata> => {
  const [k0, k3, k10002] = await Promise.all(
    [0, 3, 10002].map((kind) =>
      nostrFetcher.fetchLastEvent(
        bootstrapRelays,
        {
          authors: [pubkey],
          kinds: [kind],
        },
        { connectTimeoutMs: 5000 }
      )
    )
  );
  console.log(k0, k3, k10002);

  const profile = k0 !== undefined ? UserProfile.fromEvent(k0) : { srcEventId: "undefined", pubkey };
  const followings = k3 !== undefined ? getTagValues(k3, "p") : [];

  const relayListEvs = [k3, k10002].filter((ev) => ev !== undefined) as NostrEvent[];
  const readRelays = parseReadRelayList(relayListEvs);

  return { profile, followings, readRelays };
};

const relaysFullyConfiguredAtom = atom(false);

/* processes after fetched my account data */
jotaiStore.sub(myAcctDataAvailableAtom, async () => {
  const available = jotaiStore.get(myAcctDataAvailableAtom);

  if (available) {
    const data = await jotaiStore.get(myAccountDataAtom);
    if (data === undefined) {
      console.error("unreachable");
      return;
    }

    await rxNostr.switchRelays(
      [...bootstrapRelays, ...data.readRelays].map((r) => {
        return { url: r, read: true, write: false };
      })
    );

    jotaiStore.set(relaysFullyConfiguredAtom, true);
  } else {
    await rxNostr.switchRelays(
      [...bootstrapRelays].map((r) => {
        return { url: r, read: true, write: false };
      })
    );
    jotaiStore.set(relaysFullyConfiguredAtom, false);
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

jotaiStore.sub(relaysFullyConfiguredAtom, async () => {
  cancelFetchProfiles();

  const myData = await jotaiStore.get(myAccountDataAtom);
  if (myData === undefined) {
    console.log("fetchProfiles: reset");
    profilesMap.clear();
    jotaiStore.set(followingsProfilesAtom, new Map<string, UserProfile>());
    return;
  }

  const { followings, readRelays } = myData;
  console.log(readRelays);

  fetchProfilesAbortCtrl = new AbortController();
  const iter = nostrFetcher.fetchLastEventPerAuthor(
    { authors: followings, relayUrls: readRelays },
    { kinds: [0] },
    { abortSignal: fetchProfilesAbortCtrl.signal, connectTimeoutMs: 3000 }
  );
  for await (const { event } of iter) {
    if (event !== undefined) {
      const profile = UserProfile.fromEvent(event);
      profilesMap.set(profile.pubkey, profile);
      jotaiStore.set(followingsProfilesAtom, new Map(profilesMap));
    }
  }
});

/* fetch user status of followings */
const statusesMap = new Map<string, UserStatus>();

type UserStatusCategory = "general" | "music";
const isSupportedCategory = (s: string): s is UserStatusCategory => {
  return ["general", "music"].includes(s);
};

const applyStatusUpdate = (ev: NostrEvent) => {
  const pubkey = ev.pubkey;

  const newStatus = StatusData.fromEvent(ev);
  if (newStatus.expiration !== undefined && currUnixtime() >= newStatus.expiration) {
    // ignore already expired statuses
    return;
  }

  const category = getFirstTagValue(ev, "d");
  if (!isSupportedCategory(category)) {
    // ignore statuses other than "general" and "music"
    return;
  }

  const prevStatus = statusesMap.get(pubkey);
  const prevSameCatStatus = prevStatus?.[category];

  if (newStatus.content !== "") {
    if (prevStatus === undefined) {
      statusesMap.set(ev.pubkey, {
        pubkey,
        [category]: newStatus,
      });
    } else if (prevSameCatStatus === undefined || newStatus.createdAt > prevSameCatStatus.createdAt) {
      statusesMap.set(ev.pubkey, {
        ...prevStatus,
        [category]: newStatus,
      });
    } else {
      return;
    }
  } else {
    // status update with emtpy content -> invalidate
    if (
      prevStatus !== undefined &&
      prevSameCatStatus !== undefined &&
      newStatus.createdAt > prevSameCatStatus.createdAt
    ) {
      statusesMap.set(ev.pubkey, {
        ...prevStatus,
        [category]: undefined,
      });
    } else {
      return;
    }
  }

  // set updated statuses to the jotai atom
  jotaiStore.set(followingsStatusesAtom, new Map(statusesMap));
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

jotaiStore.sub(relaysFullyConfiguredAtom, async () => {
  console.log("fetch statues: myAccountDataAtom updated");

  cancelFetchStatuses();

  const myData = await jotaiStore.get(myAccountDataAtom);
  if (myData === undefined) {
    statusesMap.clear();
    jotaiStore.set(followingsStatusesAtom, new Map<string, UserStatus>());
    return;
  }

  const { followings, readRelays } = myData;
  console.log(readRelays);

  // fetch past events
  fetchPastStatusesAbortCtrl = new AbortController();
  const pastStatusEvIter = nostrFetcher.allEventsIterator(
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
