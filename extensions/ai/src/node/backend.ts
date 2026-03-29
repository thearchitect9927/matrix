import { ipcMain } from 'electron';
import type { MatrixNodeAPI, ExtensionContext } from '@matrix/core';
import { getBuiltinTools } from './tool-registry';

export function activate(_api: MatrixNodeAPI, _context: ExtensionContext): void {
  ipcMain.handle('ai:tools:list', async () => {
    const tools = getBuiltinTools();
    return tools.map((t) => ({ id: t.id, name: t.name, description: t.description }));
  });

  ipcMain.handle('ai:tool:execute', async (_e, toolId: string, args: Record<string, unknown>) => {
    const tools = getBuiltinTools();
    const tool = tools.find((t) => t.id === toolId);
    if (!tool) throw new Error(`Tool not found: ${toolId}`);
    return tool.handler(args);
  });
}

export function deactivate(): void {
  ipcMain.removeHandler('ai:tools:list');
  ipcMain.removeHandler('ai:tool:execute');
}
