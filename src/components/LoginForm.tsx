import { useEffect, useState } from "react";
import { css } from "../../styled-system/css";
import { vstack } from "../../styled-system/patterns";
import { SystemStyleObject } from "../../styled-system/types";
import { isNip07ExtAvailable, parsePubkey } from "../nostr";

const loginButtonStyles: SystemStyleObject = {
  px: "3",
  py: "2",
  rounded: "md",
  color: "white",
  cursor: {
    base: "pointer",
    _disabled: "not-allowed",
  },
  bg: {
    base: "purple.600",
    _hover: { _enabled: "purple.700" },
    _disabled: "purple.200",
  },
  shadow: {
    base: "sm",
    _hover: { _enabled: "md" },
    _disabled: "none",
  },
  transition: "all 0.2s",
};

type LoginFormProps = {
  onLogin: (pubkey: string) => void;
};

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [nip07Available, setNip07Available] = useState(false);
  const [pubkeyInput, setPubkeyInput] = useState("");

  useEffect(() => {
    isNip07ExtAvailable()
      .then((avail) => setNip07Available(avail))
      .catch(console.error);
  }, []);

  const onClickNip07Login = async () => {
    const pubkey = await window.nostr.getPublicKey();
    if (pubkey) {
      onLogin(pubkey);
    }
  };

  const onClickManualLogin = () => {
    const hexPubkey = parsePubkey(pubkeyInput);
    if (hexPubkey === undefined) {
      console.error("invalid pubkey");
      window.alert("invalid pubkey");
    }

    if (hexPubkey !== undefined) {
      onLogin(hexPubkey);
    }
  };

  return (
    <div className={vstack({ w: "300px", mt: "4", mx: "auto", gap: "8" })}>
      <button
        className={css({
          w: "100%",
          ...loginButtonStyles,
        })}
        onClick={onClickNip07Login}
        disabled={!nip07Available}
      >
        Login with NIP-07 Extension
      </button>
      <div className={vstack({ w: "100%" })}>
        <input
          className={css({
            w: "100%",
            px: "1",
            py: "0.5",
            rounded: "md",
            fontSize: "sm",
          })}
          type="text"
          placeholder="npub or hex pubkey"
          value={pubkeyInput}
          onChange={(ev) => setPubkeyInput(ev.target.value)}
        ></input>
        <button
          className={css({
            w: "100%",
            ...loginButtonStyles,
          })}
          onClick={onClickManualLogin}
        >
          Login with Pubkey
        </button>
      </div>
    </div>
  );
};
