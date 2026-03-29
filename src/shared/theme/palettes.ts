/**
 * Color Theme Palettes for Matrix
 *
 * Each palette defines colors for both light and dark appearance modes.
 * CSS custom properties are overridden at runtime by the ThemeProvider.
 */

/**
 * Color values for a single appearance mode
 */
export interface PaletteColors {
  // Base shades (900=darkest surface, 100=lightest/most subtle)
  base900: string;
  base800: string;
  base700: string;
  base600: string;
  base500: string;
  base400: string;
  base300: string;
  base200: string;
  base100: string;

  // Surface layers
  surface: string;
  surfaceRaised: string;
  surfaceOverlay: string;

  // Accent colors
  accentPrimary: string;
  accentPrimaryDim: string;
  accentSecondary: string;
  accentSecondaryDim: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Borders
  borderDefault: string;
  borderSubtle: string;
}

/**
 * A complete color theme with light and dark variants
 */
export interface ColorTheme {
  id: string;
  name: string;
  description: string;
  /** Preview colors for the theme selector UI */
  preview: {
    bg: string;
    accent: string;
    text: string;
  };
  dark: PaletteColors;
  light: PaletteColors;
}

/**
 * Appearance mode type
 */
export type AppearanceMode = 'system' | 'light' | 'dark';

// ─── Theme Definitions ────────────────────────────────────────────────

const deepSpace: ColorTheme = {
  id: 'deep-space',
  name: 'Deep Space',
  description: 'Default dark theme with cyan & lime accents',
  preview: { bg: '#0a0a0f', accent: '#22d3ee', text: '#e2e8f0' },
  dark: {
    base900: '#0a0a0f',
    base800: '#0e0e16',
    base700: '#14141f',
    base600: '#1a1a28',
    base500: '#22223a',
    base400: '#2e2e4a',
    base300: '#3a3a58',
    base200: '#52527a',
    base100: '#7a7aa0',
    surface: '#0e0e16',
    surfaceRaised: '#14141f',
    surfaceOverlay: '#1a1a28',
    accentPrimary: '#22d3ee',
    accentPrimaryDim: '#0e7490',
    accentSecondary: '#a3e635',
    accentSecondaryDim: '#65a30d',
    textPrimary: '#e2e8f0',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    borderDefault: '#1e293b',
    borderSubtle: '#162032',
  },
  light: {
    base900: '#ffffff',
    base800: '#f8fafc',
    base700: '#f1f5f9',
    base600: '#e2e8f0',
    base500: '#cbd5e1',
    base400: '#94a3b8',
    base300: '#64748b',
    base200: '#475569',
    base100: '#334155',
    surface: '#f8fafc',
    surfaceRaised: '#ffffff',
    surfaceOverlay: '#f1f5f9',
    accentPrimary: '#0891b2',
    accentPrimaryDim: '#06b6d4',
    accentSecondary: '#65a30d',
    accentSecondaryDim: '#84cc16',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    borderDefault: '#e2e8f0',
    borderSubtle: '#f1f5f9',
  },
};

const midnight: ColorTheme = {
  id: 'midnight',
  name: 'Midnight',
  description: 'Deep blue tones with violet accents',
  preview: { bg: '#0b0d1a', accent: '#8b5cf6', text: '#e0e7ff' },
  dark: {
    base900: '#0b0d1a',
    base800: '#0f1225',
    base700: '#151830',
    base600: '#1b1f3b',
    base500: '#252b50',
    base400: '#323966',
    base300: '#434b7c',
    base200: '#5b6399',
    base100: '#8088b3',
    surface: '#0f1225',
    surfaceRaised: '#151830',
    surfaceOverlay: '#1b1f3b',
    accentPrimary: '#8b5cf6',
    accentPrimaryDim: '#6d28d9',
    accentSecondary: '#38bdf8',
    accentSecondaryDim: '#0284c7',
    textPrimary: '#e0e7ff',
    textSecondary: '#a5b4fc',
    textMuted: '#6366f1',
    borderDefault: '#1e2446',
    borderSubtle: '#161b38',
  },
  light: {
    base900: '#ffffff',
    base800: '#f5f3ff',
    base700: '#ede9fe',
    base600: '#ddd6fe',
    base500: '#c4b5fd',
    base400: '#a78bfa',
    base300: '#7c3aed',
    base200: '#5b21b6',
    base100: '#4c1d95',
    surface: '#f5f3ff',
    surfaceRaised: '#ffffff',
    surfaceOverlay: '#ede9fe',
    accentPrimary: '#7c3aed',
    accentPrimaryDim: '#8b5cf6',
    accentSecondary: '#0284c7',
    accentSecondaryDim: '#38bdf8',
    textPrimary: '#1e1b4b',
    textSecondary: '#4338ca',
    textMuted: '#a5b4fc',
    borderDefault: '#ddd6fe',
    borderSubtle: '#ede9fe',
  },
};

