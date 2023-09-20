import { NostrEvent } from "nostr-fetch";
import { nip19 } from "nostr-tools";

/* primitives */
export const getFirstTagByName = (ev: NostrEvent, name: string): string[] => ev.tags.find((t) => t[0] === name) ?? [];

export const getFirstTagValueByName = (ev: NostrEvent, name: string): string => ev.tags.find((t) => t[0] === name)?.[1] ?? "";

export const getTagsByName = (ev: NostrEvent, name: string): string[][] =>
  ev.tags.filter((t) => t[0] === name);

export const getTagValuesByName = (ev: NostrEvent, name: string): string[] =>
  ev.tags.filter((t) => t[0] === name).map((t) => t[1] ?? "");

/* parsing relay list */
export type RelayList = Record<string, { read: boolean; write: boolean }>;

export const parseRelayList = (evs: NostrEvent[]): RelayList => {
  const relayListEvs = evs.filter((ev) => [3, 10002].includes(ev.kind));
  if (relayListEvs.length === 0) {
    return {};
  }
  const latest = relayListEvs.sort((a, b) => b.created_at - a.created_at)[0] as NostrEvent;

  switch (latest.kind) {
    case 3:
      return parseRelayListInKind3(latest);
    case 10002:
      return parseRelayListInKind10002(latest);
    default:
      console.error("parseRelayList: unreachable");
      return {};
  }
};

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

  getTagsByName(ev, "r")
    .forEach((t) => {
      const [, url, usage] = t;
      if (url === undefined) {
        return;
      }
      switch (usage) {
        case undefined:
        case "":
          res[url] = { read: true, write: true };
          return;

        case "read":
          res[url] = { read: true, write: false };
          return;

        case "write":
          res[url] = { read: false, write: true };
          return;
          
        default:
          console.warn("invalid relay type in kind 10002 event:", usage);
          undefined;
      }
    });

  return res;
};

export const selectRelaysByUsage = (relayList: RelayList, usage: "read" | "write"): string[] =>
  Object.entries(relayList)
    .filter(([, { read, write }]) => (usage === "read" && read) || (usage === "write" && write))
    .map(([rurl]) => rurl);

/* pubkey */
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
