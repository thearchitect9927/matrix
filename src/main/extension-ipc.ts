import { ipcMain } from 'electron';
import type { ExtensionInfo } from '@matrix/core';

/**
 * Extension 관련 IPC 핸들러 등록
 * renderer가 manifest 목록을 요청하면 main이 응답
 */
export function registerExtensionIPC(extensions: ExtensionInfo[]): void {
  // renderer에서 앱 시작 시 Extension 목록 요청
  ipcMain.handle('extensions:list', () => {
    return extensions.map((ext) => ({
      manifest: ext.manifest,
      builtin: ext.builtin,
      path: ext.path,
      packageName: ext.packageName,
    }));
  });
}
