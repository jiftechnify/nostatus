import { VList } from "virtua";
import { css } from "../../styled-system/css";
import { useFollowingsStatuses } from "../nostr";
import { UserStatusCard } from "./UserStatusCard";

type UserStatusListProps = {
  userPubkey: string;
};

export const UserStatusList: React.FC<UserStatusListProps> = ({
  userPubkey,
}) => {
  const { loadState, profileMap, userStatues } =
    useFollowingsStatuses(userPubkey);

  return (
    <VList>
      {userStatues.length !== 0 ? (
        userStatues.map((status) => {
          const profile = profileMap.get(status.pubkey) ?? {
            pubkey: status.pubkey,
          };
          return (
            <div
              key={status.pubkey}
              className={css({
                w: "600px",
                mx: "auto",
                mb: "2",
              })}
            >
              <UserStatusCard profile={profile} status={status} />
            </div>
          );
        })
      ) : (
        <p className={css({ textAlign: "center" })}>
          {loadState === "fetching-user-data" && "Fetching your follow list..."}
          {loadState === "subscribing" && "Fetching your friends' status... "}
          {loadState === "failed-user-data" &&
            "Failed to fetch your follow list 😵"}
        </p>
      )}
    </VList>
  );
};
