import { css } from "../../styled-system/css";
import { circle, hstack, vstack } from "../../styled-system/patterns";
import { UserProfile, UserStatus } from "../nostr";

type UserStatusCardProps = {
  profile: UserProfile;
  status: UserStatus;
};

export const UserStatusCard: React.FC<UserStatusCardProps> = ({
  profile,
  status,
}) => {
  return (
    <div
      className={vstack({
        px: "4",
        pt: "3",
        pb: "2",
        alignItems: "start",
        gap: "3",
        lineHeight: "snug",
        border: "1px solid gray",
        rounded: "md",
      })}
    >
      <div>
        {/* status */}
        <p
          className={css({
            fontSize: "2xl",
            fontWeight: "bold",
          })}
        >
          {status.general?.content || "no status"}
        </p>

        {/* now playing  */}
        {status.music && status.music.content && (
          <p
            className={css({
              fontSize: "xs",
              fontStyle: "italic",
              color: "slate.600",
            })}
          >
            ♫ {status.music.content}
          </p>
        )}
      </div>

      {/* profile */}
      <div className={hstack({ alignItems: "baseline", gap: "1" })}>
        <img
          className={circle({
            size: "5",
            maxWidth: "none",
            objectFit: "cover",
          })}
          src={profile.picture}
          alt="avatar"
        />
        <div
          className={hstack({
            gap: "1.5",
            position: "relative",
            top: "-1",
          })}
        >
          <p>{profile.displayName ?? "No Name"}</p>
          <p className={css({ fontSize: "xs", color: "gray.400" })}>
            @{profile.name ?? "???"}
          </p>
        </div>
      </div>
    </div>
  );
};
