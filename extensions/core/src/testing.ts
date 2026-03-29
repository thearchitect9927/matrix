import type { MatrixBrowserAPI, MatrixNodeAPI, ExtensionContext } from './types';
import type { SidebarContribution } from './manifest';
import { toDisposable } from './disposable';
import type { ComponentType } from 'react';

/**
 * Create a mock BrowserAPI for testing Extension browser/frontend.ts
 */
export function createMockBrowserAPI(): MatrixBrowserAPI & {
  _registered: {
    views: Map<string, ComponentType<Record<string, unknown>>>;
    commands: Map<string, (...args: unknown[]) => unknown>;
    sidebarItems: SidebarContribution[];
    events: Map<string, Set<(...args: unknown[]) => void>>;
  };
} {
  const views = new Map<string, ComponentType<Record<string, unknown>>>();
  const commands = new Map<string, (...args: unknown[]) => unknown>();
  const sidebarItems: SidebarContribution[] = [];
  const events = new Map<string, Set<(...args: unknown[]) => void>>();
  const storage = new Map<string, unknown>();

  return {
    _registered: { views, commands, sidebarItems, events },

    views: {
      register(viewId, component) {
        views.set(viewId, component);
      },
      open() {},
      close() {},
    },

    sidebar: {
      register(item) {
        sidebarItems.push(item);
      },
      onSelect(_itemId, _handler) {
        return toDisposable(() => {});
      },
      setBadge() {},
    },

    commands: {
      register(commandId, handler) {
        commands.set(commandId, handler);
        return toDisposable(() => commands.delete(commandId));
      },
      async execute<T = unknown>(commandId: string, ...args: unknown[]): Promise<T> {
        const handler = commands.get(commandId);
        if (!handler) throw new Error(`Command not found: ${commandId}`);
        return (await handler(...args)) as T;
      },
    },

    events: {
      on(event, handler) {
        if (!events.has(event)) events.set(event, new Set());
        events.get(event)!.add(handler);
        return toDisposable(() => events.get(event)?.delete(handler));
      },
      emit(event, ...args) {
        const handlers = events.get(event);
        if (handlers) for (const h of handlers) h(...args);
      },
    },

    storage: {
      get<T>(key: string) {
        return storage.get(key) as T | undefined;
      },
      set(key, value) {
        storage.set(key, value);
      },
    },
  };
}

/**
 * Create a mock NodeAPI for testing Extension node/backend.ts
 */
export function createMockNodeAPI(): MatrixNodeAPI {
  const storage = new Map<string, unknown>();

  return {
    commands: {
      register() {
        return toDisposable(() => {});
      },
      async execute<T = unknown>(): Promise<T> {
        throw new Error('Not implemented in mock');
      },
    },
    events: {
      on() {
        return toDisposable(() => {});
      },
      emit() {},
    },
    storage: {
      get<T>(key: string) {
        return storage.get(key) as T | undefined;
      },
      set(key, value) {
        storage.set(key, value);
      },
    },
    fs: {
      async readFile() {
        return '';
      },
      async writeFile() {},
      async mkdir() {},
      async readdir() {
        return [];
      },
      async exists() {
        return false;
      },
      async remove() {},
      async readJSON<T = unknown>(): Promise<T> {
        return {} as T;
      },
      async writeJSON() {},
    },
    git: {
      async clone() {},
      async worktreeAdd() {},
      async worktreeRemove() {},
      async worktreeList() {
        return [];
      },
      async branchList() {
        return [];
      },
      async status() {
        return { branch: 'main', ahead: 0, behind: 0, staged: [], modified: [], untracked: [] };
      },
    },
    shell: {
      async exec() {
        return { stdout: '', stderr: '', exitCode: 0 };
      },
    },
  };
}

/**
 * Create a mock ExtensionContext for testing
 */
export function createMockContext(extensionId: string = 'test:extension'): ExtensionContext {
  return {
    extensionId,
    extensionPath: `/mock/extensions/${extensionId}`,
    subscriptions: [],
  };
}
