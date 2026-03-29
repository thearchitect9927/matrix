import { ipcMain } from 'electron';
import type { MatrixNodeAPI, ExtensionContext } from '@matrix/core';
import { MatrixService } from './matrix-service';
import { SourceService } from './source-service';

const matrixService = new MatrixService();
const sourceService = new SourceService(matrixService);

export function activate(_api: MatrixNodeAPI, _context: ExtensionContext): void {
  // Matrix IPC handlers
  ipcMain.handle('workspace:matrix:list', async () => {
    return matrixService.list();
  });

  ipcMain.handle('workspace:matrix:get', async (_e, id: string) => {
    return matrixService.get(id);
  });

  ipcMain.handle('workspace:matrix:create', async (_e, name: string) => {
    return matrixService.create(name);
  });

  ipcMain.handle('workspace:matrix:update', async (_e, id: string, data: { name?: string }) => {
    return matrixService.update(id, data);
  });

  ipcMain.handle('workspace:matrix:delete', async (_e, id: string) => {
    return matrixService.delete(id);
  });

  // Source IPC handlers
  ipcMain.handle(
    'workspace:source:clone',
    async (_e, matrixId: string, name: string, url: string) => {
      return sourceService.cloneBare(matrixId, name, url);
    }
  );

  ipcMain.handle('workspace:source:extract-name', async (_e, url: string) => {
    return sourceService.extractRepoName(url);
  });
}

export function deactivate(): void {
  // Cleanup IPC handlers
  ipcMain.removeHandler('workspace:matrix:list');
  ipcMain.removeHandler('workspace:matrix:get');
  ipcMain.removeHandler('workspace:matrix:create');
  ipcMain.removeHandler('workspace:matrix:update');
  ipcMain.removeHandler('workspace:matrix:delete');
  ipcMain.removeHandler('workspace:source:clone');
  ipcMain.removeHandler('workspace:source:extract-name');
}

// Export services for direct import by other extensions
export { matrixService, sourceService, MatrixService, SourceService };
