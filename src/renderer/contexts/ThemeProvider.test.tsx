import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeProvider';

// ─── Test helper component ────────────────────────────────────────────

function ThemeConsumer() {
  const {
    appearanceMode,
    colorThemeId,
    resolvedMode,
    themes,
    setAppearanceMode,
    setColorTheme,
    isLoading,
  } = useTheme();

  return (
    <div>
      <span data-testid="mode">{appearanceMode}</span>
      <span data-testid="theme-id">{colorThemeId}</span>
      <span data-testid="resolved">{resolvedMode}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="theme-count">{themes.length}</span>
      <button data-testid="set-light" onClick={() => setAppearanceMode('light')}>
        Light
      </button>
      <button data-testid="set-dark" onClick={() => setAppearanceMode('dark')}>
        Dark
      </button>
      <button data-testid="set-midnight" onClick={() => setColorTheme('midnight')}>
        Midnight
      </button>
    </div>
  );
}

// ─── Setup / Teardown ─────────────────────────────────────────────────

let matchMediaListeners: ((e: MediaQueryListEvent) => void)[] = [];
let matchMediaMatches = true; // dark by default

beforeEach(() => {
  vi.mocked(window.api.readConfig).mockResolvedValue({
    onboarding_completed: true,
    appearance_mode: 'system',
    color_theme_id: 'deep-space',
  });
  vi.mocked(window.api.writeConfig).mockResolvedValue({ success: true });

  localStorage.clear();
  matchMediaListeners = [];
  matchMediaMatches = true;

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('dark') ? matchMediaMatches : !matchMediaMatches,
      media: query,
      addEventListener: (_event: string, handler: (e: MediaQueryListEvent) => void) => {
        matchMediaListeners.push(handler);
      },
      removeEventListener: (_event: string, handler: (e: MediaQueryListEvent) => void) => {
        matchMediaListeners = matchMediaListeners.filter((h) => h !== handler);
      },
    })),
  });
});

afterEach(() => {
  // Clean up inline styles set by ThemeProvider
  document.documentElement.removeAttribute('style');
  document.documentElement.removeAttribute('data-theme-transition');
});

// ─── Tests ────────────────────────────────────────────────────────────

describe('ThemeProvider', () => {
  it('provides default theme values', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('mode').textContent).toBe('system');
    expect(screen.getByTestId('theme-id').textContent).toBe('deep-space');

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  it('exposes all 7 themes', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-count').textContent).toBe('7');
  });

  it('resolves system mode to dark when OS prefers dark', async () => {
    matchMediaMatches = true;
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('resolved').textContent).toBe('dark');
  });

  it('resolves system mode to light when OS prefers light', async () => {
    matchMediaMatches = false;
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('resolved').textContent).toBe('light');
  });

  it('sets appearance mode and persists to config', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await user.click(screen.getByTestId('set-light'));

    expect(screen.getByTestId('mode').textContent).toBe('light');
    expect(screen.getByTestId('resolved').textContent).toBe('light');

    // Verify persistence
    expect(window.api.writeConfig).toHaveBeenCalledWith(
      expect.objectContaining({ appearance_mode: 'light' })
    );
  });

  it('sets color theme and persists to config', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await user.click(screen.getByTestId('set-midnight'));

    expect(screen.getByTestId('theme-id').textContent).toBe('midnight');

    expect(window.api.writeConfig).toHaveBeenCalledWith(
      expect.objectContaining({ color_theme_id: 'midnight' })
    );
  });

  it('applies CSS variables to document root', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // ThemeProvider should have set CSS variables on <html>
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-base-900')).toBeTruthy();
    expect(root.style.getPropertyValue('--color-accent-primary')).toBeTruthy();
  });

  it('sets data-theme-transition attribute on document root', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.documentElement.hasAttribute('data-theme-transition')).toBe(true);
    });
  });

  it('reads cached settings from localStorage', async () => {
    localStorage.setItem(
      'matrix-theme',
      JSON.stringify({ appearanceMode: 'dark', colorThemeId: 'emerald' })
    );

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Should immediately reflect cached values (no flash)
    expect(screen.getByTestId('mode').textContent).toBe('dark');
    expect(screen.getByTestId('theme-id').textContent).toBe('emerald');
  });

  it('loads config from file on mount and updates state', async () => {
    vi.mocked(window.api.readConfig).mockResolvedValue({
      onboarding_completed: true,
      appearance_mode: 'light',
      color_theme_id: 'rose',
    });

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mode').textContent).toBe('light');
      expect(screen.getByTestId('theme-id').textContent).toBe('rose');
    });
  });

  it('falls back to defaults when config has invalid appearance mode', async () => {
    vi.mocked(window.api.readConfig).mockResolvedValue({
      appearance_mode: 'invalid-mode',
      color_theme_id: 'deep-space',
    });

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('mode').textContent).toBe('system');
  });

  it('falls back to default theme when config has invalid theme ID', async () => {
    vi.mocked(window.api.readConfig).mockResolvedValue({
      appearance_mode: 'dark',
      color_theme_id: 'nonexistent-theme',
    });

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('theme-id').textContent).toBe('deep-space');
  });

  it('handles config read failure gracefully', async () => {
    vi.mocked(window.api.readConfig).mockRejectedValue(new Error('Config not found'));

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Should use defaults
    expect(screen.getByTestId('mode').textContent).toBe('system');
    expect(screen.getByTestId('theme-id').textContent).toBe('deep-space');
  });

  it('throws when useTheme is used outside ThemeProvider', () => {
    // Suppress console.error for the expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<ThemeConsumer />)).toThrow('useTheme must be used within <ThemeProvider>');

    consoleSpy.mockRestore();
  });

  it('uses functional state update to avoid stale closure', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Rapidly change both mode and theme
    await user.click(screen.getByTestId('set-dark'));
    await user.click(screen.getByTestId('set-midnight'));

    // Both changes should be applied (not overwritten by stale closure)
    expect(screen.getByTestId('mode').textContent).toBe('dark');
    expect(screen.getByTestId('theme-id').textContent).toBe('midnight');
  });
});
