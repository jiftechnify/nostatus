import { css, cx } from "@shadow-panda/styled-system/css";
import { circle, vstack } from "@shadow-panda/styled-system/patterns";
import { icon } from "@shadow-panda/styled-system/recipes";
import { ArrowUpCircle } from "lucide-react";
import { Suspense, useRef } from "react";
import { HeaderMenu } from "./components/HeaderMenu";
import { LoginForm } from "./components/LoginForm";
import { UpdateStatusDialog } from "./components/UpdateStatusDialog";
import { UserStatusList, UserStatusListHandle } from "./components/UserStatusList";
import { useMyPubkey, useWriteOpsEnabled } from "./states/nostr";
import { useColorTheme } from "./states/theme";
import { button } from "./styles/recipes";

export const App = () => {
  useColorTheme();
  const pubkey = useMyPubkey();
  const writeOpsEnabled = useWriteOpsEnabled();

  const isTouch = isTouchDevice();

  const refStatusList = useRef<UserStatusListHandle>(null);
  const handleClickHeader = () => {
    refStatusList.current?.scrollToTop();
  };

  return (
    <div
      className={vstack({
        h: "100dvh",
        pt: "6",
        gap: "0",
        bg: "background",
        color: "foreground",
      })}
    >
      <header
        className={css({
          w: "94vw",
          maxW: "600px",
          px: "2",
          mb: "4",
          display: "grid",
          gridTemplateColumns: "minmax(auto, 1fr) auto minmax(auto, 1fr)",
          alignItems: "center",
        })}
      >
        <div className={css({ mr: "auto" })}></div>
        <div
          className={css({ lineHeight: "tight", textAlign: "center", cursor: "pointer" })}
          role="button"
          onClick={handleClickHeader}
        >
          <h1 className={css({ textStyle: "title" })}>nostatus</h1>
          <p className={css({ textStyle: "tagline", color: "text.sub" })}>Have an eye on your friends' status.</p>
        </div>
        <div className={css({ ml: "auto" })}>
          <Suspense>
            <HeaderMenu />
          </Suspense>
        </div>
      </header>

      <main className={css({ h: "100%", w: "100vw" })}>
        <Suspense>
          {pubkey !== undefined ? (
            <UserStatusList ref={refStatusList} />
          ) : (
            <LoginForm css={{ position: "relative", top: isTouch ? "max(calc(50% - 14rem), 16px)" : "16px" }} />
          )}
        </Suspense>
      </main>

      {/* floating action button that triggers UpdateStatusDialog */}
      {writeOpsEnabled && isTouch && <UpdateStatusDialog trigger={<UpdateStatusFab />} />}
    </div>
  );
};

const isTouchDevice = () => {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
};

const UpdateStatusFab = () => (
  <button
    className={css({
      ...button.raw({ color: "primary" }),
      ...circle.raw({ size: "16" }),
      position: "fixed",
      bottom: "8",
      right: "4",
      shadow: "lg",
    })}
    type="button"
  >
    <ArrowUpCircle className={cx(icon(), css({ w: "7", h: "7" }))} />
  </button>
);
