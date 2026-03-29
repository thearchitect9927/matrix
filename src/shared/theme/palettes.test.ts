import { describe, it, expect } from 'vitest';
import { COLOR_THEMES, DEFAULT_THEME_ID, DEFAULT_APPEARANCE_MODE, getThemeById } from './palettes';
import type { ColorTheme, PaletteColors, AppearanceMode } from './palettes';

describe('Theme Palettes', () => {
  describe('COLOR_THEMES', () => {
    it('contains 7 predefined themes', () => {
      expect(COLOR_THEMES).toHaveLength(7);
    });

    it('has unique IDs for every theme', () => {
      const ids = COLOR_THEMES.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('each theme has both dark and light palettes', () => {
      for (const theme of COLOR_THEMES) {
        expect(theme.dark).toBeDefined();
        expect(theme.light).toBeDefined();
      }
    });

    it('each palette has all required color keys', () => {
      const requiredKeys: (keyof PaletteColors)[] = [
        'base900',
        'base800',
        'base700',
        'base600',
        'base500',
        'base400',
        'base300',
        'base200',
        'base100',
        'surface',
        'surfaceRaised',
        'surfaceOverlay',
        'accentPrimary',
        'accentPrimaryDim',
        'accentSecondary',
        'accentSecondaryDim',
        'textPrimary',
        'textSecondary',
        'textMuted',
        'borderDefault',
        'borderSubtle',
      ];

      for (const theme of COLOR_THEMES) {
        for (const key of requiredKeys) {
          expect(theme.dark[key], `${theme.id}.dark.${key}`).toBeDefined();
          expect(theme.light[key], `${theme.id}.light.${key}`).toBeDefined();
        }
      }
    });

    it('each theme has preview colors', () => {
      for (const theme of COLOR_THEMES) {
        expect(theme.preview.bg).toBeDefined();
        expect(theme.preview.accent).toBeDefined();
        expect(theme.preview.text).toBeDefined();
      }
    });

    it('all color values are valid hex strings', () => {
      const hexPattern = /^#[0-9a-fA-F]{6}$/;
      for (const theme of COLOR_THEMES) {
        for (const palette of [theme.dark, theme.light]) {
          for (const [key, value] of Object.entries(palette)) {
            expect(value, `${theme.id}.${key}: ${value}`).toMatch(hexPattern);
          }
        }
      }
    });
  });

  describe('DEFAULT_THEME_ID', () => {
    it('references an existing theme', () => {
      const found = COLOR_THEMES.find((t) => t.id === DEFAULT_THEME_ID);
      expect(found).toBeDefined();
    });

    it('is deep-space', () => {
      expect(DEFAULT_THEME_ID).toBe('deep-space');
    });
  });

  describe('DEFAULT_APPEARANCE_MODE', () => {
    it('is a valid AppearanceMode', () => {
      const valid: AppearanceMode[] = ['system', 'light', 'dark'];
      expect(valid).toContain(DEFAULT_APPEARANCE_MODE);
    });

    it('defaults to system', () => {
      expect(DEFAULT_APPEARANCE_MODE).toBe('system');
    });
  });

  describe('getThemeById', () => {
    it('returns the correct theme for a known ID', () => {
      const theme = getThemeById('midnight');
      expect(theme.id).toBe('midnight');
      expect(theme.name).toBe('Midnight');
    });

    it('returns default theme for unknown ID', () => {
      const theme = getThemeById('nonexistent-theme');
      expect(theme.id).toBe(DEFAULT_THEME_ID);
    });

    it('returns default theme for empty string', () => {
      const theme = getThemeById('');
      expect(theme.id).toBe(DEFAULT_THEME_ID);
    });

    it('returns every theme by its ID', () => {
      for (const expected of COLOR_THEMES) {
        const found = getThemeById(expected.id);
        expect(found).toBe(expected);
      }
    });
  });

  describe('ColorTheme type contract', () => {
    it('satisfies ColorTheme interface', () => {
      const theme: ColorTheme = {
        id: 'test',
        name: 'Test',
        description: 'A test theme',
        preview: { bg: '#000000', accent: '#ffffff', text: '#cccccc' },
        dark: COLOR_THEMES[0].dark,
        light: COLOR_THEMES[0].light,
      };
      expect(theme.id).toBe('test');
      expect(theme.dark.base900).toBeDefined();
      expect(theme.light.base900).toBeDefined();
    });
  });
});
