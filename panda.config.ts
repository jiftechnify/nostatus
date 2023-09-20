import { defineConfig } from "@pandacss/dev";
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
    },
    body: {
      backgroundColor: "slate.100",
    },
  },

  // Useful for theme customization
  theme: {
    extend: {
      textStyles,
      semanticTokens: {
        colors: {
          primary: {
            DEFAULT: {
              value: {
                base: "{colors.purple.600}",
                _dark: "{colors.purple.600}",
              },
            },
            light: {
              value: {
                base: "{colors.purple.500}",
                _dark: "{colors.purple.500}",
              },
            },
            disabled: {
              value: {
                base: "{colors.purple.200}",
                _dark: "{colors.purple.200}",
              },
            },
          },
          danger: {
            DEFAULT: {
              value: {
                base: "{colors.red.600}",
                _dark: "{colors.red.600}",
              },
            },
            light: {
              value: {
                base: "{colors.red.500}",
                _dark: "{colors.red.500}",
              },
            },
            disabled: {
              value: {
                base: "{colors.red.200}",
                _dark: "{colors.red.200}",
              },
            },
          },
          bg: {
            DEFAULT: {
              value: {
                base: "{colors.slate.100}",
                _dark: "{colors.slate.100}",
              },
            },
            ui: {
              value: {
                base: "{colors.slate.50}",
                _dark: "{colors.slate.50}",
              },
            },
          },
        },
      },
    },
  },

  // The output directory for your css system
  emitPackage: true,
  outdir: "@shadow-panda/styled-system",

  jsxFramework: "react",
});
