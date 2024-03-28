import { css } from "@shadow-panda/styled-system/css";
import { circle, hstack, vstack } from "@shadow-panda/styled-system/patterns";
import { icon } from "@shadow-panda/styled-system/recipes";
import { useAtomValue } from "jotai";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { userProfileAtomFamily, userStatusAtomFamily } from "../states/nostr";
import { type UserProfile, UserStatus } from "../states/nostrModels";
import { currUnixtime } from "../utils";
import { AppAvatar } from "./AppAvatar";
import { ExternalLink } from "./ExternalLink";
import { MusicStatusView } from "./MusicStatusView";
import { StatusDetailsView } from "./StatusDetailsView";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";

const extractNames = (profile: UserProfile): { displayName: string; subName: string | undefined } => {
  if (!profile.displayName) {
    return {
      displayName: profile.name || "???",
      subName: undefined,
    };
  }

  // profile.displayName is non-empty string
  if (profile.name === undefined || profile.displayName.includes(profile.name.trim())) {
    return {
      displayName: profile.displayName,
      subName: undefined,
    };
  }
  return {
    displayName: profile.displayName,
    subName: profile.name,
  };
};

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

  const { displayName, subName } = extractNames(profile);

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
        {status.music?.content && <MusicStatusView content={status.music.content} linkUrl={status.music.linkUrl} />}
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
          <p className={css({ textStyle: "display-name" })}>{displayName}</p>
          {subName !== undefined && <p className={css({ textStyle: "sub-name", color: "text.sub" })}>{subName}</p>}
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
        />
      )}

      {/* open details dialog */}
      <Dialog>
        <DialogTrigger
          className={css({
            position: "absolute",
            color: "detail-trigger",
            bottom: "3",
            right: "3",
            cursor: "pointer",
          })}
        >
          <MoreHorizontal className={icon()} />
        </DialogTrigger>
        <DialogContent className={css({ minW: "max-content" })}>
          <StatusDetailsView status={status} />
        </DialogContent>
      </Dialog>
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
        wordBreak: "break-all",
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

const RECENT_UPDATE_THRESHOLD_SEC = 60 * 60; // 1 hour

const timeToStatusUpdateStaled = (status: UserStatus) =>
  RECENT_UPDATE_THRESHOLD_SEC - (currUnixtime() - UserStatus.lastUpdateTime(status));
