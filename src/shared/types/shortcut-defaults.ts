/**
 * Keyboard Shortcut Defaults & Utilities
 *
 * Default shortcut mappings, serialization, and matching utilities.
 */

import type {
  ShortcutActionId,
  ShortcutDefinition,
  ShortcutCategory,
  KeyBinding,
  ModifierKey,
  SerializedShortcuts,
} from './shortcuts';

// ─── Default Shortcuts ───────────────────────────────────────────────

export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // Tab switching (⌘1 = Home, ⌘2–⌘9 = matrix tabs by position)
  {
    id: 'tab-1',
    label: 'Home',
    description: 'Switch to Home tab',
    category: 'tabs',
    defaultBinding: { modifiers: ['meta'], key: '1' },
  },
  {
    id: 'tab-2',
    label: 'Tab 2',
    description: 'Switch to 2nd tab',
    category: 'tabs',
    defaultBinding: { modifiers: ['meta'], key: '2' },
  },
  {
    id: 'tab-3',
    label: 'Tab 3',
    description: 'Switch to 3rd tab',
    category: 'tabs',
    defaultBinding: { modifiers: ['meta'], key: '3' },
  },
  {
    id: 'tab-4',
    label: 'Tab 4',
    description: 'Switch to 4th tab',
    category: 'tabs',
    defaultBinding: { modifiers: ['meta'], key: '4' },
  },
  {
    id: 'tab-5',
    label: 'Tab 5',
    description: 'Switch to 5th tab',
    category: 'tabs',
    defaultBinding: { modifiers: ['meta'], key: '5' },
  },
  {
    id: 'tab-6',
    label: 'Tab 6',
    description: 'Switch to 6th tab',
    category: 'tabs',
    defaultBinding: { modifiers: ['meta'], key: '6' },
  },
  {
    id: 'tab-7',
    label: 'Tab 7',
    description: 'Switch to 7th tab',
    category: 'tabs',
    defaultBinding: { modifiers: ['meta'], key: '7' },
  },
  {
    id: 'tab-8',
    label: 'Tab 8',
    description: 'Switch to 8th tab',
    category: 'tabs',
    defaultBinding: { modifiers: ['meta'], key: '8' },
  },
  {
    id: 'tab-9',
    label: 'Tab 9',
    description: 'Switch to last tab',
    category: 'tabs',
    defaultBinding: { modifiers: ['meta'], key: '9' },
  },
  // Navigation
  {
    id: 'toggle-settings',
    label: 'Open Settings',
    description: 'Toggle the Settings panel',
    category: 'navigation',
    defaultBinding: { modifiers: ['meta'], key: ',' },
  },
  {
    id: 'toggle-devtools',
    label: 'Toggle DevTools',
    description: 'Toggle the Developer Tools panel',
    category: 'navigation',
    defaultBinding: { modifiers: ['meta', 'shift'], key: 'd' },
  },
  {
    id: 'create-matrix',
    label: 'Create Matrix',
    description: 'Open the Create Matrix form',
    category: 'navigation',
    defaultBinding: { modifiers: ['meta'], key: 'n' },
  },
  // Context sidebar — Task
  {
    id: 'context-kanban',
    label: 'Kanban',
    description: 'Switch to Kanban context',
    category: 'context',
    defaultBinding: { modifiers: ['meta'], key: 'k' },
  },
  {
    id: 'context-pipeline',
    label: 'Pipeline',
    description: 'Switch to Pipeline context',
    category: 'context',
    defaultBinding: { modifiers: ['meta'], key: 'p' },
  },
  {
    id: 'context-ideation',
    label: 'Ideation',
    description: 'Switch to Ideation context',
    category: 'context',
    defaultBinding: { modifiers: ['meta'], key: 'i' },
  },
  // Context sidebar — Agent
  {
    id: 'context-ctx',
    label: 'Context',
    description: 'Switch to Agent Context view',
    category: 'context',
    defaultBinding: { modifiers: ['meta'], key: 'l' },
  },
  {
    id: 'context-console',
    label: 'Terminal',
    description: 'Switch to Terminal context',
    category: 'context',
    defaultBinding: { modifiers: ['meta'], key: 'j' },
  },
  {
    id: 'context-mcp',
    label: 'MCP',
    description: 'Switch to MCP context',
    category: 'context',
    defaultBinding: { modifiers: ['meta'], key: 'm' },
  },
  // Context sidebar — Source
  {
    id: 'context-dashboard',
    label: 'Dashboard',
    description: 'Switch to Dashboard context',
    category: 'context',
    defaultBinding: { modifiers: ['meta'], key: 's' },
  },
  {
    id: 'context-worktree',
    label: 'Worktree',
    description: 'Switch to Worktree context',
    category: 'context',
    defaultBinding: { modifiers: ['meta'], key: 't' },
  },
  {
    id: 'context-pr',
    label: 'PR',
    description: 'Switch to Pull Request context',
    category: 'context',
    defaultBinding: { modifiers: ['meta'], key: 'r' },
  },
  {
    id: 'context-issue',
    label: 'Issue',
    description: 'Switch to Issue context',
    category: 'context',
    defaultBinding: { modifiers: ['meta'], key: 'u' },
  },
];

// ─── Categories ──────────────────────────────────────────────────────

