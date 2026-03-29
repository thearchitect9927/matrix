import { describe, it, expect } from 'vitest';
import { paletteToCSSVars, paletteToXtermTheme } from './utils';
import { COLOR_THEMES } from './palettes';
import type { PaletteColors } from './palettes';

const testPalette: PaletteColors = COLOR_THEMES[0].dark; // deep-space dark

describe('paletteToCSSVars', () => {
  it('returns a record of CSS custom property strings', () => {
    const vars = paletteToCSSVars(testPalette);
    expect(typeof vars).toBe('object');
    for (const [key, value] of Object.entries(vars)) {
      expect(key).toMatch(/^--color-/);
      expect(typeof value).toBe('string');
    }
  });

  it('maps all 21 design tokens', () => {
    const vars = paletteToCSSVars(testPalette);
    expect(Object.keys(vars)).toHaveLength(21);
  });

  it('maps palette keys to correct CSS variable names', () => {
    const vars = paletteToCSSVars(testPalette);
    expect(vars['--color-base-900']).toBe(testPalette.base900);
    expect(vars['--color-base-100']).toBe(testPalette.base100);
    expect(vars['--color-accent-primary']).toBe(testPalette.accentPrimary);
    expect(vars['--color-accent-secondary']).toBe(testPalette.accentSecondary);
    expect(vars['--color-text-primary']).toBe(testPalette.textPrimary);
    expect(vars['--color-border-default']).toBe(testPalette.borderDefault);
    expect(vars['--color-surface']).toBe(testPalette.surface);
    expect(vars['--color-surface-raised']).toBe(testPalette.surfaceRaised);
    expect(vars['--color-surface-overlay']).toBe(testPalette.surfaceOverlay);
  });

  it('produces different values for different themes', () => {
    const dark = paletteToCSSVars(COLOR_THEMES[0].dark);
    const light = paletteToCSSVars(COLOR_THEMES[0].light);
    expect(dark['--color-base-900']).not.toBe(light['--color-base-900']);
  });
});

describe('paletteToXtermTheme', () => {
  it('returns an object with xterm theme keys', () => {
    const theme = paletteToXtermTheme(testPalette);
    expect(theme.background).toBeDefined();
    expect(theme.foreground).toBeDefined();
    expect(theme.cursor).toBeDefined();
  });

  it('maps background to base900', () => {
    const theme = paletteToXtermTheme(testPalette);
    expect(theme.background).toBe(testPalette.base900);
  });

  it('maps foreground to textPrimary', () => {
    const theme = paletteToXtermTheme(testPalette);
    expect(theme.foreground).toBe(testPalette.textPrimary);
  });

  it('includes all 16 ANSI colors + selection + cursor', () => {
    const theme = paletteToXtermTheme(testPalette);
    const expectedKeys = [
      'background',
      'foreground',
      'cursor',
      'cursorAccent',
      'selectionBackground',
      'selectionForeground',
      'selectionInactiveBackground',
      'black',
      'red',
      'green',
      'yellow',
      'blue',
      'magenta',
      'cyan',
      'white',
      'brightBlack',
      'brightRed',
      'brightGreen',
      'brightYellow',
      'brightBlue',
      'brightMagenta',
      'brightCyan',
      'brightWhite',
    ];
    for (const key of expectedKeys) {
      expect(theme[key], `missing xterm key: ${key}`).toBeDefined();
    }
  });

  it('selection background includes alpha suffix', () => {
    const theme = paletteToXtermTheme(testPalette);
    expect(theme.selectionBackground).toMatch(/^#[0-9a-fA-F]{6}[0-9a-fA-F]{2}$/);
  });
});
