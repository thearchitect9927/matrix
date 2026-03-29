import type { MatrixBrowserAPI, ExtensionContext } from '@matrix/core';
import { ExtensionRegistry } from './registry';

/**
 * Creates a scoped BrowserAPI instance for each Extension.
 * Each Extension communicates with the Registry only through its own API.
 */
export function createBrowserAPI(
  extensionId: string,
  registry: ExtensionRegistry
): MatrixBrowserAPI {
  return {
    views: {
      register(viewId, component) {
        registry.registerView(viewId, component);
      },
      open(viewId, props) {
        registry.emitEvent('view:open', viewId, props);
      },
      close(viewId) {
        registry.emitEvent('view:close', viewId);
      },
    },

    sidebar: {
      register(item) {
        registry.registerDynamicSidebarItem({ ...item, extensionId });
      },
      onSelect(itemId, handler) {
        return registry.onSidebarSelect(itemId, handler);
      },
      setBadge(itemId, count) {
        registry.setBadge(itemId, count);
      },
    },

    commands: {
      register(commandId, handler) {
        return registry.registerCommand(commandId, handler);
      },
      execute(commandId, ...args) {
        return registry.executeCommand(commandId, ...args);
      },
    },

    events: {
      on(event, handler) {
        return registry.onEvent(event, handler);
      },
      emit(event, ...args) {
        registry.emitEvent(event, ...args);
      },
    },

    storage: {
      get<T>(key: string) {
        return registry.getStorage<T>(extensionId, key);
      },
      set(key, value) {
        registry.setStorage(extensionId, key, value);
      },
    },
  };
}

export function createExtensionContext(
  extensionId: string,
  extensionPath: string
): ExtensionContext {
  return {
    extensionId,
    extensionPath,
    subscriptions: [],
  };
}
