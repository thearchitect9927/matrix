import { ipcMain } from 'electron';
import type { MatrixNodeAPI, ExtensionContext } from '@matrix/core';
import { GitHubService } from './github-service';

const githubService = new GitHubService();

export function activate(_api: MatrixNodeAPI, _context: ExtensionContext): void {
  ipcMain.handle('github:check-auth', async () => {
    return githubService.checkAuth();
  });

  ipcMain.handle(
    'github:list-issues',
    async (_e, owner: string, repo: string, state?: string, limit?: number) => {
      return githubService.listIssues(owner, repo, state, limit);
    }
  );

  ipcMain.handle(
    'github:list-prs',
    async (_e, owner: string, repo: string, state?: string, limit?: number) => {
      return githubService.listPRs(owner, repo, state, limit);
    }
  );
}

export function deactivate(): void {
  ipcMain.removeHandler('github:check-auth');
  ipcMain.removeHandler('github:list-issues');
  ipcMain.removeHandler('github:list-prs');
}

export { githubService, GitHubService };
