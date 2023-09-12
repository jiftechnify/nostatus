import { rxNostrAdapter } from "@nostr-fetch/adapter-rx-nostr";
import { NostrEvent, NostrFetcher } from "nostr-fetch";
import { useEffect, useRef, useState } from "react";
import {
  RxNostr,
  createRxForwardReq,
  createRxNostr,
  uniq,
  verify,
} from "rx-nostr";

const bootstrapRelays = [
  "wss://relay.nostr.band",
  "wss://relayable.org",
  "wss://yabu.me",
];

export class NostrSystem {
  #rxNostr: RxNostr;
  #fetcher: NostrFetcher;

  private constructor() {
    this.#rxNostr = createRxNostr();
    this.#fetcher = NostrFetcher.withCustomPool(rxNostrAdapter(this.#rxNostr));
  }

  static async init() {
    const nostrSys = new NostrSystem();
    await nostrSys.setReadRelays(bootstrapRelays);
    return nostrSys;
  }

  public async setReadRelays(relays: string[]) {
    await this.#rxNostr.switchRelays(
      relays.map((r) => {
        return { url: r, read: true, write: false };
      })
    );
  }

  private getCurrReadRelays() {
    return this.#rxNostr
      .getRelays()
      .filter((r) => r.read)
      .map((r) => r.url);
  }

  public async fetchUserData(pubkey: string) {
    const [k3, k10002] = await Promise.all(
      [3, 10002].map((kind) =>
        this.#fetcher.fetchLastEvent(bootstrapRelays, {
          authors: [pubkey],
          kinds: [kind],
        })
      )
    );

    if (k3 === undefined) {
      return undefined;
    }
    const followings = k3.tags
      .filter((t) => t[0] === "p" && t[1] !== undefined)
      .map((t) => t[1]);

    const relayListEvs = [k3];
    if (k10002 !== undefined) {
      relayListEvs.push(k10002);
    }
    const readRelays = parseReadRelayList(relayListEvs);

    return { followings, readRelays };
  }

  public fetchUserProfiles(
    pubkeys: string[],
    onProfileEv: (ev: NostrEvent) => void
  ) {
    const ac = new AbortController();

    try {
      const iter = this.#fetcher.fetchLastEventPerAuthor(
        {
          authors: pubkeys,
          relayUrls: this.getCurrReadRelays(),
        },
        { kinds: [0] },
        { connectTimeoutMs: 2000 }
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

    return ac.abort;
  }

  public fetchAllPastUserStatus(
    pubkeys: string[],
    onStatusEv: (ev: NostrEvent) => void
  ): () => void {
    const ac = new AbortController();

    try {
      const iter = this.#fetcher.allEventsIterator(
        this.getCurrReadRelays(),
        { kinds: [30315], authors: pubkeys, "#d": ["general", "music"] },
        {},
        { abortSignal: ac.signal, connectTimeoutMs: 2000 }
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

    return ac.abort;
  }

  public subscribeUserStatus(
    pubkeys: string[],
    onStatusEv: (ev: NostrEvent) => void
  ) {
    const req = createRxForwardReq();
    const subscription = this.#rxNostr
      .use(req)
      .pipe(verify(), uniq())
      .subscribe((packet) => onStatusEv(packet.event));
    req.emit({
      kinds: [30315],
      authors: pubkeys,
      "#d": ["general", "music"],
      since: Date.now() / 1000,
    });

    return subscription;
  }
}

type StatusData = {
  content: string;
  linkUrl: string;
  createdAt: number;
  expiration: number | undefined;
};

export const statusDataFromEvent = (ev: NostrEvent): StatusData => {
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

  return { content: ev.content, linkUrl, createdAt, expiration };
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

type FollowingsStatusesLoadState =
  | "init"
  | "fetching-user-data"
  | "failed-user-data"
  | "subscribing";

export const useFollowingsStatuses = (pubkey: string) => {
  const [nostrSystem, setNostrStytem] = useState<NostrSystem | undefined>(
    undefined
  );
  const userStatusMap = useRef(new Map<string, UserStatus>());

  const [loadState, setLoadState] =
    useState<FollowingsStatusesLoadState>("init");
  const [profileMap, setProfileMap] = useState(new Map<string, UserProfile>());
  const [userStatues, setUserStatuses] = useState<UserStatus[]>([]);

  useEffect(() => {
    NostrSystem.init().then((sys) => {
      setNostrStytem(sys);
    });
  }, []);

  useEffect(() => {
    setLoadState("init");
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
      const category = getTagValue(ev, "d");
      if (!isSupportedCategory(category)) {
        return;
      }

      const prevStatus = userStatusMap.current.get(pubkey);
      const prevSameCatStatus = prevStatus?.[category];
      if (prevStatus === undefined) {
        userStatusMap.current.set(ev.pubkey, { pubkey, [category]: newStatus });
      } else if (
        prevSameCatStatus === undefined ||
        newStatus.createdAt > prevSameCatStatus.createdAt
      ) {
        userStatusMap.current.set(ev.pubkey, { ...prevStatus, [category]: ev });
      }

      // sort by last updated time, newest to oldest
      const sorted = [...userStatusMap.current.values()].sort(
        (s1, s2) => statusLastUpdatedTime(s2) - statusLastUpdatedTime(s1)
      );
      setUserStatuses(sorted);
    };

    const main = async (ns: NostrSystem) => {
      setLoadState("fetching-user-data");
      const userData = await ns.fetchUserData(pubkey);
      if (userData === undefined) {
        setLoadState("failed-user-data");
        return;
      }

      await ns.setReadRelays(userData.readRelays);

      setLoadState("subscribing");

      const abortFetchProfile = ns.fetchUserProfiles(
        userData.followings,
        (ev) => {
          console.log("profile ev", ev);
          updateUserProfileMap(ev);
        }
      );
      const abortFetchStatus = ns.fetchAllPastUserStatus(
        userData.followings,
        (ev) => {
          console.log("past status ev:", ev);
          updateUserStatusList(ev);
        }
      );
      const subStatus = ns.subscribeUserStatus(userData.followings, (ev) => {
        console.log("realtime status ev:", ev);
        updateUserStatusList(ev);
      });

      return () => {
        abortFetchProfile();
        abortFetchStatus();
        subStatus.unsubscribe();
      };
    };

    let cancel: (() => void) | undefined;
    main(nostrSystem)
      .then((c) => {
        cancel = c;
      })
      .catch((err) => {
        console.error(err);
      });

    return () => cancel?.();
  }, [nostrSystem, pubkey]);

  return { loadState, profileMap, userStatues };
};

type RelayList = Record<string, { read: boolean; write: boolean }>;

const parseReadRelayList = (evs: NostrEvent[]): string[] => {
  const relayListEvs = evs.filter((ev) => [3, 10002].includes(ev.kind));
  if (relayListEvs.length === 0) {
    return [];
  }
  const latest = relayListEvs.sort(
    (a, b) => b.created_at - a.created_at
  )[0] as NostrEvent;

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

const selectRelaysByUsage = (
  relayList: RelayList,
  usage: "read" | "write"
): string[] =>
  Object.entries(relayList)
    .filter(
      ([, { read, write }]) =>
        (usage === "read" && read) || (usage === "write" && write)
    )
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

const getTagValue = (ev: NostrEvent, name: string): string =>
  ev.tags.find((t) => t[0] === name)?.[1] ?? "";
