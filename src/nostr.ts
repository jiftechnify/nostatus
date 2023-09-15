import { rxNostrAdapter } from "@nostr-fetch/adapter-rx-nostr";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { NostrEvent, NostrFetcher } from "nostr-fetch";
import { nip19 } from "nostr-tools";
import { useCallback, useEffect, useRef, useState } from "react";
import { RxNostr, createRxForwardReq, createRxNostr, uniq, verify } from "rx-nostr";
import { currUnixtime } from "./utils";

const bootstrapRelays = ["wss://relay.nostr.band", "wss://relayable.org", "wss://yabu.me"];

export class NostrSystem {
  #rxNostr: RxNostr;
  #fetcher: NostrFetcher;

  constructor() {
    this.#rxNostr = createRxNostr();
    this.#fetcher = NostrFetcher.withCustomPool(rxNostrAdapter(this.#rxNostr));
  }

  public async addReadRelays(relays: string[]) {
    for (const r of relays) {
      await this.#rxNostr.addRelay({ url: r, read: true, write: false });
    }
  }

  private getCurrReadRelays() {
    return this.#rxNostr
      .getRelays()
      .filter((r) => r.read)
      .map((r) => r.url);
  }

  public async fetchMyData(pubkey: string): Promise<MyData | undefined> {
    const [k0, k3, k10002] = await Promise.all(
      [0, 3, 10002].map((kind) =>
        this.#fetcher.fetchLastEvent(
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

    if (k3 === undefined) {
      return undefined;
    }

    const profile = k0 !== undefined ? userProfileFromEvent(k0) : { pubkey };
    const followings = k3.tags.filter((t) => t[0] === "p" && t[1] !== undefined).map((t) => t[1]);
    const relayListEvs = [k3];
    if (k10002 !== undefined) {
      relayListEvs.push(k10002);
    }
    const readRelays = parseReadRelayList(relayListEvs);

    return { profile, followings, readRelays };
  }

  public fetchUserProfiles(pubkeys: string[], onProfileEv: (ev: NostrEvent) => void) {
    const ac = new AbortController();

    try {
      const iter = this.#fetcher.fetchLastEventPerAuthor(
        {
          authors: pubkeys,
          relayUrls: this.getCurrReadRelays(),
        },
        { kinds: [0] },
        { abortSignal: ac.signal, connectTimeoutMs: 3000 }
      );

      (async () => {
        for await (const { event } of iter) {
          if (event !== undefined) {
            onProfileEv(event);
          }
        }
      })().catch((err) => {
        throw err;
      });
    } catch (err) {
      console.error(err);
    }

    return () => ac.abort();
  }

  public fetchAllPastUserStatus(pubkeys: string[], onStatusEv: (ev: NostrEvent) => void): () => void {
    const ac = new AbortController();

    try {
      const iter = this.#fetcher.allEventsIterator(
        this.getCurrReadRelays(),
        { kinds: [30315], authors: pubkeys, "#d": ["general", "music"] },
        {},
        { abortSignal: ac.signal, connectTimeoutMs: 3000 }
      );

      (async () => {
        for await (const ev of iter) {
          onStatusEv(ev);
        }
      })().catch((err) => {
        throw err;
      });
    } catch (err) {
      console.error(err);
    }

    return () => ac.abort;
  }

  public subscribeUserStatus(pubkeys: string[], onStatusEv: (ev: NostrEvent) => void) {
    const req = createRxForwardReq();
    const subscription = this.#rxNostr
      .use(req)
      .pipe(verify(), uniq())
      .subscribe((packet) => onStatusEv(packet.event));
    req.emit({
      kinds: [30315],
      authors: pubkeys,
      "#d": ["general", "music"],
      since: Math.floor(Date.now() / 1000),
    });

    return subscription;
  }
}

const nostrSystem = new NostrSystem();

export type MyData = {
  profile: UserProfile;
  followings: string[];
  readRelays: string[];
};

type StatusData = {
  content: string;
  linkUrl: string;
  createdAt: number;
  expiration: number | undefined;
};

export const statusDataFromEvent = (ev: NostrEvent): StatusData => {
  const content = ev.content.trim();
  const createdAt = ev.created_at;
  const linkUrl = getTagValue(ev, "r");
  const expiration = (() => {
    const expStr = getTagValue(ev, "expiration");
    if (expStr === "") {
      return undefined;
    }
    const exp = Number(expStr);
    return !isNaN(exp) ? exp : undefined;
  })();

  return { content, linkUrl, createdAt, expiration };
};

