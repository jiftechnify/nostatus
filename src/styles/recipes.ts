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
        color: {
          base: "primary.foreground",
          _disabled: "primary.muted.fg",
        },
        bg: {
          base: "primary",
          _hover: { _enabled: "primary.focused" },
          _focusVisible: { _enabled: "primary.focused" },
          _disabled: "primary.muted.bg",
        },
      },
      destructive: {
        color: {
          base: "destructive.foreground",
          _disabled: "destructive.muted.fg",
        },
        bg: {
          base: "destructive",
          _hover: { _enabled: "destructive.focused" },
          _focusVisible: { _enabled: "destructive.focused" },
          _disabled: "destructive.muted.bg",
        },
      },
      destructiveSubtle: {
        color: {
          base: "destructive.text",
        },
        bg: {
          base: "transparent",
        },
        shadow: "none",
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

export const menuItem = cva({
  base: {
    cursor: "pointer",
  },
  variants: {
    color: {
      default: {
        color: "foreground",
      },
      primary: {
        color: "primary.text",
      },
      destructive: {
        color: "destructive.text",
      },
    },
  },
  defaultVariants: {
    color: "default",
  },
});
