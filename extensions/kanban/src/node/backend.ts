import { ipcMain } from 'electron';
import type { MatrixNodeAPI, ExtensionContext } from '@matrix/core';
import { TaskService } from './task-service';

const taskService = new TaskService();

export function activate(_api: MatrixNodeAPI, _context: ExtensionContext): void {
  ipcMain.handle('kanban:task:create', async (_e, matrixId: string, title: string) => {
    return taskService.create(matrixId, title);
  });

  ipcMain.handle('kanban:task:list', async (_e, matrixId: string) => {
    return taskService.list(matrixId);
  });

  ipcMain.handle('kanban:board:get', async (_e, matrixId: string) => {
    return taskService.getKanban(matrixId);
  });

  ipcMain.handle(
    'kanban:task:move',
    async (_e, matrixId: string, taskId: string, column: string) => {
      return taskService.moveTask(matrixId, taskId, column);
    }
  );
}

export function deactivate(): void {
  ipcMain.removeHandler('kanban:task:create');
  ipcMain.removeHandler('kanban:task:list');
  ipcMain.removeHandler('kanban:board:get');
  ipcMain.removeHandler('kanban:task:move');
}

export { taskService, TaskService };
