import { css } from "@shadow-panda/styled-system/css";
import { token } from "@shadow-panda/styled-system/tokens";
import { type NostrEvent, eventContentPartKey, parseEventContent } from "../nostr";
import { CustomEmoji } from "./CustomEmoji";
import { ExternalLink } from "./ExternalLink";

type MusicStatusViewProps = {
  srcEvent: NostrEvent;
  linkUrl?: string;
};

export const MusicStatusView = ({ srcEvent, linkUrl }: MusicStatusViewProps) => {
  const parts = parseEventContent(srcEvent);

  return (
    <p
      className={css({
        textStyle: "music-status",
        color: "text.music-status",
        _before: {
          content: "'♫'",
          mr: "1",
        },
      })}
    >
      {parts.map((part) => {
        const key = eventContentPartKey(part);
        switch (part.type) {
          case "text":
            return (
              <span key={key} className={css({ verticalAlign: "middle" })}>
                {part.text}
              </span>
            );
          case "custom-emoji":
            return <CustomEmoji key={key} imgUrl={part.imgUrl} shortcode={part.shortcode} />;
        }
      })}
      {linkUrl && <ExternalLink href={linkUrl} size={token("fontSizes.sm")} />}
    </p>
  );
};
