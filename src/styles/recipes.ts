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

export const button = cva({
  base: {
    px: "3",
    py: "2",
    rounded: "md",
    cursor: {
      base: "pointer",
      _disabled: "not-allowed",
    },

    shadow: {
      base: "sm",
      _hover: { _enabled: "md" },
      _focusVisible: { _enabled: "md" },
      _disabled: "none",
    },

    transition: "all 0.2s",
  },
  variants: {
    color: {
      primary: {
        color: "white",
        bg: {
          base: "purple.600",
          _hover: { _enabled: "purple.500" },
          _focusVisible: { _enabled: "purple.500" },
          _disabled: "purple.200",
        },
      },
      danger: {
        color: "white",
        bg: {
          base: "red.600",
          _hover: { _enabled: "red.500" },
          _focusVisible: { _enabled: "red.500" },
          _disabled: "red.200",
        },
      },
    },
    expand: {
      false: {},
      true: {
        w: "100%",
      },
    },
  },
  defaultVariants: {
    color: "primary",
    expand: false,
  },
});
