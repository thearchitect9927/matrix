import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type { ShortcutActionId, KeyBinding, SerializedShortcuts } from '@shared/types/shortcuts';
import {
  resolveShortcuts,
  eventMatchesBinding,
  detectConflicts,
  serializeBinding,
  formatBinding,
  parseBinding,
} from '@shared/types/shortcut-defaults';

// ─── Types ────────────────────────────────────────────────────────────

type ActionHandler = () => void;

interface ShortcutContextValue {
  /** Resolved bindings (defaults + overrides) */
  shortcuts: Map<ShortcutActionId, KeyBinding>;
  /** User overrides only */
  overrides: SerializedShortcuts;
  /** Set a custom binding for an action */
  setShortcut: (actionId: ShortcutActionId, binding: KeyBinding) => void;
  /** Reset a single action to its default */
  resetShortcut: (actionId: ShortcutActionId) => void;
  /** Reset all overrides */
  resetAllShortcuts: () => void;
  /** Get display string for an action (e.g. "⌘H") */
  getDisplayString: (actionId: ShortcutActionId) => string;
  /** Register a handler for an action; returns unregister function */
  registerAction: (actionId: ShortcutActionId, handler: ActionHandler) => () => void;
  /** Detected binding conflicts */
  conflicts: Map<string, ShortcutActionId[]>;
  /** Whether initial config load is in progress */
  isLoading: boolean;
}

const ShortcutContext = createContext<ShortcutContextValue | undefined>(undefined);

// ─── LocalStorage cache ──────────────────────────────────────────────

const LS_KEY = 'matrix-shortcuts';

function readCache(): SerializedShortcuts | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SerializedShortcuts;
  } catch {
    return null;
  }
}

function writeCache(overrides: SerializedShortcuts): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(overrides));
  } catch {
    // localStorage unavailable
  }
}

// ─── Provider ─────────────────────────────────────────────────────────

export function ShortcutProvider({ children }: { children: React.ReactNode }) {
  const cached = useMemo(() => readCache(), []);
  const [overrides, setOverrides] = useState<SerializedShortcuts>(cached ?? {});
  const [isLoading, setIsLoading] = useState(true);

  // Handler registry: ref-based to avoid re-renders
  const handlersRef = useRef<Map<ShortcutActionId, ActionHandler>>(new Map());

  // Resolve shortcuts (defaults + overrides)
  const shortcuts = useMemo(() => resolveShortcuts(overrides), [overrides]);
  const conflicts = useMemo(() => detectConflicts(shortcuts), [shortcuts]);

  // ── Load overrides from config on mount ──
  useEffect(() => {
    (async () => {
      try {
        const config = await window.api.readConfig();
        const saved = config.keyboard_shortcuts as SerializedShortcuts | undefined;
        if (saved && typeof saved === 'object') {
          setOverrides((prev) => {
            // Only update if different
            const prevStr = JSON.stringify(prev);
            const savedStr = JSON.stringify(saved);
            if (prevStr === savedStr) return prev;
            return saved;
          });
          writeCache(saved);
        }
      } catch {
        // Use defaults / cached
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Persist overrides to config + cache ──
  const persistOverrides = useCallback((next: SerializedShortcuts) => {
    writeCache(next);
    window.api.writeConfig({ keyboard_shortcuts: next }).catch(() => {});
  }, []);

  const setShortcut = useCallback(
    (actionId: ShortcutActionId, binding: KeyBinding) => {
      setOverrides((prev) => {
        const next = { ...prev, [actionId]: serializeBinding(binding) };
        persistOverrides(next);
        return next;
      });
    },
    [persistOverrides]
  );

  const resetShortcut = useCallback(
    (actionId: ShortcutActionId) => {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[actionId];
        persistOverrides(next);
        return next;
      });
    },
    [persistOverrides]
  );

  const resetAllShortcuts = useCallback(() => {
    const next: SerializedShortcuts = {};
    setOverrides(next);
    persistOverrides(next);
  }, [persistOverrides]);

  const getDisplayString = useCallback(
    (actionId: ShortcutActionId): string => {
      const binding = shortcuts.get(actionId);
      if (!binding) return '';
      return formatBinding(binding);
    },
    [shortcuts]
  );

  const registerAction = useCallback(
    (actionId: ShortcutActionId, handler: ActionHandler): (() => void) => {
      handlersRef.current.set(actionId, handler);
      return () => {
        // Only delete if this exact handler is still registered
        if (handlersRef.current.get(actionId) === handler) {
          handlersRef.current.delete(actionId);
        }
      };
    },
    []
  );

  // ── Global keydown listener (capture phase) ──
  // Use a ref for shortcuts so the listener doesn't need to re-bind
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if focused on text input
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const currentShortcuts = shortcutsRef.current;
      for (const [actionId, binding] of currentShortcuts) {
        if (eventMatchesBinding(event, binding)) {
          const handler = handlersRef.current.get(actionId);
          if (handler) {
            event.preventDefault();
            event.stopPropagation();
            handler();
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const value = useMemo<ShortcutContextValue>(
    () => ({
      shortcuts,
      overrides,
      setShortcut,
      resetShortcut,
      resetAllShortcuts,
      getDisplayString,
      registerAction,
      conflicts,
      isLoading,
    }),
    [
      shortcuts,
      overrides,
      setShortcut,
      resetShortcut,
      resetAllShortcuts,
      getDisplayString,
      registerAction,
      conflicts,
      isLoading,
    ]
  );

  return <ShortcutContext.Provider value={value}>{children}</ShortcutContext.Provider>;
}

/**
 * Hook to access shortcut context. Must be used within ShortcutProvider.
 */
export function useShortcuts(): ShortcutContextValue {
  const ctx = useContext(ShortcutContext);
  if (!ctx) throw new Error('useShortcuts must be used within <ShortcutProvider>');
  return ctx;
}

/**
 * Re-export parseBinding for use in settings UI
 */
export { parseBinding };
