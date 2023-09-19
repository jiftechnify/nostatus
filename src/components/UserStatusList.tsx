import { css } from "@shadow-panda/styled-system/css";
import { useAtomValue } from "jotai";
import { VList } from "virtua";
import { pubkeysOrderByLastStatusUpdateTimeAtom } from "../states/atoms";
import { UserStatusCard } from "./UserStatusCard";

export const UserStatusList: React.FC = () => {
  const orderedPubkeys = useAtomValue(pubkeysOrderByLastStatusUpdateTimeAtom);

  return (
    <VList>
      {/* spacer above the top item */}
      <div className={css({h: "2"})}></div>

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
        <p className={css({ textAlign: "center" })}>Fetching...</p>
      )}

      {/* spacer below the bottom item */}
      <div className={css({h: "4"})}></div>
    </VList>
  );
};
