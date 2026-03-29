import { exec } from 'child_process';
import { promisify } from 'util';
import type { GitHubAuthStatus, GitHubIssue, GitHubPR } from '../common/types';

const execAsync = promisify(exec);

export class GitHubService {
  async checkAuth(): Promise<GitHubAuthStatus> {
    try {
      await execAsync('gh --version');
    } catch {
      return { installed: false, authenticated: false, user: null, error: 'gh CLI not found' };
    }

    try {
      const { stdout } = await execAsync('gh auth status --hostname github.com 2>&1');
      const userMatch = stdout.match(/Logged in to github\.com account (\S+)/);
      return {
        installed: true,
        authenticated: true,
        user: userMatch?.[1] ?? null,
      };
    } catch (err) {
      return {
        installed: true,
        authenticated: false,
        user: null,
        error: 'Not authenticated with GitHub',
      };
    }
  }

  async listIssues(
    owner: string,
    repo: string,
    state: string = 'open',
    limit: number = 100
  ): Promise<GitHubIssue[]> {
    const { stdout } = await execAsync(
      `gh issue list --repo ${owner}/${repo} --state ${state} --limit ${limit} --json number,title,state,author,createdAt,updatedAt,labels,url`
    );
    return JSON.parse(stdout) as GitHubIssue[];
  }

  async listPRs(
    owner: string,
    repo: string,
    state: string = 'open',
    limit: number = 100
  ): Promise<GitHubPR[]> {
    const { stdout } = await execAsync(
      `gh pr list --repo ${owner}/${repo} --state ${state} --limit ${limit} --json number,title,state,author,createdAt,updatedAt,headRefName,baseRefName,isDraft,mergeable,url`
    );
    return JSON.parse(stdout) as GitHubPR[];
  }
}
