import { NostrExtension } from "./nostr";

declare global {
  interface Window {
    nostr: NostrExtension;

    nostrZap: {
      initTarget: (targetEl: HTMLElement) => void;
    };
  }
}
