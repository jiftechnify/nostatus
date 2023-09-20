import { css } from "@shadow-panda/styled-system/css";
import { vstack } from "@shadow-panda/styled-system/patterns";
import { Suspense } from "react";
import { HeaderMenu } from "./components/HeaderMenu";
import { LoginForm } from "./components/LoginForm";
import { UserStatusList } from "./components/UserStatusList";
import { useMyPubkey } from "./states/atoms";

export const App = () => {
  const pubkey = useMyPubkey();

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
            <HeaderMenu />
          </Suspense>
        </div>
      </header>

      <main className={css({ h: "100%", w: "100vw" })}>
        <Suspense>{pubkey !== undefined ? <UserStatusList /> : <LoginForm />}</Suspense>
      </main>
    </div>
  );
};
