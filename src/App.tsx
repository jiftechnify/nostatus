import { css } from "@shadow-panda/styled-system/css";
import { vstack } from "@shadow-panda/styled-system/patterns";
import { useAtom } from "jotai";
import { RESET } from "jotai/utils";
import { Suspense } from "react";
import { HeaderMenu } from "./components/HeaderMenu";
import { LoginForm } from "./components/LoginForm";
import { UserStatusList } from "./components/UserStatusList";
import { myPubkeyAtom } from "./states/atoms";

export const App = () => {
  const [pubkey, setPubkey] = useAtom(myPubkeyAtom);

  const onLogin = (pubkey: string) => {
    setPubkey(pubkey);
  };
  const onLogout = () => {
    console.log("logout");
    setPubkey(RESET);
  };

  return (
    <div
      className={vstack({
        h: "100dvh",
        pt: "6",
        gap: "4",
      })}
    >
      <header
        className={css({
          w: "94vw",
          maxW: "600px",
          px: "2",
          display: "grid",
          gridTemplateColumns: "minmax(auto, 1fr) auto minmax(auto, 1fr)",
          alignItems: "center",
        })}
      >
        <div className={css({ mr: "auto" })}></div>
        <div className={css({ lineHeight: "tight", textAlign: "center" })}>
          <h1 className={css({ textStyle: "title" })}>nostatus</h1>
          <p className={css({ textStyle: "tagline", color: "gray.500" })}>Have an eye on your friends' status.</p>
        </div>
        <div className={css({ ml: "auto" })}>
          <Suspense>
            <HeaderMenu onLogout={onLogout} />
          </Suspense>
        </div>
      </header>

      <main className={css({ h: "100%", w: "100vw"})}>
        <Suspense>{pubkey !== undefined ? <UserStatusList /> : <LoginForm onLogin={onLogin} />}</Suspense>
      </main>
    </div>
  );
};