export const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    id: 'tabs',
    label: 'Tabs',
    actions: ['tab-1', 'tab-2', 'tab-3', 'tab-4', 'tab-5', 'tab-6', 'tab-7', 'tab-8', 'tab-9'],
  },
  {
    id: 'navigation',
    label: 'Navigation',
    actions: ['toggle-settings', 'toggle-devtools', 'create-matrix'],
  },
  {
    id: 'context',
    label: 'Context Panel',
    actions: [
      'context-kanban',
      'context-pipeline',
      'context-ideation',
      'context-ctx',
      'context-console',
      'context-mcp',
      'context-dashboard',
      'context-worktree',
      'context-pr',
      'context-issue',
    ],
  },
];

// ─── Serialization ───────────────────────────────────────────────────

const MODIFIER_ORDER: ModifierKey[] = ['meta', 'ctrl', 'alt', 'shift'];

/**
 * Serialize a KeyBinding to a string (e.g. "meta+shift+d")
 */
export function serializeBinding(binding: KeyBinding): string {
  const sortedMods = [...binding.modifiers].sort(
    (a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b)
  );
  return [...sortedMods, binding.key].join('+');
}

/**
 * Parse a serialized binding string back to a KeyBinding
 */
export function parseBinding(serialized: string): KeyBinding | null {
  const parts = serialized.toLowerCase().split('+');
  if (parts.length < 2) return null;

  const key = parts[parts.length - 1];
  const modifiers = parts
    .slice(0, -1)
    .filter((p): p is ModifierKey => MODIFIER_ORDER.includes(p as ModifierKey));

  if (modifiers.length === 0) return null;
  if (modifiers.length !== parts.length - 1) return null;

  return { modifiers, key };
}

// ─── Resolution ──────────────────────────────────────────────────────

/**
 * Resolve the effective binding for each action, applying overrides on top of defaults
 */
export function resolveShortcuts(
  overrides: SerializedShortcuts
): Map<ShortcutActionId, KeyBinding> {
  const result = new Map<ShortcutActionId, KeyBinding>();

  for (const def of DEFAULT_SHORTCUTS) {
    const overrideStr = overrides[def.id];
    if (overrideStr) {
      const parsed = parseBinding(overrideStr);
      if (parsed) {
        result.set(def.id, parsed);
        continue;
      }
    }
    result.set(def.id, def.defaultBinding);
  }

  return result;
}

// ─── Event Matching ──────────────────────────────────────────────────

/** Minimal keyboard event shape for cross-environment compatibility */
export interface ShortcutKeyEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

function isMacPlatform(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = (globalThis as any).navigator as { platform?: string } | undefined;
    return nav?.platform?.toUpperCase().includes('MAC') ?? true;
  } catch {
    return true;
  }
}

/**
 * Check if a keyboard event matches a binding.
 * `meta` maps to metaKey on Mac, ctrlKey on other platforms.
 */
export function eventMatchesBinding(event: ShortcutKeyEvent, binding: KeyBinding): boolean {
  const isMac = isMacPlatform();

  const wantMeta = binding.modifiers.includes('meta');
  const wantCtrl = binding.modifiers.includes('ctrl');
  const wantAlt = binding.modifiers.includes('alt');
  const wantShift = binding.modifiers.includes('shift');

  // On Mac: meta → metaKey; on other platforms: meta → ctrlKey
  const metaPressed = isMac ? event.metaKey : event.ctrlKey;
  const ctrlPressed = isMac ? event.ctrlKey : false; // separate ctrl on Mac

  if (wantMeta !== metaPressed) return false;
  if (wantCtrl !== ctrlPressed) return false;
  if (wantAlt !== event.altKey) return false;
  if (wantShift !== event.shiftKey) return false;

  return event.key.toLowerCase() === binding.key.toLowerCase();
}

// ─── Conflict Detection ─────────────────────────────────────────────

/**
 * Detect conflicting bindings (same key combo assigned to multiple actions)
 */
export function detectConflicts(
  resolved: Map<ShortcutActionId, KeyBinding>
): Map<string, ShortcutActionId[]> {
  const bySerial = new Map<string, ShortcutActionId[]>();

  for (const [actionId, binding] of resolved) {
    const serial = serializeBinding(binding);
    const existing = bySerial.get(serial) ?? [];
    existing.push(actionId);
    bySerial.set(serial, existing);
  }

  // Only return entries with conflicts (2+ actions)
  const conflicts = new Map<string, ShortcutActionId[]>();
  for (const [serial, actions] of bySerial) {
    if (actions.length > 1) {
      conflicts.set(serial, actions);
    }
  }
  return conflicts;
}

// ─── Display Formatting ─────────────────────────────────────────────

const MAC_SYMBOLS: Record<ModifierKey, string> = {
  meta: '\u2318',
  ctrl: '\u2303',
  alt: '\u2325',
  shift: '\u21E7',
};

const PC_SYMBOLS: Record<ModifierKey, string> = {
  meta: 'Ctrl',
  ctrl: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift',
};

/**
 * Format a key binding for display (e.g. "⌘H" on Mac, "Ctrl+H" on PC)
 */
export function formatBinding(binding: KeyBinding): string {
  const isMac = isMacPlatform();

  const symbols = isMac ? MAC_SYMBOLS : PC_SYMBOLS;
  const sep = isMac ? '' : '+';

  const sortedMods = [...binding.modifiers].sort(
    (a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b)
  );

  const modStr = sortedMods.map((m) => symbols[m]).join(sep);
  const keyStr = binding.key.length === 1 ? binding.key.toUpperCase() : binding.key;

  return isMac ? `${modStr}${keyStr}` : `${modStr}${sep}${keyStr}`;
}

/**
 * Get the default ShortcutDefinition for a given action ID
 */
export function getDefaultShortcut(id: ShortcutActionId): ShortcutDefinition | undefined {
  return DEFAULT_SHORTCUTS.find((s) => s.id === id);
}
