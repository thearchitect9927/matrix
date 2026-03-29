import { ipcMain } from 'electron';
import type { MatrixNodeAPI, ExtensionContext } from '@matrix/core';
import { GitService } from './git-service';
import { WorktreeService } from './worktree-service';

const gitService = new GitService();
const worktreeService = new WorktreeService();

export function activate(_api: MatrixNodeAPI, _context: ExtensionContext): void {
  ipcMain.handle('git:branch:list', async (_e, repoPath: string) => {
    return gitService.branchList(repoPath);
  });

  ipcMain.handle('git:status', async (_e, repoPath: string) => {
    return gitService.status(repoPath);
  });

  ipcMain.handle('git:log', async (_e, repoPath: string, limit?: number) => {
    return gitService.log(repoPath, limit);
  });

  ipcMain.handle('git:diff', async (_e, repoPath: string, file?: string) => {
    return gitService.diff(repoPath, file);
  });

  ipcMain.handle(
    'git:worktree:add',
    async (_e, repoPath: string, destination: string, branch: string) => {
      return worktreeService.add(repoPath, destination, branch);
    }
  );

  ipcMain.handle('git:worktree:remove', async (_e, worktreePath: string) => {
    return worktreeService.remove(worktreePath);
  });

  ipcMain.handle('git:worktree:list', async (_e, repoPath: string) => {
    return worktreeService.list(repoPath);
  });
}

export function deactivate(): void {
  ipcMain.removeHandler('git:branch:list');
  ipcMain.removeHandler('git:status');
  ipcMain.removeHandler('git:log');
  ipcMain.removeHandler('git:diff');
  ipcMain.removeHandler('git:worktree:add');
  ipcMain.removeHandler('git:worktree:remove');
  ipcMain.removeHandler('git:worktree:list');
}

export { gitService, worktreeService, GitService, WorktreeService };
