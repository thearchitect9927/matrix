/**
 * Theme Utility Functions
 *
 * Converts palette colors to CSS custom property maps and xterm.js themes.
 */

import type { PaletteColors } from './palettes';

/**
 * Map a palette to CSS custom property name-value pairs.
 * These override the TailwindCSS v4 @theme tokens at runtime.
 */
export function paletteToCSSVars(palette: PaletteColors): Record<string, string> {
  return {
    '--color-base-900': palette.base900,
    '--color-base-800': palette.base800,
    '--color-base-700': palette.base700,
    '--color-base-600': palette.base600,
    '--color-base-500': palette.base500,
    '--color-base-400': palette.base400,
    '--color-base-300': palette.base300,
    '--color-base-200': palette.base200,
    '--color-base-100': palette.base100,
    '--color-surface': palette.surface,
    '--color-surface-raised': palette.surfaceRaised,
    '--color-surface-overlay': palette.surfaceOverlay,
    '--color-accent-primary': palette.accentPrimary,
    '--color-accent-primary-dim': palette.accentPrimaryDim,
    '--color-accent-secondary': palette.accentSecondary,
    '--color-accent-secondary-dim': palette.accentSecondaryDim,
    '--color-text-primary': palette.textPrimary,
    '--color-text-secondary': palette.textSecondary,
    '--color-text-muted': palette.textMuted,
    '--color-border-default': palette.borderDefault,
    '--color-border-subtle': palette.borderSubtle,
  };
}

/**
 * Generate an xterm.js ITheme from a palette.
 */
export function paletteToXtermTheme(palette: PaletteColors): Record<string, string> {
  return {
    background: palette.base900,
    foreground: palette.textPrimary,
    cursor: palette.accentSecondary,
    cursorAccent: palette.base900,
    selectionBackground: palette.base500 + '80',
    selectionForeground: palette.textPrimary,
    selectionInactiveBackground: palette.base500 + '40',
    // ANSI colors derived from palette
    black: palette.base800,
    red: '#ef4444',
    green: palette.accentSecondary,
    yellow: '#fbbf24',
    blue: palette.accentPrimary,
    magenta: '#a855f7',
    cyan: palette.accentPrimary,
    white: palette.textPrimary,
    brightBlack: palette.textMuted,
    brightRed: '#f87171',
    brightGreen: palette.accentSecondary,
    brightYellow: '#fcd34d',
    brightBlue: palette.accentPrimary,
    brightMagenta: '#c084fc',
    brightCyan: palette.accentPrimary,
    brightWhite: palette.textPrimary,
  };
}