export type UserProfile = {
  pubkey: string;
  displayName?: string;
  name?: string;
  nip05?: string;
  picture?: string;
};

export const userProfileFromEvent = (ev: NostrEvent): UserProfile => {
  try {
    const profile = JSON.parse(ev.content) as Record<string, string>; // TODO validate schema

    const res: UserProfile = { pubkey: ev.pubkey };
    res.displayName = profile["display_name"] ?? profile["displayName"];
    res.name = profile["name"];
    res.nip05 = profile["nip05"];
    res.picture = profile["picture"];

    return res;
  } catch (err) {
    console.error("failed to parse content of kind 0:", err);
    return { pubkey: ev.pubkey };
  }
};

export type UserStatus = {
  pubkey: string;
  general?: StatusData | undefined;
  music?: StatusData | undefined;
};

const statusLastUpdatedTime = (us: UserStatus): number => {
  const tss = [us.general?.createdAt ?? 0, us.music?.createdAt ?? 0];
  return Math.max(...tss);
};

type UserStatusCategory = "general" | "music";
const isSupportedCategory = (s: string): s is UserStatusCategory => {
  return ["general", "music"].includes(s);
};

type RelayList = Record<string, { read: boolean; write: boolean }>;

const parseReadRelayList = (evs: NostrEvent[]): string[] => {
  const relayListEvs = evs.filter((ev) => [3, 10002].includes(ev.kind));
  if (relayListEvs.length === 0) {
    return [];
  }
  const latest = relayListEvs.sort((a, b) => b.created_at - a.created_at)[0] as NostrEvent;

  switch (latest.kind) {
    case 3:
      return selectRelaysByUsage(parseRelayListInKind3(latest), "read");
    case 10002:
      return selectRelaysByUsage(parseRelayListInKind10002(latest), "read");
    default:
      console.error("parseRelayList: unreachable");
      return [];
  }
};

const selectRelaysByUsage = (relayList: RelayList, usage: "read" | "write"): string[] =>
  Object.entries(relayList)
    .filter(([, { read, write }]) => (usage === "read" && read) || (usage === "write" && write))
    .map(([rurl]) => rurl);

const parseRelayListInKind3 = (ev: NostrEvent): RelayList => {
  try {
    return JSON.parse(ev.content) as RelayList; // TODO: schema validation
  } catch (err) {
    console.error("failed to parse kind 3 event:", err);
    return {};
  }
};

const parseRelayListInKind10002 = (ev: NostrEvent): RelayList => {
  const res: RelayList = {};

  ev.tags
    .filter((t) => t.length >= 2 && t[0] === "r")
    .forEach((t) => {
      const [, url, relayType] = t as [string, string, string | undefined];

      if (relayType === undefined) {
        res[url] = { read: true, write: true };
      } else {
        switch (relayType) {
          case "read":
            res[url] = { read: true, write: false };
            return;
          case "write":
            res[url] = { read: false, write: true };
            return;
          default:
            console.warn("invalid relay type in kind 10002 event:", relayType);
            undefined;
        }
      }
    });

  return res;
};

const getTagValue = (ev: NostrEvent, name: string): string => ev.tags.find((t) => t[0] === name)?.[1] ?? "";

const regexp32BytesHexStr = /^[a-f0-9]{64}$/;

