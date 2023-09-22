import { css } from "@shadow-panda/styled-system/css";
import { circle, hstack, vstack } from "@shadow-panda/styled-system/patterns";
import { token } from "@shadow-panda/styled-system/tokens";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { userProfileAtomFamily, userStatusAtomFamily } from "../states/nostr";
import { UserStatus } from "../states/nostrModels";
import { currUnixtime } from "../utils";
import { AppAvatar } from "./AppAvatar";
import { ExternalLink } from "./ExternalLink";

type UserStatusCardProps = {
  pubkey: string;
};

export const UserStatusCard: React.FC<UserStatusCardProps> = ({ pubkey }) => {
  const profile = useAtomValue(userProfileAtomFamily(pubkey));
  const status = useAtomValue(userStatusAtomFamily(pubkey));

  const [recentlyUpdated, setRecentlyUpdated] = useState(false);
  useEffect(() => {
    if (status === undefined) {
      return;
    }
    const tts = timeToStatusUpdateStaled(status);
    if (tts <= 0) {
      return;
    }

    setRecentlyUpdated(true);
    const staleTimer = setTimeout(() => {
      setRecentlyUpdated(false);
    }, tts * 1000);

    return () => {
      setRecentlyUpdated(false);
      clearTimeout(staleTimer);
    };
  }, [status]);

  if (status === undefined) {
    console.error("no user status for pubkey:", pubkey);
    return null;
  }

  return (
    <div
      className={vstack({
        position: "relative",
        px: "4",
        pt: "4",
        pb: "3",
        shadow: "md",
        rounded: "md",
        alignItems: "start",
        bg: "card",
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
          <p className={css({ textStyle: "name", color: "text.sub" })}>{profile.name ?? "???"}</p>
        </div>
      </div>

      {/* recent update badge */}
      {recentlyUpdated && (
        <div
          className={circle({
            size: "3",
            position: "absolute",
            top: "-1",
            left: "-1",
            bg: "teal.400",
            shadow: "0 0 8px rgba(45, 212, 191, 0.6)",
          })}
        ></div>
      )}
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
        color: "text.no-status",
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
        color: "text.now-playing",
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

const RECENT_UPDATE_THRESHOLD_SEC = 60 * 60; // 1 hour

const timeToStatusUpdateStaled = (status: UserStatus) =>
  RECENT_UPDATE_THRESHOLD_SEC - (currUnixtime() - UserStatus.lastUpdateTime(status));
