import type { BrowserExtensionModule, ExtensionInfo } from '@matrix/core';
import { ExtensionRegistry } from './registry';
import { createBrowserAPI, createExtensionContext } from './api-factory';

/**
 * BrowserExtensionHost — renderer process에서 Extension을 관리
 *
 * 1. manifest 수집 → Registry에 등록
 * 2. Extension 모듈 로드 (activate는 아직)
 * 3. 필요 시 lazy activate
 */
export class BrowserExtensionHost {
  readonly registry = new ExtensionRegistry();
  private frontends = new Map<string, BrowserExtensionModule>();
  private extensions = new Map<string, ExtensionInfo>();
  private activationPromises = new Map<string, Promise<void>>();

  /**
   * 앱 시작 시 호출 — manifest 등록 + 모듈 로드
   */
  async initialize(extensions: ExtensionInfo[]): Promise<void> {
    // 1. manifest 등록
    for (const ext of extensions) {
      this.extensions.set(ext.manifest.id, ext);
      this.registry.registerManifest(ext.manifest);
    }

    // 2. 내장 Extension 모듈 로드
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

    // 3. activationEvents: ["*"] 인 Extension은 즉시 activate
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
    // 내장 Extension은 빌드타임에 알려진 패키지이므로 dynamic import 사용
    // Vite가 이 패턴을 번들링할 수 있도록 각 Extension을 명시적으로 등록
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
