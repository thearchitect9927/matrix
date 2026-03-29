import { createContext, useContext, useSyncExternalStore } from 'react';
import type { ComponentType } from 'react';
import type { BrowserExtensionHost } from './browser-extension-host';
import type { RegisteredSidebarItem } from './registry';

// --- Extension Host Context ---

export const ExtensionHostContext = createContext<BrowserExtensionHost | null>(null);

export function useExtensionHost(): BrowserExtensionHost {
  const host = useContext(ExtensionHostContext);
  if (!host) throw new Error('useExtensionHost must be used within ExtensionHostContext.Provider');
  return host;
}

export function useExtensionRegistry() {
  const host = useExtensionHost();
  return host.registry;
}

// --- Sidebar Items ---

export function useSidebarItems(): RegisteredSidebarItem[] {
  const registry = useExtensionRegistry();
  return registry.getSidebarItems();
}

// --- Active View ---

interface ActiveViewState {
  viewId: string | null;
  props: Record<string, unknown>;
}

let activeViewState: ActiveViewState = { viewId: null, props: {} };
const activeViewListeners = new Set<() => void>();

function notifyActiveViewChange() {
  for (const listener of activeViewListeners) listener();
}

export function setActiveView(viewId: string, props: Record<string, unknown> = {}): void {
  activeViewState = { viewId, props };
  notifyActiveViewChange();
}

export function useActiveView() {
  const state = useSyncExternalStore(
    (callback) => {
      activeViewListeners.add(callback);
      return () => activeViewListeners.delete(callback);
    },
    () => activeViewState
  );

  return {
    activeViewId: state.viewId,
    activeViewProps: state.props,
  };
}

export function useViewComponent(
  viewId: string | null
): ComponentType<Record<string, unknown>> | null {
  const registry = useExtensionRegistry();
  if (!viewId) return null;
  return registry.getViewComponent(viewId) ?? null;
}
