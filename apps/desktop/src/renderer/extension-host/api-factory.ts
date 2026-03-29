import type { MatrixBrowserAPI, ExtensionContext } from '@matrix/core';
import { ExtensionRegistry } from './registry';

/**
 * Extension별로 scoped된 BrowserAPI 인스턴스를 생성한다.
 * 각 Extension은 자신의 API를 통해서만 Registry와 소통.
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
        // manifest 외에 동적으로 추가할 때
        const manifest = registry.getManifest(extensionId);
        if (manifest) {
          if (!manifest.contributions.sidebar) manifest.contributions.sidebar = [];
          manifest.contributions.sidebar.push(item);
        }
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
