import { NostrEvent } from "nostr-fetch";
import { nip19 } from "nostr-tools";

/* primitives */
export const getFirstTagValue = (ev: NostrEvent, name: string): string => ev.tags.find((t) => t[0] === name)?.[1] ?? "";

export const getTagValues = (ev: NostrEvent, name: string): string[] =>
  ev.tags.filter((t) => t[0] === name).map((t) => t[1]);

/* parsing relay list */
type RelayList = Record<string, { read: boolean; write: boolean }>;

export const parseReadRelayList = (evs: NostrEvent[]): string[] => {
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

const selectRelaysByUsage = (relayList: RelayList, usage: "read" | "write"): string[] =>
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
