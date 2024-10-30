import { css } from "@shadow-panda/styled-system/css";
import { hstack } from "@shadow-panda/styled-system/patterns";
import { type NostrEvent, parseEventContent } from "../../nostr";
import { AppAvatar } from "../AppAvatar";
import { renderEventContentParts } from "./renderEventContentParts";

type UserProfileViewProps = {
  srcEvent?: NostrEvent;
  picture?: string;
  displayName: string;
  subName?: string;
};

export const UserProfileView = ({ picture, displayName, subName, srcEvent }: UserProfileViewProps) => {
  return (
    <div className={hstack({ gap: "1" })}>
      <AppAvatar imgSrc={picture} size="sm" />
      <div
        className={hstack({
          gap: "1",
          alignItems: "end",
        })}
      >
        <DisplayName {...{ displayName, srcEvent }} />
        {subName !== undefined && <SubName {...{ subName, srcEvent }} />}
      </div>
    </div>
  );
};

const DisplayName = ({ displayName, srcEvent }: { displayName: string; srcEvent?: NostrEvent }) => {
  const parts = parseEventContent(srcEvent, displayName);
  return <p className={css({ textStyle: "display-name" })}>{renderEventContentParts(parts)}</p>;
};

const SubName = ({ subName, srcEvent }: { subName: string; srcEvent?: NostrEvent }) => {
  const parts = parseEventContent(srcEvent, subName);
  return <p className={css({ textStyle: "sub-name", color: "text.sub" })}>{renderEventContentParts(parts)}</p>;
};
