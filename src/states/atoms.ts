import { getFirstTagValueByName, getTagValuesByName, parseReadRelayList } from "../nostr";
import { currUnixtime } from "../utils";
import { AccountMetadata, StatusData, UserProfile, UserStatus } from "./models";

import { rxNostrAdapter } from "@nostr-fetch/adapter-rx-nostr";
import { atom, getDefaultStore, useAtom } from "jotai";
import { atomFamily, atomWithStorage, loadable, selectAtom } from "jotai/utils";
import { NostrEvent, NostrFetcher } from "nostr-fetch";
import { useEffect, useRef } from "react";
import { createRxForwardReq, createRxNostr, uniq, verify } from "rx-nostr";
import { Subscription } from "rxjs";

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

const isNip07AvailableAtom = atom(false);
const MAX_NIP07_CHECKS = 5;

export const useNip07Availablility = () => {
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
  }, [setAvailable]);

  return available;
};

const jotaiStore = getDefaultStore();

const bootstrapRelays = ["wss://relay.nostr.band", "wss://relayable.org", "wss://yabu.me"];
const bootstrapFetcher = NostrFetcher.init();

const rxNostr = createRxNostr();
const fetcherOnRxNostr = NostrFetcher.withCustomPool(rxNostrAdapter(rxNostr));

/* fetch account data */
export const fetchAccountData = async (pubkey: string): Promise<AccountMetadata> => {
  const [k0, k3, k10002] = await Promise.all(
    [0, 3, 10002].map((kind) =>
      bootstrapFetcher.fetchLastEvent(
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
  const followings = k3 !== undefined ? getTagValuesByName(k3, "p") : [];

  const relayListEvs = [k3, k10002].filter((ev) => ev !== undefined) as NostrEvent[];
  const readRelays = parseReadRelayList(relayListEvs);

  return { profile, followings, readRelays };
};

const relaysSwitchedAtom = atom(false);

/* processes after fetched my account data */
jotaiStore.sub(myAcctDataAvailableAtom, async () => {
  const myDataAvailable = jotaiStore.get(myAcctDataAvailableAtom);

  if (myDataAvailable) {
    const data = await jotaiStore.get(myAccountDataAtom);
    if (data === undefined) {
      console.error("unreachable");
      return;
    }

    console.log("switching relays", data.readRelays);
    await rxNostr.switchRelays(
      data.readRelays.map((r) => {
        return { url: r, read: true, write: false };
      })
    );

    jotaiStore.set(relaysSwitchedAtom, true);
  } else {
    console.log("disconnect from all relays");
    await rxNostr.switchRelays([]);
    jotaiStore.set(relaysSwitchedAtom, false);
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

jotaiStore.sub(relaysSwitchedAtom, async () => {
  cancelFetchProfiles();

  const myData = await jotaiStore.get(myAccountDataAtom);
  if (myData === undefined) {
    console.log("fetch profiles: clear");
    profilesMap.clear();
    jotaiStore.set(followingsProfilesAtom, new Map<string, UserProfile>());
    return;
  }

  const { followings, readRelays } = myData;

  fetchProfilesAbortCtrl = new AbortController();
  const iter = fetcherOnRxNostr.fetchLastEventPerAuthor(
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

  const category = getFirstTagValueByName(ev, "d");
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

jotaiStore.sub(relaysSwitchedAtom, async () => {
  cancelFetchStatuses();

  const myData = await jotaiStore.get(myAccountDataAtom);
  if (myData === undefined) {
    console.log("fetch statuses: clear");
    statusesMap.clear();
    jotaiStore.set(followingsStatusesAtom, new Map<string, UserStatus>());
    return;
  }

  const { followings, readRelays } = myData;

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