const emerald: ColorTheme = {
  id: 'emerald',
  name: 'Emerald',
  description: 'Rich greens with warm gold highlights',
  preview: { bg: '#0a100e', accent: '#34d399', text: '#d1fae5' },
  dark: {
    base900: '#0a100e',
    base800: '#0e1612',
    base700: '#131c17',
    base600: '#19241e',
    base500: '#223028',
    base400: '#2e4038',
    base300: '#3d5449',
    base200: '#567862',
    base100: '#7da08a',
    surface: '#0e1612',
    surfaceRaised: '#131c17',
    surfaceOverlay: '#19241e',
    accentPrimary: '#34d399',
    accentPrimaryDim: '#059669',
    accentSecondary: '#fbbf24',
    accentSecondaryDim: '#d97706',
    textPrimary: '#d1fae5',
    textSecondary: '#6ee7b7',
    textMuted: '#4ade80',
    borderDefault: '#1a3028',
    borderSubtle: '#142420',
  },
  light: {
    base900: '#ffffff',
    base800: '#f0fdf4',
    base700: '#dcfce7',
    base600: '#bbf7d0',
    base500: '#86efac',
    base400: '#4ade80',
    base300: '#16a34a',
    base200: '#15803d',
    base100: '#166534',
    surface: '#f0fdf4',
    surfaceRaised: '#ffffff',
    surfaceOverlay: '#dcfce7',
    accentPrimary: '#059669',
    accentPrimaryDim: '#34d399',
    accentSecondary: '#d97706',
    accentSecondaryDim: '#fbbf24',
    textPrimary: '#052e16',
    textSecondary: '#166534',
    textMuted: '#86efac',
    borderDefault: '#bbf7d0',
    borderSubtle: '#dcfce7',
  },
};

const sunset: ColorTheme = {
  id: 'sunset',
  name: 'Sunset',
  description: 'Warm oranges and deep reds',
  preview: { bg: '#120a06', accent: '#f97316', text: '#fed7aa' },
  dark: {
    base900: '#120a06',
    base800: '#180e08',
    base700: '#1f140c',
    base600: '#281a10',
    base500: '#352316',
    base400: '#48301e',
    base300: '#5e4029',
    base200: '#7d5838',
    base100: '#a87c56',
    surface: '#180e08',
    surfaceRaised: '#1f140c',
    surfaceOverlay: '#281a10',
    accentPrimary: '#f97316',
    accentPrimaryDim: '#c2410c',
    accentSecondary: '#fb923c',
    accentSecondaryDim: '#ea580c',
    textPrimary: '#fed7aa',
    textSecondary: '#fdba74',
    textMuted: '#9a6d4a',
    borderDefault: '#3d2714',
    borderSubtle: '#2e1d0e',
  },
  light: {
    base900: '#ffffff',
    base800: '#fff7ed',
    base700: '#ffedd5',
    base600: '#fed7aa',
    base500: '#fdba74',
    base400: '#fb923c',
    base300: '#ea580c',
    base200: '#c2410c',
    base100: '#9a3412',
    surface: '#fff7ed',
    surfaceRaised: '#ffffff',
    surfaceOverlay: '#ffedd5',
    accentPrimary: '#ea580c',
    accentPrimaryDim: '#f97316',
    accentSecondary: '#c2410c',
    accentSecondaryDim: '#fb923c',
    textPrimary: '#431407',
    textSecondary: '#9a3412',
    textMuted: '#fdba74',
    borderDefault: '#fed7aa',
    borderSubtle: '#ffedd5',
  },
};

const rose: ColorTheme = {
  id: 'rose',
  name: 'Rose',
  description: 'Elegant pinks with soft purple tones',
  preview: { bg: '#100a0e', accent: '#f43f5e', text: '#fecdd3' },
  dark: {
    base900: '#100a0e',
    base800: '#160e14',
    base700: '#1d131a',
    base600: '#261822',
    base500: '#33202e',
    base400: '#462b3e',
    base300: '#5c3a51',
    base200: '#7d5270',
    base100: '#a47494',
    surface: '#160e14',
    surfaceRaised: '#1d131a',
    surfaceOverlay: '#261822',
    accentPrimary: '#f43f5e',
    accentPrimaryDim: '#be123c',
    accentSecondary: '#e879f9',
    accentSecondaryDim: '#a21caf',
    textPrimary: '#fecdd3',
    textSecondary: '#fda4af',
    textMuted: '#9f5670',
    borderDefault: '#3b1c2e',
    borderSubtle: '#2c1522',
  },
  light: {
    base900: '#ffffff',
    base800: '#fff1f2',
    base700: '#ffe4e6',
    base600: '#fecdd3',
    base500: '#fda4af',
    base400: '#fb7185',
    base300: '#e11d48',
    base200: '#be123c',
    base100: '#9f1239',
    surface: '#fff1f2',
    surfaceRaised: '#ffffff',
    surfaceOverlay: '#ffe4e6',
    accentPrimary: '#e11d48',
    accentPrimaryDim: '#f43f5e',
    accentSecondary: '#a21caf',
    accentSecondaryDim: '#e879f9',
    textPrimary: '#4c0519',
    textSecondary: '#9f1239',
    textMuted: '#fda4af',
    borderDefault: '#fecdd3',
    borderSubtle: '#ffe4e6',
  },
};

