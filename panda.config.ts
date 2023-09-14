import { defineConfig } from "@pandacss/dev";
import { textStyles } from "./text-styles";

export default defineConfig({
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
    },
    body: {
      backgroundColor: "slate.100",
    },
  },

  // Useful for theme customization
  theme: {
    extend: {
      textStyles,
    },
  },

  // The output directory for your css system
  outdir: "styled-system",

  jsxFramework: "react",
});
