import { exec } from 'child_process';
import { promisify } from 'util';
import type { Branch, GitStatus } from '../common/types';

const execAsync = promisify(exec);

export class GitService {
  async branchList(repoPath: string): Promise<Branch[]> {
    const { stdout } = await execAsync('git branch --format="%(refname:short) %(HEAD)"', {
      cwd: repoPath,
    });
    return stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const parts = line.trim().split(' ');
        return { name: parts[0], current: parts[1] === '*' };
      });
  }

  async status(repoPath: string): Promise<GitStatus> {
    const { stdout } = await execAsync('git status --porcelain -b', { cwd: repoPath });
    const lines = stdout.trim().split('\n');
    const branchLine = lines[0] ?? '';
    const branch = branchLine.replace('## ', '').split('...')[0];

    const staged: string[] = [];
    const modified: string[] = [];
    const untracked: string[] = [];

    for (const line of lines.slice(1)) {
      if (!line) continue;
      const x = line[0];
      const y = line[1];
      const file = line.slice(3);

      if (x === '?' && y === '?') untracked.push(file);
      else if (x !== ' ' && x !== '?') staged.push(file);
      else if (y !== ' ') modified.push(file);
    }

    return { branch, ahead: 0, behind: 0, staged, modified, untracked };
  }

  async log(
    repoPath: string,
    limit: number = 20
  ): Promise<Array<{ hash: string; message: string; author: string; date: string }>> {
    const { stdout } = await execAsync(
      `git log --oneline --format="%H|||%s|||%an|||%ai" -${limit}`,
      { cwd: repoPath }
    );
    return stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, message, author, date] = line.split('|||');
        return { hash, message, author, date };
      });
  }

  async diff(repoPath: string, file?: string): Promise<string> {
    const fileArg = file ? ` -- ${file}` : '';
    const { stdout } = await execAsync(`git diff${fileArg}`, { cwd: repoPath });
    return stdout;
  }
}
