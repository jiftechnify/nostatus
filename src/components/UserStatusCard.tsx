import { css } from "@shadow-panda/styled-system/css";
import { hstack, vstack } from "@shadow-panda/styled-system/patterns";
import { token } from "@shadow-panda/styled-system/tokens";
import { useAtomValue } from "jotai";
import { userProfileAtomFamily, userStatusAtomFamily } from "../states/atoms";
import { AppAvatar } from "./AppAvatar";
import { ExternalLink } from "./ExternalLink";

type UserStatusCardProps = {
  pubkey: string;
};

export const UserStatusCard: React.FC<UserStatusCardProps> = ({ pubkey }) => {
  const profile = useAtomValue(userProfileAtomFamily(pubkey));
  const status = useAtomValue(userStatusAtomFamily(pubkey));

  if (status === undefined) {
    console.error("no user status for pubkey:", pubkey);
    return null;
  }

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
        <GeneralStatus content={status.general?.content} linkUrl={status.general?.linkUrl} />

        {/* now playing  */}
        {status.music && status.music.content && (
          <NowPlaying content={status.music.content} linkUrl={status.music.linkUrl} />
        )}
      </div>

      {/* profile */}
      <div className={hstack({ gap: "1" })}>
        <AppAvatar imgSrc={profile.picture} size="sm" />
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

type GeneralStatusProps = {
  content?: string;
  linkUrl?: string;
};

const GeneralStatus = ({ content, linkUrl }: GeneralStatusProps) => {
  const text = content ?? "";

  return text !== "" ? (
    <p
      className={css({
        textStyle: "main-status",
      })}
    >
      <span>{text}</span>
      {linkUrl && <ExternalLink href={linkUrl} />}
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

type NowPlayingProps = {
  content: string;
  linkUrl?: string;
};

const NowPlaying = ({ content, linkUrl }: NowPlayingProps) => {
  return (
    <p
      className={css({
        textStyle: "now-playing",
        color: "slate.600",
        _before: {
          content: "'♫'",
          mr: "1",
        },
      })}
    >
      <span>{content}</span>
      {linkUrl && <ExternalLink href={linkUrl} size={token("fontSizes.sm")} />}
    </p>
  );
};
