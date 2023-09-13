import { RelayList } from "./nostr";

declare global {
  interface Window {
    nostr: {
      getPublicKey: () => Promise<string>;
      getRelays: () => Promise<RelayList>;
    };
  }
}
