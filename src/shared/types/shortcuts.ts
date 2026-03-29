/**
 * Keyboard Shortcut Type Definitions
 *
 * Type definitions for the centralized keyboard shortcut system.
 */

/**
 * All available shortcut action identifiers
 */
export type ShortcutActionId =
  // Tab switching (⌘1 = Home, ⌘2 = first matrix, …)
  | 'tab-1'
  | 'tab-2'
  | 'tab-3'
  | 'tab-4'
  | 'tab-5'
  | 'tab-6'
  | 'tab-7'
  | 'tab-8'
  | 'tab-9'
  // Navigation
  | 'toggle-settings'
  | 'toggle-devtools'
  | 'create-matrix'
  // Context sidebar — Task
  | 'context-kanban'
  | 'context-pipeline'
  | 'context-ideation'
  // Context sidebar — Agent
  | 'context-ctx'
  | 'context-console'
  | 'context-mcp'
  // Context sidebar — Source
  | 'context-dashboard'
  | 'context-worktree'
  | 'context-pr'
  | 'context-issue';

/**
 * Modifier keys for shortcuts
 */
export type ModifierKey = 'meta' | 'ctrl' | 'alt' | 'shift';

/**
 * A single key binding (e.g. meta+shift+d)
 */
export interface KeyBinding {
  /** Modifier keys required */
  modifiers: ModifierKey[];
  /** The main key (lowercase, e.g. 'h', '1', ',') */
  key: string;
}

/**
 * Full shortcut definition with metadata
 */
export interface ShortcutDefinition {
  /** Unique action identifier */
  id: ShortcutActionId;
  /** Display label */
  label: string;
  /** Short description */
  description: string;
  /** Category for grouping in settings UI */
  category: string;
  /** Default key binding */
  defaultBinding: KeyBinding;
}

/**
 * Shortcut category for settings UI grouping
 */
export interface ShortcutCategory {
  id: string;
  label: string;
  actions: ShortcutActionId[];
}

/**
 * Serialized shortcut overrides stored in config
 * Maps action ID → serialized binding string (e.g. "meta+shift+d")
 */
export type SerializedShortcuts = Record<string, string>;
