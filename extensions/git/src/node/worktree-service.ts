import { execFile } from 'child_process';
import { promisify } from 'util';
import type { Worktree } from '../common/types';

const execFileAsync = promisify(execFile);

export class WorktreeService {
  async add(repoPath: string, destination: string, branch: string): Promise<void> {
    await execFileAsync('git', ['worktree', 'add', destination, '-b', branch], { cwd: repoPath });
  }

  async addExisting(repoPath: string, destination: string, branch: string): Promise<void> {
    await execFileAsync('git', ['worktree', 'add', destination, branch], { cwd: repoPath });
  }

  async remove(worktreePath: string): Promise<void> {
    await execFileAsync('git', ['worktree', 'remove', worktreePath, '--force']);
  }

  async list(repoPath: string): Promise<Worktree[]> {
    const { stdout } = await execFileAsync('git', ['worktree', 'list', '--porcelain'], {
      cwd: repoPath,
    });
    return this.parseWorktreeList(stdout);
  }

  async prune(repoPath: string): Promise<void> {
    await execFileAsync('git', ['worktree', 'prune'], { cwd: repoPath });
  }

  private parseWorktreeList(output: string): Worktree[] {
    const worktrees: Worktree[] = [];
    let current: Partial<Worktree> | null = null;

    for (const line of output.split('\n')) {
      if (line.startsWith('worktree ')) {
        if (current?.path) worktrees.push(current as Worktree);
        current = { path: line.slice(9), branch: '', head: '', bare: false };
      } else if (line.startsWith('HEAD ') && current) {
        current.head = line.slice(5);
      } else if (line.startsWith('branch ') && current) {
        current.branch = line.slice(7).replace('refs/heads/', '');
      } else if (line === 'bare' && current) {
        current.bare = true;
      }
    }
    if (current?.path) worktrees.push(current as Worktree);
    return worktrees;
  }
}
