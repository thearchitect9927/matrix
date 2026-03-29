import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  serializeBinding,
  parseBinding,
  resolveShortcuts,
  eventMatchesBinding,
  detectConflicts,
  formatBinding,
  DEFAULT_SHORTCUTS,
  SHORTCUT_CATEGORIES,
  getDefaultShortcut,
  type ShortcutKeyEvent,
} from './shortcut-defaults';
import type { KeyBinding, SerializedShortcuts } from './shortcuts';

describe('shortcut-defaults', () => {
  describe('serializeBinding', () => {
    it('serializes a simple binding', () => {
      const binding: KeyBinding = { modifiers: ['meta'], key: 'h' };
      expect(serializeBinding(binding)).toBe('meta+h');
    });

    it('sorts modifiers in canonical order', () => {
      const binding: KeyBinding = { modifiers: ['shift', 'meta'], key: 'd' };
      expect(serializeBinding(binding)).toBe('meta+shift+d');
    });

    it('handles multiple modifiers', () => {
      const binding: KeyBinding = { modifiers: ['alt', 'meta', 'shift'], key: 'x' };
      expect(serializeBinding(binding)).toBe('meta+alt+shift+x');
    });
  });

  describe('parseBinding', () => {
    it('parses a simple binding', () => {
      expect(parseBinding('meta+h')).toEqual({ modifiers: ['meta'], key: 'h' });
    });

    it('parses multiple modifiers', () => {
      expect(parseBinding('meta+shift+d')).toEqual({
        modifiers: ['meta', 'shift'],
        key: 'd',
      });
    });

    it('returns null for bare key (no modifier)', () => {
      expect(parseBinding('h')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseBinding('')).toBeNull();
    });

    it('returns null for invalid modifier', () => {
      expect(parseBinding('super+h')).toBeNull();
    });

    it('is case-insensitive', () => {
      expect(parseBinding('META+H')).toEqual({ modifiers: ['meta'], key: 'h' });
    });
  });

  describe('resolveShortcuts', () => {
    it('returns all defaults with no overrides', () => {
      const resolved = resolveShortcuts({});
      expect(resolved.size).toBe(DEFAULT_SHORTCUTS.length);

      for (const def of DEFAULT_SHORTCUTS) {
        expect(resolved.get(def.id)).toEqual(def.defaultBinding);
      }
    });

    it('applies valid overrides', () => {
      const overrides: SerializedShortcuts = {
        'tab-1': 'meta+shift+1',
      };
      const resolved = resolveShortcuts(overrides);
      expect(resolved.get('tab-1')).toEqual({
        modifiers: ['meta', 'shift'],
        key: '1',
      });
    });

    it('falls back to default for invalid override', () => {
      const overrides: SerializedShortcuts = {
        'tab-1': 'invalid',
      };
      const resolved = resolveShortcuts(overrides);
      expect(resolved.get('tab-1')).toEqual(
        DEFAULT_SHORTCUTS.find((s) => s.id === 'tab-1')!.defaultBinding
      );
    });
  });

  describe('eventMatchesBinding', () => {
    let mockNavigator: { platform: string };

    beforeEach(() => {
      mockNavigator = { platform: 'MacIntel' };
      vi.stubGlobal('navigator', mockNavigator);
    });

    function makeEvent(overrides: Partial<ShortcutKeyEvent>): ShortcutKeyEvent {
      return {
        key: '',
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        ...overrides,
      };
    }

    it('matches meta+s on Mac (metaKey)', () => {
      const binding: KeyBinding = { modifiers: ['meta'], key: 's' };
      const event = makeEvent({ key: 's', metaKey: true });
      expect(eventMatchesBinding(event, binding)).toBe(true);
    });

    it('does not match when wrong modifier', () => {
      const binding: KeyBinding = { modifiers: ['meta'], key: 's' };
      const event = makeEvent({ key: 's', ctrlKey: true });
      expect(eventMatchesBinding(event, binding)).toBe(false);
    });

    it('does not match when extra modifier pressed', () => {
      const binding: KeyBinding = { modifiers: ['meta'], key: 's' };
      const event = makeEvent({ key: 's', metaKey: true, shiftKey: true });
      expect(eventMatchesBinding(event, binding)).toBe(false);
    });

    it('matches meta+shift+d', () => {
      const binding: KeyBinding = { modifiers: ['meta', 'shift'], key: 'd' };
      const event = makeEvent({ key: 'd', metaKey: true, shiftKey: true });
      expect(eventMatchesBinding(event, binding)).toBe(true);
    });

    it('matches meta on Windows using ctrlKey', () => {
      mockNavigator.platform = 'Win32';
      const binding: KeyBinding = { modifiers: ['meta'], key: 's' };
      const event = makeEvent({ key: 's', ctrlKey: true });
      expect(eventMatchesBinding(event, binding)).toBe(true);
    });

    it('is case-insensitive on key', () => {
      const binding: KeyBinding = { modifiers: ['meta'], key: 's' };
      const event = makeEvent({ key: 'S', metaKey: true });
      expect(eventMatchesBinding(event, binding)).toBe(true);
    });

    it('matches number keys for tab shortcuts', () => {
      const binding: KeyBinding = { modifiers: ['meta'], key: '1' };
      const event = makeEvent({ key: '1', metaKey: true });
      expect(eventMatchesBinding(event, binding)).toBe(true);
    });
  });

  describe('detectConflicts', () => {
    it('returns empty map when no conflicts', () => {
      const resolved = resolveShortcuts({});
      const conflicts = detectConflicts(resolved);
      expect(conflicts.size).toBe(0);
    });

    it('detects conflicts when two actions share the same binding', () => {
      // Override context-kanban to same as tab-1 (meta+1)
      const overrides: SerializedShortcuts = {
        'context-kanban': 'meta+1',
      };
      const resolved = resolveShortcuts(overrides);
      const conflicts = detectConflicts(resolved);

      expect(conflicts.size).toBe(1);
      const conflicting = conflicts.get('meta+1');
      expect(conflicting).toBeDefined();
      expect(conflicting).toContain('tab-1');
      expect(conflicting).toContain('context-kanban');
    });
  });

  describe('formatBinding', () => {
    beforeEach(() => {
      vi.stubGlobal('navigator', { platform: 'MacIntel' });
    });

    it('formats meta+s as ⌘S on Mac', () => {
      const binding: KeyBinding = { modifiers: ['meta'], key: 's' };
      expect(formatBinding(binding)).toBe('\u2318S');
    });

    it('formats meta+shift+d on Mac', () => {
      const binding: KeyBinding = { modifiers: ['meta', 'shift'], key: 'd' };
      expect(formatBinding(binding)).toBe('\u2318\u21E7D');
    });

    it('formats meta+, on Mac', () => {
      const binding: KeyBinding = { modifiers: ['meta'], key: ',' };
      expect(formatBinding(binding)).toBe('\u2318,');
    });

    it('formats number keys', () => {
      const binding: KeyBinding = { modifiers: ['meta'], key: '1' };
      expect(formatBinding(binding)).toBe('\u23181');
    });
  });

  describe('DEFAULT_SHORTCUTS', () => {
    it('has 22 shortcuts defined (9 tabs + 3 nav + 10 context)', () => {
      expect(DEFAULT_SHORTCUTS).toHaveLength(22);
    });

    it('all actions are covered by categories', () => {
      const categoryActions = SHORTCUT_CATEGORIES.flatMap((c) => c.actions);
      const defaultActions = DEFAULT_SHORTCUTS.map((s) => s.id);
      expect(categoryActions.sort()).toEqual(defaultActions.sort());
    });
  });

  describe('getDefaultShortcut', () => {
    it('returns a definition for known action', () => {
      const def = getDefaultShortcut('tab-1');
      expect(def).toBeDefined();
      expect(def!.id).toBe('tab-1');
    });

    it('returns undefined for unknown action', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(getDefaultShortcut('nonexistent' as any)).toBeUndefined();
    });
  });
});
