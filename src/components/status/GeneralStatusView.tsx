import { css } from "@shadow-panda/styled-system/css";
import { type NostrEvent, parseEventContent } from "../../nostr";
import { ExternalLink } from "../ExternalLink";
import { renderEventContentParts } from "./renderEventContentParts";

type GeneralStatusProps = {
  srcEvent?: NostrEvent;
  linkUrl?: string;
};

export const GeneralStatusView = ({ srcEvent, linkUrl }: GeneralStatusProps) => {
  if (srcEvent === undefined) {
    return <NoStatus />;
  }

  const parts = parseEventContent(srcEvent);
  return parts.length > 0 ? (
    <p
      className={css({
        textStyle: "main-status",
        wordBreak: "break-all",
      })}
    >
      {renderEventContentParts(parts)}
      {linkUrl && <ExternalLink href={linkUrl} />}
    </p>
  ) : (
    <NoStatus />
  );
};

const NoStatus = () => {
  return (
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
