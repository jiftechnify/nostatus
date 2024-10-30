import { css } from "@shadow-panda/styled-system/css";
import { useAtomValue } from "jotai";
import { easeInOutQuart } from "js-easing-functions";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { useTranslation } from "react-i18next";
import { VList, type VListHandle } from "virtua";
import { pubkeysOrderByLastStatusUpdateTimeAtom } from "../../states/nostr";
import { UserStatusCard } from "./UserStatusCard";

export type UserStatusListHandle = {
  scrollToTop(): void;
};

export const UserStatusList = forwardRef<UserStatusListHandle>(function UserStatusList(_, ref) {
  const orderedPubkeys = useAtomValue(pubkeysOrderByLastStatusUpdateTimeAtom);

  const refVList = useRef<VListHandle>(null);
  useImperativeHandle(
    ref,
    () => {
      return {
        scrollToTop() {
          if (refVList.current === null) {
            return;
          }
          const vl = refVList.current;
          animatedScroll(vl.scrollOffset, (n) => vl.scrollTo(n));
        },
      };
    },
    [],
  );

  const { t } = useTranslation();

  return (
    <VList ref={refVList} overscan={10}>
      {/* spacer above the top item */}
      <div className={css({ h: "2" })} />

      {/* main */}
      {orderedPubkeys.length !== 0 ? (
        orderedPubkeys.map((pubkey) => {
          return (
            <div
              key={pubkey}
              className={css({
                w: {
                  base: "94%", // width < 640px
                  sm: "600px",
                },
                mx: "auto",
                mb: "2",
              })}
            >
              <UserStatusCard pubkey={pubkey} />
            </div>
          );
        })
      ) : (
        <p className={css({ textAlign: "center" })}>{t("Fetching")}</p>
      )}

      {/* spacer below the bottom item */}
      <div className={css({ h: "4" })} />
    </VList>
  );
});

const animatedScroll = (start: number, scrollTo: (n: number) => void) => {
  const duration = Math.max(Math.min(start / 7, 1000), 200);

  const startedAt = Date.now();
  const tick = () => {
    const elapsed = Date.now() - startedAt;
    scrollTo(easeInOutQuart(elapsed, start, -start, duration));
    if (elapsed < duration) {
      requestAnimationFrame(tick);
    }
  };
  tick();
};
