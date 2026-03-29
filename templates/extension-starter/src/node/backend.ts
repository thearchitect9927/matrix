import type { MatrixNodeAPI, ExtensionContext } from '@matrix/core';

export function activate(_api: MatrixNodeAPI, _context: ExtensionContext): void {
  // Register IPC handlers here
  // Example:
  // ipcMain.handle('my-extension:action', async (_e, arg: string) => {
  //   return { result: arg };
  // });
}
