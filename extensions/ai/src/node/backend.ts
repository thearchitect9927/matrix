import { ipcMain } from 'electron';
import type { MatrixNodeAPI, ExtensionContext } from '@matrix/core';
import { getBuiltinTools } from './tool-registry';
import { AgentService } from './agent-service';
import { TaskExecutor } from './task-executor';

const agentService = new AgentService();
const taskExecutor = new TaskExecutor();

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

  ipcMain.handle('ai:context:build', async (_e, matrixId: string, taskId?: string) => {
    return agentService.buildContext(matrixId, taskId);
  });

  ipcMain.handle('ai:task:plan', async (_e, matrixId: string, taskId: string) => {
    return taskExecutor.planExecution(matrixId, taskId);
  });

  ipcMain.handle(
    'ai:task:create-worktrees',
    async (_e, matrixId: string, taskId: string, repoNames: string[], branchName: string) => {
      const plan = await taskExecutor.planExecution(matrixId, taskId);
      return taskExecutor.createWorktreesForTask(plan, repoNames, branchName);
    }
  );
}

export function deactivate(): void {
  ipcMain.removeHandler('ai:tools:list');
  ipcMain.removeHandler('ai:tool:execute');
  ipcMain.removeHandler('ai:context:build');
  ipcMain.removeHandler('ai:task:plan');
  ipcMain.removeHandler('ai:task:create-worktrees');
}

export { agentService, AgentService };
