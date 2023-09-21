import { defineConfig } from "@pandacss/dev";
import { semanticTokens } from "./semantic-tokens";
import { textStyles } from "./text-styles";

export default defineConfig({
  presets: ["@shadow-panda/preset"],

  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}"],

  // Files to exclude
  exclude: [],

  globalCss: {
    ":root": {
      fontSize: {
        base: "14px", // width < 640px
        sm: "16px",
      },
      color: "foreground",
      bg: "background",
    },
    "input.input": {
      color: "foreground",
    },
    "dialog.nostr-zap-dialog": {
      bg: "white",
    }
  },

  // Useful for theme customization
  theme: {
    extend: {
      textStyles,
      semanticTokens,
    },
  },

  // The output directory for your css system
  emitPackage: true,
  outdir: "@shadow-panda/styled-system",

  jsxFramework: "react",
});
