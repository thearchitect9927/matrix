import { execFile } from 'child_process';
import { promisify } from 'util';
import type { GitHubAuthStatus, GitHubIssue, GitHubPR } from '../common/types';

const execFileAsync = promisify(execFile);

const ISSUE_FIELDS = 'number,title,state,author,createdAt,updatedAt,labels,url';
const PR_FIELDS =
  'number,title,state,author,createdAt,updatedAt,headRefName,baseRefName,isDraft,mergeable,url';

export class GitHubService {
  async checkAuth(): Promise<GitHubAuthStatus> {
    try {
      await execFileAsync('gh', ['--version']);
    } catch {
      return { installed: false, authenticated: false, user: null, error: 'gh CLI not found' };
    }

    try {
      const { stdout } = await execFileAsync('gh', ['auth', 'status', '--hostname', 'github.com']);
      const userMatch = stdout.match(/Logged in to github\.com account (\S+)/);
      return {
        installed: true,
        authenticated: true,
        user: userMatch?.[1] ?? null,
      };
    } catch {
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
    const safeLimit = Math.max(1, Math.min(Math.floor(limit), 1000));
    const { stdout } = await execFileAsync('gh', [
      'issue',
      'list',
      '--repo',
      `${owner}/${repo}`,
      '--state',
      state,
      '--limit',
      String(safeLimit),
      '--json',
      ISSUE_FIELDS,
    ]);
    return JSON.parse(stdout) as GitHubIssue[];
  }

  async listPRs(
    owner: string,
    repo: string,
    state: string = 'open',
    limit: number = 100
  ): Promise<GitHubPR[]> {
    const safeLimit = Math.max(1, Math.min(Math.floor(limit), 1000));
    const { stdout } = await execFileAsync('gh', [
      'pr',
      'list',
      '--repo',
      `${owner}/${repo}`,
      '--state',
      state,
      '--limit',
      String(safeLimit),
      '--json',
      PR_FIELDS,
    ]);
    return JSON.parse(stdout) as GitHubPR[];
  }
}
