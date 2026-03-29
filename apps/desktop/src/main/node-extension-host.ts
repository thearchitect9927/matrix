import { ipcMain } from 'electron';
import type {
  NodeExtensionModule,
  ExtensionInfo,
  MatrixNodeAPI,
  ExtensionContext,
} from '@matrix/core';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * NodeExtensionHost — main process에서 Extension 백엔드를 관리
 */
export class NodeExtensionHost {
  private backends = new Map<string, NodeExtensionModule>();
  private extensions = new Map<string, ExtensionInfo>();
  private activated = new Set<string>();

  constructor() {
    // renderer에서 extension:activate IPC를 받으면 node 쪽도 activate
    ipcMain.handle('extension:activate', async (_event, extensionId: string) => {
      await this.activate(extensionId);
    });
  }

  async initialize(extensions: ExtensionInfo[]): Promise<void> {
    for (const ext of extensions) {
      this.extensions.set(ext.manifest.id, ext);

      if (ext.builtin) {
        try {
          const backend = await this.loadBuiltinModule(ext.packageName);
          if (backend) {
            this.backends.set(ext.manifest.id, backend);
          }
        } catch (err) {
          console.error(`Failed to load node module for ${ext.manifest.id}:`, err);
        }
      }
    }

    // activationEvents: ["*"] → 즉시 activate
    for (const ext of extensions) {
      if (ext.manifest.activationEvents?.includes('*')) {
        await this.activate(ext.manifest.id);
      }
    }
  }

  async activate(extensionId: string): Promise<void> {
    if (this.activated.has(extensionId)) return;

    const backend = this.backends.get(extensionId);
    if (backend?.activate) {
      const ext = this.extensions.get(extensionId);
      const api = this.createNodeAPI(extensionId);
      const context = this.createContext(extensionId, ext?.path ?? '');

      await backend.activate(api, context);
    }

    this.activated.add(extensionId);
  }

  private createNodeAPI(_extensionId: string): MatrixNodeAPI {
    return {
      commands: {
        register(_commandId, _handler) {
          return { dispose() {} };
        },
        async execute<T = unknown>(_commandId: string, ..._args: unknown[]): Promise<T> {
          throw new Error('Not implemented in node');
        },
      },

      events: {
        on(_event, _handler) {
          return { dispose() {} };
        },
        emit(_event, ..._args) {},
      },

      storage: {
        get<T>(_key: string): T | undefined {
          return undefined;
        },
        set(_key, _value) {},
      },

      fs: {
        async readFile(filePath: string, encoding?: string) {
          return fs.readFile(filePath, { encoding: (encoding ?? 'utf-8') as BufferEncoding });
        },
        async writeFile(filePath: string, content: string) {
          await fs.writeFile(filePath, content, 'utf-8');
        },
        async mkdir(dirPath: string, options?: { recursive?: boolean }) {
          await fs.mkdir(dirPath, { recursive: options?.recursive ?? true });
        },
        async readdir(dirPath: string) {
          return fs.readdir(dirPath);
        },
        async exists(filePath: string) {
          try {
            await fs.access(filePath);
            return true;
          } catch {
            return false;
          }
        },
        async remove(filePath: string) {
          await fs.rm(filePath, { recursive: true, force: true });
        },
        async readJSON<T = unknown>(filePath: string): Promise<T> {
          const content = await fs.readFile(filePath, 'utf-8');
          return JSON.parse(content) as T;
        },
        async writeJSON(filePath: string, data: unknown) {
          await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        },
      },

      git: {
        async clone(url: string, dest: string, options?: { bare?: boolean }) {
          const bareFlag = options?.bare ? ' --bare' : '';
          await execAsync(`git clone${bareFlag} ${url} ${dest}`);
        },
        async worktreeAdd(repo: string, dest: string, branch: string) {
          await execAsync(`git worktree add ${dest} -b ${branch}`, { cwd: repo });
        },
        async worktreeRemove(worktreePath: string) {
          await execAsync(`git worktree remove ${worktreePath} --force`);
        },
        async worktreeList(repo: string) {
          const { stdout } = await execAsync('git worktree list --porcelain', { cwd: repo });
          return parseWorktreeList(stdout);
        },
        async branchList(repo: string) {
          const { stdout } = await execAsync('git branch --format="%(refname:short) %(HEAD)"', {
            cwd: repo,
          });
          return stdout
            .trim()
            .split('\n')
            .filter(Boolean)
            .map((line) => {
              const [name, head] = line.split(' ');
              return { name, current: head === '*' };
            });
        },
        async status(repo: string) {
          const { stdout } = await execAsync('git status --porcelain -b', { cwd: repo });
          return parseGitStatus(stdout);
        },
      },

      shell: {
        async exec(command: string, options?) {
          try {
            const { stdout, stderr } = await execAsync(command, {
              cwd: options?.cwd,
              env: options?.env ? { ...process.env, ...options.env } : undefined,
              timeout: options?.timeout,
            });
            return { stdout, stderr, exitCode: 0 };
          } catch (err: unknown) {
            const e = err as { stdout?: string; stderr?: string; code?: number };
            return {
              stdout: e.stdout ?? '',
              stderr: e.stderr ?? '',
              exitCode: e.code ?? 1,
            };
          }
        },
      },
    };
  }

  private createContext(extensionId: string, extensionPath: string): ExtensionContext {
    return { extensionId, extensionPath, subscriptions: [] };
  }

  private async loadBuiltinModule(packageName: string): Promise<NodeExtensionModule | null> {
    const moduleMap: Record<string, () => Promise<NodeExtensionModule>> = {
      '@matrix/hello-world': () => import('@matrix/hello-world/src/node/backend'),
      // Phase 1+ 에서 추가
      // '@matrix/workspace': () => import('@matrix/workspace/src/node/backend'),
    };

    const loader = moduleMap[packageName];
    if (loader) return await loader();
    return null;
  }
}

// --- Git output parsers ---

function parseWorktreeList(output: string): Array<{
  path: string;
  branch: string;
  head: string;
  bare: boolean;
}> {
  const worktrees: Array<{ path: string; branch: string; head: string; bare: boolean }> = [];
  let current: { path: string; branch: string; head: string; bare: boolean } | null = null;

  for (const line of output.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current) worktrees.push(current);
      current = { path: line.slice(9), branch: '', head: '', bare: false };
    } else if (line.startsWith('HEAD ') && current) {
      current.head = line.slice(5);
    } else if (line.startsWith('branch ') && current) {
      current.branch = line.slice(7).replace('refs/heads/', '');
    } else if (line === 'bare' && current) {
      current.bare = true;
    }
  }
  if (current) worktrees.push(current);
  return worktrees;
}

function parseGitStatus(output: string): {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
} {
  const lines = output.trim().split('\n');
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

    if (x === '?' && y === '?') {
      untracked.push(file);
    } else if (x !== ' ' && x !== '?') {
      staged.push(file);
    } else if (y !== ' ') {
      modified.push(file);
    }
  }

  return { branch, ahead: 0, behind: 0, staged, modified, untracked };
}
