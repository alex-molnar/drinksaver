import { createTheme } from '@mui/material/styles';
import { darkTokens } from './tokens';

/**
 * A `var(--ds-*)` reference, not a `darkTokens` value. Used only inside `components.*
 * .styleOverrides` below, which MUI passes straight through to emotion as CSS text: referencing
 * the custom property by name there, rather than inlining today's colour, is what makes this one
 * theme rather than a new one every time a token changes.
 *
 * The palette just below does the opposite, and reads `darkTokens` directly. MUI's own
 * components call colour maths - `alpha()`, `decomposeColor()` - on `theme.palette.*.main`
 * internally, for things like a `IconButton`'s hover overlay, and none of that code can parse a
 * `var()` reference: it throws the moment such a component renders. Every `.styleOverrides`
 * value below, in contrast, is a literal CSS property MUI never touches with colour maths, so
 * `var()` there is exactly as safe as it is anywhere else in a stylesheet.
 */
const v = (name: string): string => `var(--ds-${name})`;

/**
 * This design system has no tint ramp: `light` and `dark` simply repeat `main` rather than
 * inventing shades the design doc never specified. Supplying every field explicitly, rather than
 * leaving MUI to derive the missing ones from `main`, is what keeps MUI's auto-contrast heuristic
 * from overriding a deliberate design choice - the button on `accent.active` reads with
 * `ink.primary`, not with whatever MUI's own luminance check would have picked.
 */
const soloColor = (main: string, contrastText: string) => ({ main, light: main, dark: main, contrastText });

/**
 * The dark theme, and the only one: per the design doc ("Dark only, deliberately") there is no
 * light variant to switch to, so this uses plain `palette.mode`, not MUI's `colorSchemes`, which
 * exists for switching between two.
 *
 * `shape.borderRadius` is a plain number, not a token reference: MUI types it that way because
 * it is used in arithmetic elsewhere in the theme (`shape.borderRadius * 2` and similar), so a
 * CSS custom property string cannot stand in for it. Its value still matches `--ds-radius-md` in
 * spirit; it just cannot track it live the way a `styleOverrides` value can.
 *
 * Component overrides are the presentational surface most likely to be replaced outright once
 * `feat/quick-save-plates` and its neighbours land ("every presentational component is ours").
 * Until then, the existing MUI components still render, so they still need real styling; this
 * ports the shape of the theme `main.tsx` used to hold, with every literal swapped for the
 * matching token.
 *
 * Every `styleOverrides` entry is a plain object, never a callback. A callback is equally valid
 * MUI API, but MUI only calls it once a matching component actually renders, and nothing here
 * renders one; left as a callback, the function body would sit uncovered against a coverage
 * gate that has almost no slack. `muiTheme.test.ts` asserts this holds.
 */
export const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: darkTokens.surface.ground,
      paper: darkTokens.surface.panel,
    },
    text: {
      primary: darkTokens.ink.primary,
      secondary: darkTokens.ink.secondary,
    },
    divider: darkTokens.line.hairline,
    // The design doc assigns `--red` to both "Primary action" and "destructive marks", so the
    // same hue backs both `primary` and `error` here.
    primary: soloColor(darkTokens.accent.primary, darkTokens.ink.primary),
    error: soloColor(darkTokens.accent.danger, darkTokens.ink.primary),
    secondary: soloColor(darkTokens.accent.active, darkTokens.ink.primary),
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: darkTokens.type.body.fontFamily,
    fontSize: 15,
    button: {
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: v('radius-md'),
          minHeight: 48,
          fontWeight: 600,
          boxShadow: 'none',
        },
        contained: {
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: v('radius-lg'),
          boxShadow: v('elevation-raised'),
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: v('radius-lg'),
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            minHeight: 52,
            borderRadius: v('radius-md'),
          },
          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: v('accent-primary'),
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          minHeight: 52,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: v('radius-sm'),
          fontWeight: 500,
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          height: 64,
          borderTop: `1px solid ${v('line-hairline')}`,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 60,
          padding: '8px 12px',
          '&.Mui-selected': {
            color: v('accent-active'),
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: v('elevation-raised'),
        },
      },
    },
  },
});
