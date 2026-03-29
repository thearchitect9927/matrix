import { ipcMain } from 'electron';
import type { ExtensionInfo } from '@matrix/core';

/**
 * Registers Extension-related IPC handlers.
 * Responds when the renderer requests the manifest list.
 */
export function registerExtensionIPC(extensions: ExtensionInfo[]): void {
  // Renderer requests the Extension list at app start
  ipcMain.handle('extensions:list', () => {
    return extensions.map((ext) => ({
      manifest: ext.manifest,
      builtin: ext.builtin,
      path: ext.path,
      packageName: ext.packageName,
    }));
  });
}
