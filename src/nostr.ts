import type { NostrEvent } from "nostr-fetch";
export type { NostrEvent };
import { nip19 } from "nostr-tools";

/* primitives */
export const getFirstTagByName = (ev: NostrEvent, name: string): string[] => ev.tags.find((t) => t[0] === name) ?? [];

export const getFirstTagValueByName = (ev: NostrEvent, name: string): string =>
  ev.tags.find((t) => t[0] === name)?.[1] ?? "";

export const getTagsByName = (ev: NostrEvent, name: string): string[][] => ev.tags.filter((t) => t[0] === name);

export const getTagValuesByName = (ev: NostrEvent, name: string): string[] =>
  ev.tags.filter((t) => t[0] === name).map((t) => t[1] ?? "");

/* parsing content into parts */
const contentRefPattern = /(:[_a-zA-Z0-9]+:)/;

export type EventContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "custom-emoji";
      imgUrl: string;
      shortcode: string;
    };

export const eventContentPartKey = (part: EventContentPart): string => {
  switch (part.type) {
    case "text":
      return `text-${part.text}`;
    case "custom-emoji":
      return `emoji-${part.imgUrl}`;
  }
};

export const parseEventContent = (ev: NostrEvent | undefined, textToParse?: string): EventContentPart[] => {
  const input = textToParse ?? ev?.content ?? "";
  if (input.length === 0) {
    return [];
  }

  // parse input "as is" if event is not available
  if (ev === undefined) {
    return [
      {
        type: "text",
        text: input,
      },
    ];
  }

  return input
    .split(contentRefPattern)
    .filter((s) => s !== undefined && s.length > 0)
    .map((part) => {
      // custom emoji
      if (part.startsWith(":") && part.endsWith(":")) {
        return parseCustomEmoji(part, ev);
      }
      return {
        type: "text",
        text: part,
      };
    });
};

const getEmojiImgUrlByShortcode = (ev: NostrEvent, shortcode: string): string | undefined =>
  ev.tags.find((t) => t[0] === "emoji" && t[1] === shortcode)?.[2];

const parseCustomEmoji = (part: string, ev: NostrEvent): EventContentPart => {
  const shortcode = part.slice(1, -1);
  const imgUrl = getEmojiImgUrlByShortcode(ev, shortcode);
  if (imgUrl === undefined) {
    return {
      type: "text",
      text: part,
    };
  }
  return {
    type: "custom-emoji",
    imgUrl,
    shortcode,
  };
};

/* parsing relay list */
export type RelayList = Record<string, { read: boolean; write: boolean }>;

export const parseRelayListInEvent = (ev: NostrEvent): RelayList | undefined => {
  switch (ev.kind) {
    case 3:
      return parseRelayListInKind3(ev);
    case 10002:
      return parseRelayListInKind10002(ev);
    default:
      console.error("parseRelayListInEvent: unreachable");
      return undefined;
  }
};

const parseRelayListInKind3 = (ev: NostrEvent): RelayList | undefined => {
  if (ev.content === "") {
    return undefined;
  }

  try {
    return JSON.parse(ev.content) as RelayList; // TODO: schema validation
  } catch (err) {
    console.error("failed to parse kind 3 event:", err);
    return undefined;
  }
};

const parseRelayListInKind10002 = (ev: NostrEvent): RelayList | undefined => {
  const res: RelayList = Object.create(null);

  for (const t of getTagsByName(ev, "r")) {
    const [, url, usage] = t;
    if (url === undefined) {
      continue;
    }
    switch (usage) {
      case undefined:
      case "":
        res[url] = { read: true, write: true };
        break;

      case "read":
        res[url] = { read: true, write: false };
        break;

      case "write":
        res[url] = { read: false, write: true };
        break;

      default:
        console.warn("invalid relay type in kind 10002 event:", usage);
        break;
    }
  }

  if (Object.keys(res).length === 0) {
    return undefined;
  }
  return res;
};

export const selectRelaysByUsage = (relayList: RelayList, usage: "read" | "write"): string[] =>
  Object.entries(relayList)
    .filter(([, { read, write }]) => (usage === "read" && read) || (usage === "write" && write))
    .map(([rurl]) => rurl);

/* keys */
const regexp32BytesHexStr = /^[a-f0-9]{64}$/;

export const parsePubkey = (pubkey: string): string | undefined => {
  if (pubkey.startsWith("npub1")) {
    try {
      const res = nip19.decode(pubkey);
      if (res.type === "npub") {
        return res.data;
      }
      console.error("parsePubkey: unexpected decode result");
      return undefined;
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }
  return regexp32BytesHexStr.test(pubkey) ? pubkey : undefined;
};

export const parseSeckey = (nsec: string): Uint8Array | undefined => {
  if (!nsec.startsWith("nsec1")) {
    return undefined;
  }
  try {
    const res = nip19.decode(nsec);
    if (res.type === "nsec") {
      return res.data;
    }
    console.error("parseSeckey: unexpected decode result");
    return undefined;
  } catch (err) {
    console.error(err);
    return undefined;
  }
};

/* NIP-07 extensions */
export type NostrExtension = {
  getPublicKey: () => Promise<string>;
  getRelays?: () => Promise<RelayList>;
};
