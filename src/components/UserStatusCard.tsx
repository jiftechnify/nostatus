import { css } from "../../styled-system/css";
import { circle, hstack, vstack } from "../../styled-system/patterns";
import { UserProfile, UserStatus } from "../nostr";

type UserStatusCardProps = {
  profile: UserProfile;
  status: UserStatus;
};

export const UserStatusCard: React.FC<UserStatusCardProps> = ({ profile, status }) => {
  return (
    <div
      className={vstack({
        px: "4",
        pt: "4",
        pb: "3",
        shadow: "md",
        rounded: "md",
        alignItems: "start",
        bg: "slate.50",
        lineHeight: "snug",
        gap: "2.5",
      })}
    >
      <div>
        {/* status */}
        <GeneralStatus content={status.general?.content} />

        {/* now playing  */}
        {status.music && status.music.content && (
          <div
            className={css({
              textStyle: "now-playing",
              color: "slate.600",
              _before: {
                content: "'♫'",
                mr: "1",
              },
            })}
          >
            {status.music.content}
          </div>
        )}
      </div>

      {/* profile */}
      <div className={hstack({ gap: "1" })}>
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
            gap: "1",
            alignItems: "baseline",
          })}
        >
          {profile.displayName && <p className={css({ textStyle: "display-name" })}>{profile.displayName}</p>}
          <p className={css({ textStyle: "name", color: "gray.400" })}>@{profile.name ?? "???"}</p>
        </div>
      </div>
    </div>
  );
};

const GeneralStatus = ({ content }: { content: string | undefined }) => {
  const text = content ?? "";

  return text !== "" ? (
    <p
      className={css({
        textStyle: "main-status",
      })}
    >
      {text}
    </p>
  ) : (
    <p
      className={css({
        textStyle: "main-status",
        color: "slate.300",
      })}
    >
      No status
    </p>
  );
};
