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
  "music-status": {
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
  "sub-name": {
    description: "sub-name in profile",
    value: {
      fontSize: "xs",
    },
  },
  "detail-title": {
    description: "title of detail dialog",
    value: {
      fontSize: "2xl",
      fontWeight: "bold",
    },
  },
  "detail-subject": {
    description: "subject of detail item",
    value: {
      fontSize: "xl",
      fontWeight: "bold",
    },
  },
  mono: {
    description: "monospace text",
    value: {
      fontFamily: "monospace",
    },
  },
  "dialog-label-like": {
    description: "label-like text in dialog",
    value: {
      fontSize: "sm",
      fontWeight: "medium",
      lineHeight: "none",
    },
  },
});
