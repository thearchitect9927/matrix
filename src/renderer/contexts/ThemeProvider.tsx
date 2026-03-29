import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { AppearanceMode, ColorTheme } from '@shared/theme/palettes';
import {
  COLOR_THEMES,
  DEFAULT_THEME_ID,
  DEFAULT_APPEARANCE_MODE,
  getThemeById,
} from '@shared/theme/palettes';
import { paletteToCSSVars, paletteToXtermTheme } from '@shared/theme/utils';

// ─── Types ────────────────────────────────────────────────────────────

interface ThemeSettings {
  appearanceMode: AppearanceMode;
  colorThemeId: string;
}

interface ThemeContextValue {
  /** Current appearance mode setting */
  appearanceMode: AppearanceMode;
  /** Current color theme ID */
  colorThemeId: string;
  /** Resolved mode after evaluating system preference */
  resolvedMode: 'light' | 'dark';
  /** Current active color theme object */
  colorTheme: ColorTheme;
  /** All available themes */
  themes: ColorTheme[];
  /** Update appearance mode and persist */
  setAppearanceMode: (mode: AppearanceMode) => void;
  /** Update color theme and persist */
  setColorTheme: (themeId: string) => void;
  /** xterm.js theme derived from current palette */
  xtermTheme: Record<string, string>;
  /** Whether initial load is in progress */
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ─── LocalStorage cache key ───────────────────────────────────────────

const LS_KEY = 'matrix-theme';

function readCache(): ThemeSettings | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ThemeSettings;
  } catch {
    return null;
  }
}

function writeCache(settings: ThemeSettings): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable
  }
}

// ─── CSS variable injection ───────────────────────────────────────────

function applyPaletteToDOM(vars: Record<string, string>): void {
  const root = document.documentElement;
  // Enable scoped theme transitions (see index.css [data-theme-transition])
  root.setAttribute('data-theme-transition', '');
  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Read cached settings synchronously for instant apply (no flash)
  const cached = useMemo(() => readCache(), []);

  const [settings, setSettings] = useState<ThemeSettings>({
    appearanceMode: cached?.appearanceMode ?? DEFAULT_APPEARANCE_MODE,
    colorThemeId: cached?.colorThemeId ?? DEFAULT_THEME_ID,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [systemMode, setSystemMode] = useState<'light' | 'dark'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  // Resolve effective mode
  const resolvedMode: 'light' | 'dark' =
    settings.appearanceMode === 'system' ? systemMode : settings.appearanceMode;

  const colorTheme = getThemeById(settings.colorThemeId);
  const activePalette = resolvedMode === 'dark' ? colorTheme.dark : colorTheme.light;
  const xtermTheme = useMemo(() => paletteToXtermTheme(activePalette), [activePalette]);

  // ── Apply CSS vars whenever palette changes ──
  useEffect(() => {
    const vars = paletteToCSSVars(activePalette);
    applyPaletteToDOM(vars);
  }, [activePalette]);

  // ── Listen to OS color scheme ──
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemMode(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Load settings from config file on mount ──
  useEffect(() => {
    (async () => {
      try {
        const config = await window.api.readConfig();
        const rawMode = config.appearance_mode as string | undefined;
        const rawThemeId = config.color_theme_id as string | undefined;

        // Validate appearance mode
        const validModes: AppearanceMode[] = ['system', 'light', 'dark'];
        const loadedMode =
          rawMode && validModes.includes(rawMode as AppearanceMode)
            ? (rawMode as AppearanceMode)
            : DEFAULT_APPEARANCE_MODE;

        // Validate theme ID exists
        const loadedThemeId =
          rawThemeId && getThemeById(rawThemeId).id === rawThemeId ? rawThemeId : DEFAULT_THEME_ID;

        const loaded: ThemeSettings = {
          appearanceMode: loadedMode,
          colorThemeId: loadedThemeId,
        };

        // Only update if different from cache to avoid unnecessary re-render/flash
        setSettings((prev) => {
          if (
            prev.appearanceMode === loaded.appearanceMode &&
            prev.colorThemeId === loaded.colorThemeId
          ) {
            return prev;
          }
          return loaded;
        });
        writeCache(loaded);
      } catch {
        // Use defaults / cached
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setAppearanceMode = useCallback((mode: AppearanceMode) => {
    setSettings((prev) => {
      const next = { ...prev, appearanceMode: mode };
      writeCache(next);
      window.api
        .writeConfig({ appearance_mode: next.appearanceMode, color_theme_id: next.colorThemeId })
        .catch(() => {});
      return next;
    });
  }, []);

  const setColorTheme = useCallback((themeId: string) => {
    setSettings((prev) => {
      const next = { ...prev, colorThemeId: themeId };
      writeCache(next);
      window.api
        .writeConfig({ appearance_mode: next.appearanceMode, color_theme_id: next.colorThemeId })
        .catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      appearanceMode: settings.appearanceMode,
      colorThemeId: settings.colorThemeId,
      resolvedMode,
      colorTheme,
      themes: COLOR_THEMES,
      setAppearanceMode,
      setColorTheme,
      xtermTheme,
      isLoading,
    }),
    [settings, resolvedMode, colorTheme, setAppearanceMode, setColorTheme, xtermTheme, isLoading]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context. Must be used within ThemeProvider.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
