import { css } from "@shadow-panda/styled-system/css";
import { type EventContentPart, eventContentPartKey } from "../../nostr";
import { CustomEmoji } from "../CustomEmoji";

export const renderEventContentParts = (parts: EventContentPart[]): React.ReactNode[] => {
  if (parts.length === 0) {
    return [];
  }

  return parts.map((part) => {
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
  });
};
