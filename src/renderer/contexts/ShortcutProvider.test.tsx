import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShortcutProvider, useShortcuts } from './ShortcutProvider';

// ─── Test helper component ────────────────────────────────────────────

function ShortcutConsumer() {
  const {
    shortcuts,
    overrides,
    setShortcut,
    resetShortcut,
    resetAllShortcuts,
    getDisplayString,
    conflicts,
    isLoading,
  } = useShortcuts();

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="shortcut-count">{shortcuts.size}</span>
      <span data-testid="override-count">{Object.keys(overrides).length}</span>
      <span data-testid="conflict-count">{conflicts.size}</span>
      <span data-testid="tab1-display">{getDisplayString('tab-1')}</span>
      <span data-testid="kanban-display">{getDisplayString('context-kanban')}</span>
      <button
        data-testid="set-custom"
        onClick={() => setShortcut('tab-1', { modifiers: ['meta', 'shift'], key: '1' })}
      >
        Custom
      </button>
      <button data-testid="reset-tab1" onClick={() => resetShortcut('tab-1')}>
        Reset
      </button>
      <button data-testid="reset-all" onClick={() => resetAllShortcuts()}>
        Reset All
      </button>
    </div>
  );
}

// ─── Setup ────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(window.api.readConfig).mockResolvedValue({
    onboarding_completed: true,
  });
  vi.mocked(window.api.writeConfig).mockResolvedValue({ success: true });

  localStorage.clear();

  vi.stubGlobal('navigator', { platform: 'MacIntel' });
});

// ─── Tests ────────────────────────────────────────────────────────────

describe('ShortcutProvider', () => {
  it('provides default shortcuts', async () => {
    render(
      <ShortcutProvider>
        <ShortcutConsumer />
      </ShortcutProvider>
    );

    expect(screen.getByTestId('shortcut-count').textContent).toBe('22');
    expect(screen.getByTestId('override-count').textContent).toBe('0');
    expect(screen.getByTestId('conflict-count').textContent).toBe('0');
  });

  it('displays correct default binding strings', async () => {
    render(
      <ShortcutProvider>
        <ShortcutConsumer />
      </ShortcutProvider>
    );

    // ⌘1 for tab-1 on Mac
    expect(screen.getByTestId('tab1-display').textContent).toBe('\u23181');
    // ⌘K for context-kanban on Mac
    expect(screen.getByTestId('kanban-display').textContent).toBe('\u2318K');
  });

  it('loads overrides from config', async () => {
    vi.mocked(window.api.readConfig).mockResolvedValue({
      onboarding_completed: true,
      keyboard_shortcuts: {
        'tab-1': 'meta+shift+1',
      },
    });

    render(
      <ShortcutProvider>
        <ShortcutConsumer />
      </ShortcutProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('override-count').textContent).toBe('1');
    });

    expect(screen.getByTestId('tab1-display').textContent).toBe('\u2318\u21E71');
  });

  it('sets a custom shortcut and persists', async () => {
    const user = userEvent.setup();
    render(
      <ShortcutProvider>
        <ShortcutConsumer />
      </ShortcutProvider>
    );

    await user.click(screen.getByTestId('set-custom'));

    expect(screen.getByTestId('override-count').textContent).toBe('1');
    expect(screen.getByTestId('tab1-display').textContent).toBe('\u2318\u21E71');

    expect(window.api.writeConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        keyboard_shortcuts: { 'tab-1': 'meta+shift+1' },
      })
    );
  });

  it('resets a single shortcut', async () => {
    const user = userEvent.setup();
    render(
      <ShortcutProvider>
        <ShortcutConsumer />
      </ShortcutProvider>
    );

    // Set custom, then reset
    await user.click(screen.getByTestId('set-custom'));
    expect(screen.getByTestId('override-count').textContent).toBe('1');

    await user.click(screen.getByTestId('reset-tab1'));
    expect(screen.getByTestId('override-count').textContent).toBe('0');
    expect(screen.getByTestId('tab1-display').textContent).toBe('\u23181');
  });

  it('resets all shortcuts', async () => {
    const user = userEvent.setup();
    render(
      <ShortcutProvider>
        <ShortcutConsumer />
      </ShortcutProvider>
    );

    await user.click(screen.getByTestId('set-custom'));
    expect(screen.getByTestId('override-count').textContent).toBe('1');

    await user.click(screen.getByTestId('reset-all'));
    expect(screen.getByTestId('override-count').textContent).toBe('0');
  });

  it('uses localStorage cache for instant load', () => {
    localStorage.setItem('matrix-shortcuts', JSON.stringify({ 'tab-1': 'meta+shift+1' }));

    render(
      <ShortcutProvider>
        <ShortcutConsumer />
      </ShortcutProvider>
    );

    // Should immediately reflect cached overrides
    expect(screen.getByTestId('override-count').textContent).toBe('1');
    expect(screen.getByTestId('tab1-display').textContent).toBe('\u2318\u21E71');
  });

  it('throws when useShortcuts is used outside ShortcutProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ShortcutConsumer />)).toThrow(
      'useShortcuts must be used within <ShortcutProvider>'
    );
    consoleSpy.mockRestore();
  });

  it('registers and invokes action handlers via keydown', async () => {
    const handler = vi.fn();

    function HandlerConsumer() {
      const { registerAction } = useShortcuts();
      React.useEffect(() => {
        return registerAction('tab-1', handler);
      }, [registerAction]);
      return <div data-testid="handler-consumer" />;
    }

    // Need React import for the HandlerConsumer
    const React = await import('react');

    render(
      <ShortcutProvider>
        <HandlerConsumer />
      </ShortcutProvider>
    );

    // Simulate ⌘1 keydown
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: '1',
          metaKey: true,
          bubbles: true,
        })
      );
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('skips shortcuts when focused on input', async () => {
    const handler = vi.fn();

    function HandlerConsumer() {
      const { registerAction } = useShortcuts();
      React.useEffect(() => {
        return registerAction('tab-1', handler);
      }, [registerAction]);
      return <input data-testid="text-input" />;
    }

    const React = await import('react');

    render(
      <ShortcutProvider>
        <HandlerConsumer />
      </ShortcutProvider>
    );

    const input = screen.getByTestId('text-input');
    input.focus();

    act(() => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: '1',
          metaKey: true,
          bubbles: true,
        })
      );
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('detects conflicts when overrides create duplicates', async () => {
    const user = userEvent.setup();

    function ConflictConsumer() {
      const { setShortcut, conflicts } = useShortcuts();
      return (
        <div>
          <span data-testid="conflict-count">{conflicts.size}</span>
          <button
            data-testid="create-conflict"
            onClick={() => setShortcut('context-kanban', { modifiers: ['meta'], key: '1' })}
          >
            Conflict
          </button>
        </div>
      );
    }

    render(
      <ShortcutProvider>
        <ConflictConsumer />
      </ShortcutProvider>
    );

    expect(screen.getByTestId('conflict-count').textContent).toBe('0');

    // Set context-kanban to meta+1 (same as tab-1 default)
    await user.click(screen.getByTestId('create-conflict'));
    expect(screen.getByTestId('conflict-count').textContent).toBe('1');
  });
});
