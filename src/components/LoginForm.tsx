import { css } from "@shadow-panda/styled-system/css";
import { vstack } from "@shadow-panda/styled-system/patterns";
import { useState } from "react";
import { parsePubkey } from "../nostr";
import { useLogin, useNip07Availability } from "../states/atoms";
import { button } from "../styles/recipes";


export const LoginForm: React.FC = () => {
  const login = useLogin();

  const isNip07Available = useNip07Availability();
  const [pubkeyInput, setPubkeyInput] = useState("");

  const onClickNip07Login = async () => {
    const pubkey = await window.nostr.getPublicKey();
    if (pubkey) {
      login(pubkey);
    }
  };

  const onClickPubkeyLogin = () => {
    const hexPubkey = parsePubkey(pubkeyInput);
    if (hexPubkey === undefined) {
      console.error("invalid pubkey");
      window.alert("invalid pubkey");
    }

    if (hexPubkey !== undefined) {
      login(hexPubkey);
    }
  };

  return (
    <div className={vstack({ w: "300px", mt: "4", mx: "auto", gap: "8" })}>
      <button className={button({ expand: true })} onClick={onClickNip07Login} disabled={!isNip07Available}>
        Login with NIP-07 Extension
      </button>
      <div className={vstack({ w: "100%" })}>
        <input
          className={css({
            w: "100%",
            px: "1",
            py: "0.5",
            rounded: "sm",
            fontSize: "sm",
          })}
          type="text"
          placeholder="npub or hex pubkey"
          value={pubkeyInput}
          onChange={(ev) => setPubkeyInput(ev.target.value)}
        ></input>
        <button className={button({ expand: true })} onClick={onClickPubkeyLogin}>
          Login with Pubkey
        </button>
      </div>
    </div>
  );
};