export const parsePubkey = (pubkey: string): string | undefined => {
  if (pubkey.startsWith("npub1")) {
    try {
      const res = nip19.decode(pubkey);
      if (res.type === "npub") {
        return res.data;
      }
      console.log("toHexPrivateKey: unexpected decode result");
      return undefined;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }
  return regexp32BytesHexStr.test(pubkey) ? pubkey : undefined;
};

const MAX_NIP07_CHECKS = 5;
export const isNip07ExtAvailable = async () => {
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
};

/** global states **/

export const cachedPubkeyAtom = atomWithStorage<string | undefined>("nostr_pubkey", undefined);

export const myDataAtom = atom((get) => {
  const pubkey = get(cachedPubkeyAtom);
  if (pubkey === undefined) {
    return Promise.resolve(undefined);
  }
  return nostrSystem.fetchMyData(pubkey);
});

export const followingsProfilesAtom = atom(async (get) => {
  const updateValueAtom = atom(async (get) => {
    const profileMap = new Map<string, UserProfile>();
    let updateValue: (m: Map<string, UserProfile>) => void;
    let cancel: () => void = () => {
      console.warn("cancel() called before fetch started");
    };

    const myData = await get(myDataAtom);
    console.log("followingsProfilesAtom: myData=", myData);
    if (myData === undefined) {
      cancel();
      profileMap.clear();
      return atom(new Map<string, UserProfile>());
    }

    const abortFetch = nostrSystem.fetchUserProfiles(myData.followings, (ev) => {
      const profile = userProfileFromEvent(ev);
      profileMap.set(ev.pubkey, profile);
      updateValue?.(new Map(profileMap));
    });
    cancel = () => {
      console.log("followingsProfilesAtom: canceled");
      abortFetch();
    };

    const latestValueAtom = atom(profileMap);
    latestValueAtom.onMount = (update) => {
      updateValue = update;

      return () => {
        cancel();
      };
    };

    return latestValueAtom;
  });

  const valueAtom = await get(updateValueAtom);
  return get(valueAtom);
});

export const followingsStatusListAtom = atom(async (get) => {
  const updateValueAtom = atom(async (get) => {
    const statusMap = new Map<string, UserStatus>();

    let updateValue: (l: UserStatus[]) => void;
    let cancel: () => void = () => {
      console.warn("cancel() called before fetch started");
    };

    const myData = await get(myDataAtom);
    if (myData === undefined) {
      statusMap.clear();
      cancel();
      return atom<UserStatus[]>([]);
    }

    const updateStatusMap = (ev: NostrEvent) => {
      const pubkey = ev.pubkey;

      const newStatus = statusDataFromEvent(ev);
      if (newStatus.expiration !== undefined && currUnixtime() >= newStatus.expiration) {
        // ignore already expired statuses
        return;
      }

      const category = getTagValue(ev, "d");
      if (!isSupportedCategory(category)) {
        // ignore statuses other than "general" and "music"
        return;
      }

      const prevStatus = statusMap.get(pubkey);
      const prevSameCatStatus = prevStatus?.[category];

      if (newStatus.content !== "") {
        if (prevStatus === undefined) {
          statusMap.set(ev.pubkey, {
            pubkey,
            [category]: newStatus,
          });
        } else if (prevSameCatStatus === undefined || newStatus.createdAt > prevSameCatStatus.createdAt) {
          statusMap.set(ev.pubkey, {
            ...prevStatus,
            [category]: newStatus,
          });
        }
      } else {
        // status update with emtpy content -> invalidate
        if (
          prevStatus !== undefined &&
          prevSameCatStatus !== undefined &&
          newStatus.createdAt > prevSameCatStatus.createdAt
        ) {
          statusMap.set(ev.pubkey, {
            ...prevStatus,
            [category]: undefined,
          });
        }
      }

      // sort by last updated time, newest to oldest
      const sorted = [...statusMap.values()].sort((s1, s2) => statusLastUpdatedTime(s2) - statusLastUpdatedTime(s1));
      updateValue?.(sorted);
    };

    const abortFetchPast = nostrSystem.fetchAllPastUserStatus(myData.followings, updateStatusMap);
    const subscription = nostrSystem.subscribeUserStatus(myData.followings, updateStatusMap);

    cancel = () => {
      console.log("followingsStatusListAtom: canceled");
      abortFetchPast();
      subscription.unsubscribe();
    };

    const latestAtom = atom<UserStatus[]>([]);
    latestAtom.onMount = (update) => {
      updateValue = update;

      return () => {
        cancel();
      };
    };

    return latestAtom;
  });

  const valueAtom = await get(updateValueAtom);
  return get(valueAtom);
});

export const useCachedPubkey = () => {
  const [pubkey, setPubkey] = useState<string | undefined>(localStorage.getItem("nostr_pubkey") ?? undefined);

  const savePubkey = useCallback((pubkey: string) => {
    localStorage.setItem("nostr_pubkey", pubkey);
    setPubkey(pubkey);
  }, []);

  const clearPubkey = useCallback(() => {
    localStorage.removeItem("nostr_pubkey");
    setPubkey(undefined);
  }, []);

  return { pubkey, savePubkey, clearPubkey };
};

export const useMyData = () => {
  const { pubkey } = useCachedPubkey();

  const [myData, setMyData] = useState<MyData | undefined>();

  useEffect(() => {
    console.log("useMyData start", pubkey);

    if (pubkey === undefined) {
      console.log("pubkey is undefined -> clear myData");
      setMyData(undefined);
      return;
    }
    if (nostrSystem === undefined) {
      return;
    }

    console.log("fetching myData", pubkey);

    nostrSystem
      .fetchMyData(pubkey)
      .then((myData) => {
        setMyData(myData);
        console.log("finish fetching myData", myData);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [pubkey]);

  return myData;
};

// type FollowingsStatusesLoadState = "init" | "fetching-user-data" | "failed-user-data" | "subscribing";

export const useFollowingsStatuses = () => {
  const myData = useMyData();

  const userStatusMap = useRef(new Map<string, UserStatus>());

  // const [loadState, setLoadState] = useState<FollowingsStatusesLoadState>("init");
  const [profileMap, setProfileMap] = useState(new Map<string, UserProfile>());
  const [userStatues, setUserStatuses] = useState<UserStatus[]>([]);

  const clearAllStates = () => {
    userStatusMap.current.clear();
    setProfileMap(new Map<string, UserProfile>());
    setUserStatuses([]);
  };

  useEffect(() => {
    if (myData === undefined) {
      console.log("myData is undefined -> clear all states");
      clearAllStates();
      return;
    }
    if (nostrSystem === undefined) {
      return;
    }

    const updateUserProfileMap = (ev: NostrEvent) => {
      const profile = userProfileFromEvent(ev);

      setProfileMap((prev) => {
        prev.set(ev.pubkey, profile);
        return new Map(prev);
      });
    };

    const updateUserStatusList = (ev: NostrEvent) => {
      const pubkey = ev.pubkey;

      const newStatus = statusDataFromEvent(ev);
      if (newStatus.expiration !== undefined && currUnixtime() >= newStatus.expiration) {
        // ignore already expired statuses
        return;
      }

      const category = getTagValue(ev, "d");
      if (!isSupportedCategory(category)) {
        // ignore statuses other than "general" and "music"
        return;
      }

      const prevStatus = userStatusMap.current.get(pubkey);
      const prevSameCatStatus = prevStatus?.[category];

      if (newStatus.content !== "") {
        if (prevStatus === undefined) {
          userStatusMap.current.set(ev.pubkey, {
            pubkey,
            [category]: newStatus,
          });
        } else if (prevSameCatStatus === undefined || newStatus.createdAt > prevSameCatStatus.createdAt) {
          userStatusMap.current.set(ev.pubkey, {
            ...prevStatus,
            [category]: newStatus,
          });
        }
      } else {
        // status update with emtpy content -> invalidate
        if (
          prevStatus !== undefined &&
          prevSameCatStatus !== undefined &&
          newStatus.createdAt > prevSameCatStatus.createdAt
        ) {
          userStatusMap.current.set(ev.pubkey, {
            ...prevStatus,
            [category]: undefined,
          });
        }
      }

      // sort by last updated time, newest to oldest
      const sorted = [...userStatusMap.current.values()].sort(
        (s1, s2) => statusLastUpdatedTime(s2) - statusLastUpdatedTime(s1)
      );
      setUserStatuses(sorted);
    };

    const fetch = async (ns: NostrSystem, { readRelays, followings }: MyData) => {
      await ns.addReadRelays(readRelays);

      // setLoadState("subscribing");

      const abortFetchProfile = ns.fetchUserProfiles(followings, (ev) => {
        updateUserProfileMap(ev);
      });
      const abortFetchStatus = ns.fetchAllPastUserStatus(followings, (ev) => {
        updateUserStatusList(ev);
      });
      const subStatus = ns.subscribeUserStatus(followings, (ev) => {
        updateUserStatusList(ev);
      });

      return () => {
        console.log("canceling fetch followings statuses");
        abortFetchProfile();
        abortFetchStatus();
        subStatus.unsubscribe();
      };
    };

    console.log("fetching followings statuses");

    let cancel: (() => void) | undefined;
    fetch(nostrSystem, myData)
      .then((c) => {
        cancel = c;
      })
      .catch((err) => {
        console.error(err);
      });

    return () => cancel?.();
  }, [myData]);

  return { profileMap, userStatues };
};
