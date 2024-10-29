import { css } from "@shadow-panda/styled-system/css";

type CustomEmojiProps = {
  imgUrl: string;
  shortcode: string;
};

export const CustomEmoji = ({ imgUrl, shortcode }: CustomEmojiProps) => {
  return (
    <img
      className={css({
        display: "inline-block",
        height: "1lh",
        maxWidth: "100%",
        objectFit: "contain",
        verticalAlign: "middle",
      })}
      src={imgUrl}
      alt={shortcode}
    />
  );
};