const arctic: ColorTheme = {
  id: 'arctic',
  name: 'Arctic',
  description: 'Cool blues and crisp whites',
  preview: { bg: '#070d14', accent: '#38bdf8', text: '#bae6fd' },
  dark: {
    base900: '#070d14',
    base800: '#0b1120',
    base700: '#0f172a',
    base600: '#151e30',
    base500: '#1e293b',
    base400: '#293548',
    base300: '#374555',
    base200: '#506070',
    base100: '#748898',
    surface: '#0b1120',
    surfaceRaised: '#0f172a',
    surfaceOverlay: '#151e30',
    accentPrimary: '#38bdf8',
    accentPrimaryDim: '#0284c7',
    accentSecondary: '#67e8f9',
    accentSecondaryDim: '#06b6d4',
    textPrimary: '#e2e8f0',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    borderDefault: '#1e293b',
    borderSubtle: '#162032',
  },
  light: {
    base900: '#ffffff',
    base800: '#f0f9ff',
    base700: '#e0f2fe',
    base600: '#bae6fd',
    base500: '#7dd3fc',
    base400: '#38bdf8',
    base300: '#0284c7',
    base200: '#0369a1',
    base100: '#075985',
    surface: '#f0f9ff',
    surfaceRaised: '#ffffff',
    surfaceOverlay: '#e0f2fe',
    accentPrimary: '#0284c7',
    accentPrimaryDim: '#38bdf8',
    accentSecondary: '#06b6d4',
    accentSecondaryDim: '#67e8f9',
    textPrimary: '#0c4a6e',
    textSecondary: '#0369a1',
    textMuted: '#7dd3fc',
    borderDefault: '#bae6fd',
    borderSubtle: '#e0f2fe',
  },
};

const mono: ColorTheme = {
  id: 'mono',
  name: 'Mono',
  description: 'Clean grayscale with no color distractions',
  preview: { bg: '#0a0a0a', accent: '#d4d4d4', text: '#e5e5e5' },
  dark: {
    base900: '#0a0a0a',
    base800: '#0f0f0f',
    base700: '#171717',
    base600: '#1f1f1f',
    base500: '#292929',
    base400: '#3a3a3a',
    base300: '#525252',
    base200: '#6b6b6b',
    base100: '#8a8a8a',
    surface: '#0f0f0f',
    surfaceRaised: '#171717',
    surfaceOverlay: '#1f1f1f',
    accentPrimary: '#d4d4d4',
    accentPrimaryDim: '#a3a3a3',
    accentSecondary: '#e5e5e5',
    accentSecondaryDim: '#b3b3b3',
    textPrimary: '#e5e5e5',
    textSecondary: '#a3a3a3',
    textMuted: '#737373',
    borderDefault: '#262626',
    borderSubtle: '#1c1c1c',
  },
  light: {
    base900: '#ffffff',
    base800: '#fafafa',
    base700: '#f5f5f5',
    base600: '#e5e5e5',
    base500: '#d4d4d4',
    base400: '#a3a3a3',
    base300: '#737373',
    base200: '#525252',
    base100: '#404040',
    surface: '#fafafa',
    surfaceRaised: '#ffffff',
    surfaceOverlay: '#f5f5f5',
    accentPrimary: '#404040',
    accentPrimaryDim: '#525252',
    accentSecondary: '#525252',
    accentSecondaryDim: '#737373',
    textPrimary: '#171717',
    textSecondary: '#525252',
    textMuted: '#a3a3a3',
    borderDefault: '#e5e5e5',
    borderSubtle: '#f5f5f5',
  },
};

// ─── Exports ──────────────────────────────────────────────────────────

/** All available color themes */
export const COLOR_THEMES: ColorTheme[] = [
  deepSpace,
  midnight,
  emerald,
  sunset,
  rose,
  arctic,
  mono,
];

/** Default theme ID */
export const DEFAULT_THEME_ID = 'deep-space';

/** Default appearance mode */
export const DEFAULT_APPEARANCE_MODE: AppearanceMode = 'system';

/**
 * Look up a theme by ID. Returns the default theme if not found.
 */
export function getThemeById(id: string): ColorTheme {
  return COLOR_THEMES.find((t) => t.id === id) ?? deepSpace;
}
