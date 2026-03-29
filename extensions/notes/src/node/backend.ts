import { ipcMain } from 'electron';
import type { MatrixNodeAPI, ExtensionContext } from '@matrix/core';
import { NotesService } from './notes-service';

const notesService = new NotesService();

export function activate(_api: MatrixNodeAPI, _context: ExtensionContext): void {
  ipcMain.handle('notes:list', async (_e, matrixId: string) => {
    return notesService.list(matrixId);
  });

  ipcMain.handle('notes:get', async (_e, matrixId: string, filename: string) => {
    return notesService.get(matrixId, filename);
  });

  ipcMain.handle('notes:save', async (_e, matrixId: string, filename: string, content: string) => {
    return notesService.save(matrixId, filename, content);
  });

  ipcMain.handle('notes:create', async (_e, matrixId: string, title: string) => {
    return notesService.create(matrixId, title);
  });

  ipcMain.handle('notes:delete', async (_e, matrixId: string, filename: string) => {
    return notesService.remove(matrixId, filename);
  });
}

export function deactivate(): void {
  ipcMain.removeHandler('notes:list');
  ipcMain.removeHandler('notes:get');
  ipcMain.removeHandler('notes:save');
  ipcMain.removeHandler('notes:create');
  ipcMain.removeHandler('notes:delete');
}

export { notesService, NotesService };
