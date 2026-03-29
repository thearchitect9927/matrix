import type { ComponentType } from 'react';
import type { Manifest, SidebarContribution, ViewContribution, Disposable } from '@matrix/core';
import { toDisposable } from '@matrix/core';

export interface RegisteredSidebarItem extends SidebarContribution {
  extensionId: string;
}

export interface RegisteredView extends ViewContribution {
  extensionId: string;
}

type CommandHandler = (...args: unknown[]) => unknown;

/**
 * Extension Registry — manifest contributions와 activate() 결과를 관리
 *
 * 라이프사이클:
 * 1. 앱 시작 → registerManifest() (sidebar/view/command contributions 수집)
 * 2. Shell이 getSidebarItems()로 사이드바 렌더링 (activate 불필요)
 * 3. 사용자 클릭 → ensureActivated() → activate()에서 registerView() 호출
 * 4. Shell이 getViewComponent()로 실제 React 컴포넌트 가져와서 렌더링
 */
export class ExtensionRegistry {
  private manifests = new Map<string, Manifest>();
  private viewComponents = new Map<string, ComponentType<Record<string, unknown>>>();
  private commandHandlers = new Map<string, CommandHandler>();
  private activatedExtensions = new Set<string>();
  private sidebarSelectHandlers = new Map<string, Set<() => void>>();
  private badgeCounts = new Map<string, number>();
  private eventHandlers = new Map<string, Set<(...args: unknown[]) => void>>();
  private storageData = new Map<string, Map<string, unknown>>();

  // --- Manifest Registration (앱 시작 시) ---

  registerManifest(manifest: Manifest): void {
    this.manifests.set(manifest.id, manifest);
  }

  getManifest(extensionId: string): Manifest | undefined {
    return this.manifests.get(extensionId);
  }

  getAllManifests(): Manifest[] {
    return Array.from(this.manifests.values());
  }

  // --- Sidebar Contributions ---

  getSidebarItems(): RegisteredSidebarItem[] {
    const items: RegisteredSidebarItem[] = [];
    for (const manifest of this.manifests.values()) {
      for (const item of manifest.contributions.sidebar ?? []) {
        items.push({ ...item, extensionId: manifest.id });
      }
    }
    return items.sort((a, b) => a.order - b.order);
  }

  // --- View Contributions ---

  getViewContributions(): RegisteredView[] {
    const views: RegisteredView[] = [];
    for (const manifest of this.manifests.values()) {
      for (const view of manifest.contributions.views ?? []) {
        views.push({ ...view, extensionId: manifest.id });
      }
    }
    return views;
  }

  registerView(viewId: string, component: ComponentType<Record<string, unknown>>): void {
    this.viewComponents.set(viewId, component);
  }

  getViewComponent(viewId: string): ComponentType<Record<string, unknown>> | undefined {
    return this.viewComponents.get(viewId);
  }

  // --- Commands ---

  registerCommand(commandId: string, handler: CommandHandler): Disposable {
    this.commandHandlers.set(commandId, handler);
    return toDisposable(() => this.commandHandlers.delete(commandId));
  }

  async executeCommand<T = unknown>(commandId: string, ...args: unknown[]): Promise<T> {
    const handler = this.commandHandlers.get(commandId);
    if (!handler) throw new Error(`Command not found: ${commandId}`);
    return (await handler(...args)) as T;
  }

  // --- Activation ---

  isActivated(extensionId: string): boolean {
    return this.activatedExtensions.has(extensionId);
  }

  markActivated(extensionId: string): void {
    this.activatedExtensions.add(extensionId);
  }

  // --- Sidebar Select Events ---

  onSidebarSelect(itemId: string, handler: () => void): Disposable {
    if (!this.sidebarSelectHandlers.has(itemId)) {
      this.sidebarSelectHandlers.set(itemId, new Set());
    }
    this.sidebarSelectHandlers.get(itemId)!.add(handler);
    return toDisposable(() => this.sidebarSelectHandlers.get(itemId)?.delete(handler));
  }

  fireSidebarSelect(itemId: string): void {
    const handlers = this.sidebarSelectHandlers.get(itemId);
    if (handlers) {
      for (const handler of handlers) handler();
    }
  }

  // --- Badges ---

  setBadge(itemId: string, count: number): void {
    this.badgeCounts.set(itemId, count);
  }

  getBadge(itemId: string): number {
    return this.badgeCounts.get(itemId) ?? 0;
  }

  // --- Events ---

  onEvent(event: string, handler: (...args: unknown[]) => void): Disposable {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    return toDisposable(() => this.eventHandlers.get(event)?.delete(handler));
  }

  emitEvent(event: string, ...args: unknown[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) handler(...args);
    }
  }

  // --- Storage ---

  getStorage<T>(extensionId: string, key: string): T | undefined {
    return this.storageData.get(extensionId)?.get(key) as T | undefined;
  }

  setStorage(extensionId: string, key: string, value: unknown): void {
    if (!this.storageData.has(extensionId)) {
      this.storageData.set(extensionId, new Map());
    }
    this.storageData.get(extensionId)!.set(key, value);
  }
}
