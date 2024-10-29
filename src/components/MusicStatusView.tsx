import { css } from "@shadow-panda/styled-system/css";
import { token } from "@shadow-panda/styled-system/tokens";
import { ExternalLink } from "./ExternalLink";

type MusicStatusViewProps = {
  content: string;
  linkUrl?: string;
};

export const MusicStatusView = ({ content, linkUrl }: MusicStatusViewProps) => {
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
      <span className={css({ verticalAlign: "middle" })}>{content}</span>
      {linkUrl && <ExternalLink href={linkUrl} size={token("fontSizes.sm")} />}
    </p>
  );
};
