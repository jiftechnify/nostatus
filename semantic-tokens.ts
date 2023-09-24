import { defineSemanticTokens } from "@pandacss/dev";

export const semanticTokens = defineSemanticTokens({
  colors: {
    foreground: {
      value: {
        base: "{colors.slate.950}",
        _dark: "{colors.slate.50}",
      },
    },
    background: {
      value: {
        base: "{colors.slate.100}",
        _dark: "{colors.slate.950}",
      },
    },
    card: {
      value: {
        base: "{colors.slate.50}",
        _dark: "{colors.slate.900}",
      },
    },
    popover: {
      DEFAULT: {
        value: {
          base: "{colors.white}",
          _dark: "{colors.slate.800}",
        },
      },
      foreground: {
        value: {
          base: "{colors.slate.950}",
          _dark: "{colors.slate.50}",
        },
      },
    },
    border: {
      // for borders of various shadow panda components
      value: {
        base: "{colors.slate.200}",
        _dark: "{colors.slate.700}",
      },
    },
    input: {
      // for borders of inputs
      value: {
        base: "{colors.slate.200}",
        _dark: "{colors.slate.700}",
      },
    },
    muted: {
      // for DropdownMenuSeparator
      DEFAULT: {
        value: {
          base: "{colors.slate.200}",
          _dark: "{colors.slate.700}",
        },
      },
      foreground: {
        value: {
          base: "{colors.slate.500}",
          _dark: "{colors.slate.400}",
        },
      },
    },
    accent: {
      // for DropdownMenuItem (on hover)
      DEFAULT: {
        value: {
          base: "{colors.slate.100}",
          _dark: "{colors.slate.700}",
        },
      },
      foreground: {
        value: {
          base: "{colors.slate.900}",
          _dark: "{colors.slate.50}",
        },
      },
    },
    primary: {
      DEFAULT: {
        value: {
          base: "{colors.purple.600}",
          _dark: "{colors.purple.700}",
        },
      },
      focused: {
        value: {
          base: "{colors.purple.500}",
          _dark: "{colors.purple.600}",
        },
      },
      foreground: {
        value: {
          base: "{colors.slate.50}",
          _dark: "{colors.slate.50}",
        },
      },
      muted: {
        bg: {
          value: {
            base: "{colors.purple.200}",
            _dark: "{colors.purple.950}",
          },
        },
        fg: {
          value: {
            base: "{colors.slate.50}",
            _dark: "{colors.slate.600}",
          },
        },
      },
    },
    destructive: {
      DEFAULT: {
        value: {
          base: "{colors.red.600}",
          _dark: "{colors.red.700}",
        },
      },
      focused: {
        value: {
          base: "{colors.red.500}",
          _dark: "{colors.red.600}",
        },
      },
      foreground: {
        value: {
          base: "{colors.slate.50}",
          _dark: "{colors.slate.50}",
        },
      },
      muted: {
        bg: {
          value: {
            base: "{colors.red.200}",
            _dark: "{colors.red.950}",
          },
        },
        fg: {
          value: {
            base: "{colors.slate.50}",
            _dark: "{colors.slate.600}",
          },
        },
      },
    },
    text: {
      sub: {
        value: {
          base: "{colors.gray.500}",
          _dark: "{colors.gray.400}",
        },
      },
      "no-status": {
        value: {
          base: "{colors.slate.300}",
          _dark: "{colors.slate.700}",
        },
      },
      "now-playing": {
        value: {
          base: "{colors.slate.600}",
          _dark: "{colors.slate.400}",
        },
      },
    },
    "ext-link": {
      DEFAULT: {
        value: {
          base: "{colors.purple.400}",
          _dark: "{colors.purple.500}",
        },
      },
      visited: {
        value: {
          base: "{colors.slate.400}",
          _dark: "{colors.slate.500}",
        },
      },
    },
    "avatar-fallback": {
      value: {
        base: "{colors.slate.400}",
        _dark: "{colors.slate.500}",
      },
    },
    "detail-trigger": {
      value: {
        base: "{colors.slate.300}",
        _dark: "{colors.slate.700}",
      },
    },
  },
});
