import { cva } from "@shadow-panda/styled-system/css";

export const avatar = cva({
  base: {},
  variants: {
    size: {
      sm: { w: "5", h: "5" },
      md: { w: "8", h: "8" },
    },
  },
});
