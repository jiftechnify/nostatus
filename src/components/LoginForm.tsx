import { css } from "@shadow-panda/styled-system/css";
import { vstack } from "@shadow-panda/styled-system/patterns";
import { useState } from "react";
import { parsePrivkey, parsePubkey } from "../nostr";
import { useLoginWithPrivkey, useLoginWithPubkey, useNip07Availability } from "../states/nostr";
import { button } from "../styles/recipes";
import { Input } from "./ui/input";

export const LoginForm: React.FC = () => {
  const loginWithPubkey = useLoginWithPubkey();
  const loginWithPrivkey = useLoginWithPrivkey();

  const isNip07Available = useNip07Availability();
  const [pubkeyInput, setPubkeyInput] = useState("");
  const [nsecInput, setNsecInput] = useState("");

  const onClickNip07Login = async () => {
    const pubkey = await window.nostr.getPublicKey();
    if (pubkey) {
      loginWithPubkey(pubkey);
    }
  };

  const onClickPubkeyLogin = () => {
    const hexPubkey = parsePubkey(pubkeyInput);
    if (hexPubkey === undefined) {
      console.error("invalid pubkey");
      window.alert("invalid pubkey");
      return;
    }

    loginWithPubkey(hexPubkey);
  };

  const onClickNsecLogin = () => {
    const hexPrivkey = parsePrivkey(nsecInput);
    if (hexPrivkey === undefined) {
      console.error("invalkid nsec");
      window.alert("invalid nsec");
      return;
    }

    loginWithPrivkey(hexPrivkey);
  };

  return (
    <div className={vstack({ w: "300px", mt: "4", mx: "auto", gap: "10" })}>
      <button className={button({ expand: true })} onClick={onClickNip07Login} disabled={!isNip07Available}>
        Login with NIP-07 Extension
      </button>

      <div className={vstack({ w: "100%", gap: "1.5" })}>
        <Input
          className={css({ h: "8", px: "1", py: "0.5" })}
          type="text"
          placeholder="npub or hex pubkey"
          value={pubkeyInput}
          onChange={(e) => setPubkeyInput(e.target.value)}
        />
        <button className={button({ expand: true })} onClick={onClickPubkeyLogin}>
          Login with Pubkey
        </button>
      </div>

      <div className={vstack({ w: "100%", gap: "1.5" })}>
        <Input
          className={css({ h: "8", px: "1", py: "0.5" })}
          type="password"
          placeholder="nsec1..."
          value={nsecInput}
          onChange={(e) => setNsecInput(e.target.value)}
        />
        <button className={button({ expand: true })} onClick={onClickNsecLogin}>
          Login with nsec
        </button>
      </div>
    </div>
  );
};
