import { defineTextStyles } from "@pandacss/dev";

export const textStyles = defineTextStyles({
  title: {
    description: "app title",
    value: {
      fontSize: "4xl",
      fontWeight: "bold",
    },
  },
  tagline: {
    description: "tagline below the title",
    value: {
      fontSize: "sm",
    },
  },
  "main-status": {
    description: "content of main (general) status",
    value: {
      fontSize: "2xl",
      fontWeight: "bold",
    },
  },
  "now-playing": {
    description: "now playing",
    value: {
      fontSize: "xs",
      fontStyle: "italic",
    },
  },
  "display-name": {
    description: "display name in profile",
    value: {
      fontSize: "md",
    },
  },
  name: {
    description: "name in profile",
    value: {
      fontSize: "xs",
    },
  },
});
