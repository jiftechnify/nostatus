import { NostrEvent } from "nostr-fetch";
import { css } from "../../styled-system/css";
import { circle, hstack, vstack } from "../../styled-system/patterns";

type UserStatusProps = {
  event: NostrEvent
}

export const UserStatus: React.FC<UserStatusProps> = ({ event }) => {
  return (
    <div
      className={vstack({
        px: "4",
        py: "3",
        alignItems: "start",
        gap: "0",
        lineHeight: "snug",
        border: "1px solid gray",
        rounded: "md",
      })}
    >
      <p
        className={css({
          mb: "2",
          fontSize: "2xl",
          fontWeight: "bold",
        })}
      >
        {event.content}
      </p>

      <div className={hstack({ alignItems: "baseline", gap: "1" })}>
        <img
          className={circle({
            size: "5",
            maxWidth: "none",
            objectFit: "cover",
          })}
          src="https://pubimgs.c-stellar.net/leaf_castella.webp"
          alt="avatar"
        />
        <div
          className={hstack({
            alignItems: "baseline",
            gap: "1.5",
            position: "relative",
            top: "-1",
          })}
        >
          <p>Display Name</p>
          <p className={css({ fontSize: "sm", color: "gray" })}>@name</p>
        </div>
      </div>
      <p
        className={css({
          fontSize: "sm",
          fontStyle: "italic",
          color: "slate.600",
        })}
      >
        ♫ hogehogehoge
      </p>
    </div>
  );
};
