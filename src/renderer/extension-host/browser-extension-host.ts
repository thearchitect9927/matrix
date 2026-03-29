import type { BrowserExtensionModule, ExtensionInfo } from '@matrix/core';
import { ExtensionRegistry } from './registry';
import { createBrowserAPI, createExtensionContext } from './api-factory';

/**
 * BrowserExtensionHost — Manages Extensions in the renderer process.
 *
 * 1. Collect manifests and register them in the Registry
 * 2. Load Extension modules (without activating yet)
 * 3. Lazy activate on demand
 */
export class BrowserExtensionHost {
  readonly registry = new ExtensionRegistry();
  private frontends = new Map<string, BrowserExtensionModule>();
  private extensions = new Map<string, ExtensionInfo>();
  private activationPromises = new Map<string, Promise<void>>();

  /**
   * Called at app start — registers manifests and loads modules.
   */
  async initialize(extensions: ExtensionInfo[]): Promise<void> {
    // 1. Register manifests
    for (const ext of extensions) {
      this.extensions.set(ext.manifest.id, ext);
      this.registry.registerManifest(ext.manifest);
    }

    // 2. Load builtin Extension modules
    for (const ext of extensions) {
      if (ext.builtin) {
        try {
          const frontend = await this.loadBuiltinModule(ext.packageName);
          if (frontend) {
            this.frontends.set(ext.manifest.id, frontend);
          }
        } catch (err) {
          console.error(`Failed to load browser module for ${ext.manifest.id}:`, err);
        }
      }
    }

    // 3. Immediately activate Extensions with activationEvents: ["*"]
    for (const ext of extensions) {
      if (ext.manifest.activationEvents?.includes('*')) {
        await this.activate(ext.manifest.id);
      }
    }
  }

  /**
   * Extension activate (lazy)
   */
  async activate(extensionId: string): Promise<void> {
    if (this.registry.isActivated(extensionId)) return;
    if (this.activationPromises.has(extensionId)) {
      return this.activationPromises.get(extensionId);
    }

    const promise = this.doActivate(extensionId);
    this.activationPromises.set(extensionId, promise);

    try {
      await promise;
    } finally {
      this.activationPromises.delete(extensionId);
    }
  }

  private async doActivate(extensionId: string): Promise<void> {
    const frontend = this.frontends.get(extensionId);
    if (frontend?.activate) {
      const ext = this.extensions.get(extensionId);
      const api = createBrowserAPI(extensionId, this.registry);
      const context = createExtensionContext(extensionId, ext?.path ?? '');

      await frontend.activate(api, context);
    }

    this.registry.markActivated(extensionId);
  }

  async ensureActivated(extensionId: string): Promise<void> {
    if (!this.registry.isActivated(extensionId)) {
      await this.activate(extensionId);
    }
  }

  private async loadBuiltinModule(packageName: string): Promise<BrowserExtensionModule | null> {
    // Builtin Extensions are known at build time, so use dynamic import.
    // Each Extension is explicitly registered so Vite can bundle this pattern.
    const moduleMap: Record<string, () => Promise<BrowserExtensionModule>> = {
      '@matrix/hello-world': () => import('@matrix/hello-world/src/browser/frontend'),
      '@matrix/workspace': () => import('@matrix/workspace/src/browser/frontend'),
      '@matrix/terminal': () => import('@matrix/terminal/src/browser/frontend'),
      '@matrix/kanban': () => import('@matrix/kanban/src/browser/frontend'),
      '@matrix/github': () => import('@matrix/github/src/browser/frontend'),
      '@matrix/git': () => import('@matrix/git/src/browser/frontend'),
      '@matrix/notes': () => import('@matrix/notes/src/browser/frontend'),
      '@matrix/ai': () => import('@matrix/ai/src/browser/frontend'),
    };

    const loader = moduleMap[packageName];
    if (loader) {
      return await loader();
    }

    return null;
  }
}
