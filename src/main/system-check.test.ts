import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mocks (available inside vi.mock factories) ──────────────

const {
  mockHandle,
  mockOn,
  mockOpenExternal,
  mockExec,
  mockExecFile,
  mockSpawn,
  mockAccess,
  mockReadFile,
  mockWriteFile,
  mockMkdir,
  mockReaddir,
  mockExistsSync,
  mockPlatform,
  mockHomedir,
  mockGetAllWindows,
} = vi.hoisted(() => ({
  mockHandle: vi.fn(),
  mockOn: vi.fn(),
  mockOpenExternal: vi.fn(),
  mockExec: vi.fn(),
  mockExecFile: vi.fn(),
  mockSpawn: vi.fn(),
  mockAccess: vi.fn(),
  mockReadFile: vi.fn(),
  mockWriteFile: vi.fn(),
  mockMkdir: vi.fn(),
  mockReaddir: vi.fn(),
  mockExistsSync: vi.fn(),
  mockPlatform: vi.fn<() => string>().mockReturnValue('darwin'),
  mockHomedir: vi.fn().mockReturnValue('/Users/testuser'),
  mockGetAllWindows: vi.fn().mockReturnValue([]),
}));

// ── Mock modules ────────────────────────────────────────────────────

vi.mock('electron', () => ({
  default: {
    ipcMain: { handle: mockHandle, on: mockOn },
    shell: { openExternal: mockOpenExternal },
    BrowserWindow: { getAllWindows: mockGetAllWindows },
  },
  ipcMain: { handle: mockHandle, on: mockOn },
  shell: { openExternal: mockOpenExternal },
  BrowserWindow: { getAllWindows: mockGetAllWindows },
}));

vi.mock('child_process', () => ({
  default: { exec: mockExec, execFile: mockExecFile, spawn: mockSpawn },
  exec: mockExec,
  execFile: mockExecFile,
  spawn: mockSpawn,
}));

vi.mock('fs/promises', () => ({
  default: {
    access: mockAccess,
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    mkdir: mockMkdir,
    readdir: mockReaddir,
  },
  access: mockAccess,
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
  readdir: mockReaddir,
}));

vi.mock('fs', () => ({
  default: { existsSync: mockExistsSync, constants: { X_OK: 1 } },
  existsSync: mockExistsSync,
  constants: { X_OK: 1 },
}));

vi.mock('os', () => ({
  default: { platform: () => mockPlatform(), homedir: () => mockHomedir() },
  platform: () => mockPlatform(),
  homedir: () => mockHomedir(),
}));

vi.mock('./app-paths', () => ({
  default: {
    getAppPaths: () => ({ dbPath: '/mock/db.path', workspacePath: '/mock/workspace' }),
  },
  getAppPaths: () => ({ dbPath: '/mock/db.path', workspacePath: '/mock/workspace' }),
}));

// ── Import after mocks ──────────────────────────────────────────────

import {
  ALLOWED_COMMANDS,
  ALLOWED_INSTALL_COMMANDS,
  MACOS_TERMINALS,
  LINUX_TERMINALS,
  WINDOWS_TERMINALS,
  IDE_CANDIDATES,
  getShell,
  checkCommand,
  execCommand,
  execCommandStream,
  validateExecutablePath,
  pathExists,
  detectMacOSTerminals,
  detectLinuxTerminals,
  detectWindowsTerminals,
  detectTerminals,
  detectMacOSIDEs,
  detectLinuxIDEs,
  detectWindowsIDEs,
  detectIDEs,
  readConfig,
  writeConfig,
  resetConfig,
  detectShells,
  setupSystemCheckHandlers,
} from './system-check';

// ── Types for mock callbacks ────────────────────────────────────────

type ExecCallback = (error: Error | null, stdout: string, stderr: string) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IpcHandler = (...args: any[]) => Promise<any>;

// ── Helpers ─────────────────────────────────────────────────────────

/** Make mockExec invoke its callback with an error */
function execFails(message = 'not found') {
  mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: ExecCallback) => {
    cb(new Error(message), '', '');
  });
}

/** Selective exec: success for cmds matching pattern, failure otherwise */
function execSelective(pattern: RegExp, stdout: string) {
  mockExec.mockImplementation((cmd: string, _opts: unknown, cb: ExecCallback) => {
    if (pattern.test(cmd)) cb(null, stdout, '');
    else cb(new Error('not found'), '', '');
  });
}

// ── Tests ───────────────────────────────────────────────────────────

describe('system-check', () => {
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    savedEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  // ── Constants ────────────────────────────────────────────────────

  describe('constants', () => {
    it('ALLOWED_COMMANDS contains expected tools', () => {
      expect(ALLOWED_COMMANDS.has('git')).toBe(true);
      expect(ALLOWED_COMMANDS.has('node')).toBe(true);
      expect(ALLOWED_COMMANDS.has('uv')).toBe(true);
      expect(ALLOWED_COMMANDS.has('rm')).toBe(false);
    });

    it('MACOS_TERMINALS has terminal candidates', () => {
      expect(MACOS_TERMINALS.length).toBeGreaterThan(0);
      expect(MACOS_TERMINALS.find((t) => t.id === 'terminal')).toBeDefined();
    });

    it('LINUX_TERMINALS has terminal candidates', () => {
      expect(LINUX_TERMINALS.length).toBeGreaterThan(0);
      expect(LINUX_TERMINALS.find((t) => t.id === 'gnome-terminal')).toBeDefined();
    });

    it('WINDOWS_TERMINALS has terminal candidates', () => {
      expect(WINDOWS_TERMINALS.length).toBeGreaterThan(0);
      expect(WINDOWS_TERMINALS.find((t) => t.id === 'windows-terminal')).toBeDefined();
    });

    it('IDE_CANDIDATES has editor candidates', () => {
      expect(IDE_CANDIDATES.length).toBeGreaterThan(0);
      expect(IDE_CANDIDATES.find((c) => c.id === 'vscode')).toBeDefined();
    });
  });

  // ── getShell ─────────────────────────────────────────────────────

  describe('getShell', () => {
    it('returns COMSPEC on win32', () => {
      mockPlatform.mockReturnValue('win32');
      process.env.COMSPEC = 'C:\\Windows\\System32\\cmd.exe';
      expect(getShell()).toBe('C:\\Windows\\System32\\cmd.exe');
    });

    it('falls back to cmd.exe on win32 without COMSPEC', () => {
      mockPlatform.mockReturnValue('win32');
      delete process.env.COMSPEC;
      expect(getShell()).toBe('cmd.exe');
    });

    it('returns SHELL env on unix', () => {
      mockPlatform.mockReturnValue('darwin');
      process.env.SHELL = '/bin/bash';
      expect(getShell()).toBe('/bin/bash');
    });

    it('falls back to /bin/zsh on unix without SHELL', () => {
      mockPlatform.mockReturnValue('darwin');
      delete process.env.SHELL;
      expect(getShell()).toBe('/bin/zsh');
    });
  });

  // ── checkCommand ─────────────────────────────────────────────────

  describe('checkCommand', () => {
    it('rejects commands not in whitelist', async () => {
      const result = await checkCommand('rm');
      expect(result).toEqual({ exists: false });
      expect(mockExec).not.toHaveBeenCalled();
    });

    it('rejects commands with unsafe characters', async () => {
      const result = await checkCommand('git;rm');
      expect(result).toEqual({ exists: false });
    });

    it('returns exists with path and version on success', async () => {
      // First call: which git → path, second call: git --version → version string
      mockExec
        .mockImplementationOnce((_cmd: string, _opts: unknown, cb: ExecCallback) => {
          cb(null, '/usr/bin/git', '');
        })
        .mockImplementationOnce((_cmd: string, _opts: unknown, cb: ExecCallback) => {
          cb(null, 'git version 2.39.3', '');
        });

      const result = await checkCommand('git');
      expect(result).toEqual({ exists: true, path: '/usr/bin/git', version: '2.39.3' });
    });

    it('parses semver from version output', async () => {
      mockExec
        .mockImplementationOnce((_cmd: string, _opts: unknown, cb: ExecCallback) => {
          cb(null, '/usr/bin/node', '');
        })
        .mockImplementationOnce((_cmd: string, _opts: unknown, cb: ExecCallback) => {
          cb(null, 'v20.11.0', '');
        });

      const result = await checkCommand('node');
      expect(result.version).toBe('20.11.0');
    });

    it('uses first line when no semver match', async () => {
      mockExec
        .mockImplementationOnce((_cmd: string, _opts: unknown, cb: ExecCallback) => {
          cb(null, '/usr/bin/claude', '');
        })
        .mockImplementationOnce((_cmd: string, _opts: unknown, cb: ExecCallback) => {
          cb(null, 'claude agent (no version)', '');
        });

      const result = await checkCommand('claude');
      expect(result.version).toBe('claude agent (no version)');
    });

    it('returns exists without version when --version fails', async () => {
      mockExec
        .mockImplementationOnce((_cmd: string, _opts: unknown, cb: ExecCallback) => {
          cb(null, '/usr/bin/git', '');
        })
        .mockImplementationOnce((_cmd: string, _opts: unknown, cb: ExecCallback) => {
          cb(new Error('no --version'), '', '');
        });

      const result = await checkCommand('git');
      expect(result).toEqual({ exists: true, path: '/usr/bin/git', version: undefined });
    });

    it('returns not exists when which fails', async () => {
      execFails('not found');
      const result = await checkCommand('git');
      expect(result).toEqual({ exists: false });
    });
  });

  // ── execCommand ────────────────────────────────────────────────

  describe('execCommand', () => {
    it('rejects commands with base not in whitelist', async () => {
      const result = await execCommand('rm -rf /');
      expect(result).toEqual({
        success: false,
        stdout: '',
        stderr: 'Command not allowed',
        exitCode: 1,
      });
      expect(mockExec).not.toHaveBeenCalled();
    });

    it('rejects commands with special characters', async () => {
      const result = await execCommand('git; rm -rf /');
      expect(result).toEqual({
        success: false,
        stdout: '',
        stderr: 'Command not allowed',
        exitCode: 1,
      });
    });

    it('rejects commands with pipe characters', async () => {
      const result = await execCommand('git log | cat');
      expect(result).toEqual({
        success: false,
        stdout: '',
        stderr: 'Command not allowed',
        exitCode: 1,
      });
    });

    it('executes whitelisted command and returns output', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: ExecCallback) => {
        cb(null, 'uv 0.5.11', '');
      });

      const result = await execCommand('uv --version');
      expect(result).toEqual({
        success: true,
        stdout: 'uv 0.5.11',
        stderr: '',
        exitCode: 0,
      });
    });

    it('captures stderr alongside stdout', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: ExecCallback) => {
        cb(null, 'output', 'warning: something');
      });

      const result = await execCommand('git --version');
      expect(result.stdout).toBe('output');
      expect(result.stderr).toBe('warning: something');
    });

    it('returns correct exit code on failure', async () => {
      const error = new Error('not found') as NodeJS.ErrnoException & { status?: number };
      error.status = 127;
      mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: ExecCallback) => {
        cb(error, '', 'command not found');
      });

      const result = await execCommand('claude --version');
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(127);
      expect(result.stderr).toBe('command not found');
    });

    it('defaults exit code to 1 when error has no status', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: ExecCallback) => {
        cb(new Error('generic error'), '', '');
      });

      const result = await execCommand('node --version');
      expect(result.exitCode).toBe(1);
    });
  });

  // ── execCommandStream ──────────────────────────────────────────

  describe('execCommandStream', () => {
    it('rejects commands not in whitelist', () => {
      const result = execCommandStream('s1', 'rm -rf /');
      expect(result).toBe(false);
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('accepts simple whitelisted commands', () => {
      const mockChild = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(mockChild);

      const result = execCommandStream('s1', 'uv --version');
      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalled();
    });

    it('accepts exact install commands', () => {
      const mockChild = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      };
      mockSpawn.mockReturnValue(mockChild);

      const result = execCommandStream('s1', 'brew install --cask codex');
      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalled();
    });
  });

  // ── ALLOWED_INSTALL_COMMANDS ────────────────────────────────────

  describe('ALLOWED_INSTALL_COMMANDS', () => {
    it('contains expected install commands', () => {
      expect(ALLOWED_INSTALL_COMMANDS.has('npm i -g @google/gemini-cli')).toBe(true);
      expect(ALLOWED_INSTALL_COMMANDS.has('brew install --cask codex')).toBe(true);
      expect(ALLOWED_INSTALL_COMMANDS.has('rm -rf /')).toBe(false);
    });
  });

  // ── validateExecutablePath ───────────────────────────────────────

  describe('validateExecutablePath', () => {
    it('rejects empty input', async () => {
      const result = await validateExecutablePath('');
      expect(result).toEqual({ valid: false, error: 'Invalid path' });
    });

    it('rejects non-string input', async () => {
      const result = await validateExecutablePath(null as unknown as string);
      expect(result).toEqual({ valid: false, error: 'Invalid path' });
    });

    it('rejects relative paths', async () => {
      const result = await validateExecutablePath('relative/path/bin');
      expect(result).toEqual({ valid: false, error: 'Path must be absolute' });
    });

    it('accepts valid unix absolute path with version', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockExecFile.mockImplementation(
        (_path: string, _args: string[], _opts: unknown, cb: ExecCallback) => {
          cb(null, 'v1.2.3', '');
        }
      );

      const result = await validateExecutablePath('/usr/local/bin/mytool');
      expect(result).toEqual({ valid: true, version: '1.2.3' });
    });

    it('accepts valid Windows path format', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      mockExecFile.mockImplementation(
        (_path: string, _args: string[], _opts: unknown, cb: ExecCallback) => {
          cb(new Error('no version'), '', '');
        }
      );

      const result = await validateExecutablePath('C:\\Program Files\\tool.exe');
      expect(result).toEqual({ valid: true, version: undefined });
    });

    it('returns error for EACCES', async () => {
      const err = new Error('EACCES') as NodeJS.ErrnoException;
      err.code = 'EACCES';
      mockAccess.mockRejectedValueOnce(err);

      const result = await validateExecutablePath('/usr/bin/tool');
      expect(result).toEqual({ valid: false, error: 'File is not executable' });
    });

    it('returns error for ENOENT', async () => {
      const err = new Error('ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      mockAccess.mockRejectedValueOnce(err);

      const result = await validateExecutablePath('/usr/bin/nonexistent');
      expect(result).toEqual({ valid: false, error: 'File not found' });
    });
  });

  // ── pathExists ───────────────────────────────────────────────────

  describe('pathExists', () => {
    it('returns true when access succeeds', async () => {
      mockAccess.mockResolvedValueOnce(undefined);
      expect(await pathExists('/some/path')).toBe(true);
    });

    it('returns false when access fails', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      expect(await pathExists('/nonexistent')).toBe(false);
    });
  });

  // ── detectMacOSTerminals ─────────────────────────────────────────

  describe('detectMacOSTerminals', () => {
    it('detects terminal in /Applications', async () => {
      // Only Terminal.app exists
      mockAccess.mockImplementation((p: string) => {
        if (p === '/Applications/Terminal.app') return Promise.resolve();
        return Promise.reject(new Error('not found'));
      });
      process.env.TERM_PROGRAM = 'Apple_Terminal';

      const results = await detectMacOSTerminals();
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'terminal',
        name: 'Terminal',
        path: '/Applications/Terminal.app',
        isDefault: true,
      });
    });

    it('detects terminal in ~/Applications', async () => {
      mockAccess.mockImplementation((p: string) => {
        if (p === '/Users/testuser/Applications/iTerm.app') return Promise.resolve();
        return Promise.reject(new Error('not found'));
      });
      process.env.TERM_PROGRAM = 'iTerm.app';

      const results = await detectMacOSTerminals();
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ id: 'iterm2', isDefault: true });
    });

    it('sets isDefault from TERM_PROGRAM for warp', async () => {
      mockAccess.mockImplementation((p: string) => {
        if (p === '/Applications/Warp.app') return Promise.resolve();
        return Promise.reject(new Error('not found'));
      });
      process.env.TERM_PROGRAM = 'WarpTerminal';

      const results = await detectMacOSTerminals();
      expect(results[0]).toMatchObject({ id: 'warp', isDefault: true });
    });

    it('does not add duplicate if found in both dirs', async () => {
      // Terminal.app in both /Applications and ~/Applications
      mockAccess.mockResolvedValue(undefined);
      delete process.env.TERM_PROGRAM;

      const results = await detectMacOSTerminals();
      const terminalEntries = results.filter((r) => r.id === 'terminal');
      expect(terminalEntries).toHaveLength(1);
    });

    it('returns empty when no terminals found', async () => {
      mockAccess.mockRejectedValue(new Error('not found'));
      const results = await detectMacOSTerminals();
      expect(results).toEqual([]);
    });
  });

  // ── detectLinuxTerminals ─────────────────────────────────────────

  describe('detectLinuxTerminals', () => {
    it('detects terminals via which', async () => {
      execSelective(/which gnome-terminal/, '/usr/bin/gnome-terminal');
      delete process.env.TERM_PROGRAM;

      const results = await detectLinuxTerminals();
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 'gnome-terminal',
        path: '/usr/bin/gnome-terminal',
      });
    });

    it('marks default from TERM_PROGRAM', async () => {
      process.env.TERM_PROGRAM = 'gnome-terminal';
      execSelective(/which gnome-terminal/, '/usr/bin/gnome-terminal');

      const results = await detectLinuxTerminals();
      expect(results[0].isDefault).toBe(true);
    });

    it('uses x-terminal-emulator fallback for default', async () => {
      delete process.env.TERM_PROGRAM;
      mockExec.mockImplementation((cmd: string, _opts: unknown, cb: ExecCallback) => {
        if (cmd.includes('readlink')) cb(null, '/usr/bin/gnome-terminal', '');
        else if (cmd.includes('which gnome-terminal')) cb(null, '/usr/bin/gnome-terminal', '');
        else cb(new Error('not found'), '', '');
      });

      const results = await detectLinuxTerminals();
      const gnome = results.find((r) => r.id === 'gnome-terminal');
      expect(gnome?.isDefault).toBe(true);
    });

    it('returns empty when no terminals installed', async () => {
      execFails('not found');
      delete process.env.TERM_PROGRAM;
      const results = await detectLinuxTerminals();
      expect(results).toEqual([]);
    });
  });

  // ── detectWindowsTerminals ───────────────────────────────────────

  describe('detectWindowsTerminals', () => {
    it('detects terminal via where command', async () => {
      execSelective(/where wt\.exe/, 'C:\\Windows\\wt.exe');

      const results = await detectWindowsTerminals();
      expect(results.find((r) => r.id === 'windows-terminal')).toMatchObject({
        path: 'C:\\Windows\\wt.exe',
        isDefault: true,
      });
    });

    it('detects Git Bash from known paths', async () => {
      execFails();
      process.env.PROGRAMFILES = '/mnt/c/Program Files';
      process.env['PROGRAMFILES(X86)'] = '/mnt/c/Program Files (x86)';
      process.env.SYSTEMROOT = '/mnt/c/Windows';
      delete process.env.LOCALAPPDATA;

      // join() on the test host will build a path like "/mnt/c/Program Files/Git/git-bash.exe"
      const { join: pathJoin } = await import('path');
      const expectedPath = pathJoin('/mnt/c/Program Files', 'Git', 'git-bash.exe');

      mockAccess.mockImplementation((p: string) => {
        if (p === expectedPath) return Promise.resolve();
        return Promise.reject(new Error('not found'));
      });
      mockReaddir.mockRejectedValue(new Error('no dir'));

      const results = await detectWindowsTerminals();
      const gitBash = results.find((r) => r.id === 'git-bash');
      expect(gitBash).toMatchObject({
        name: 'Git Bash',
        path: expectedPath,
      });
    });

    it('finds terminals by scanning directories', async () => {
      execFails();
      mockAccess.mockRejectedValue(new Error('not found'));
      process.env.SYSTEMROOT = '/mnt/c/Windows';
      process.env.PROGRAMFILES = '/mnt/c/Program Files';
      process.env['PROGRAMFILES(X86)'] = '/mnt/c/Program Files (x86)';
      delete process.env.LOCALAPPDATA;

      const { join: pathJoin } = await import('path');
      const system32 = pathJoin('/mnt/c/Windows', 'System32');

      mockReaddir.mockImplementation((dir: string) => {
        if (dir === system32) return Promise.resolve(['cmd.exe', 'other.exe']);
        return Promise.reject(new Error('not found'));
      });

      const results = await detectWindowsTerminals();
      const cmd = results.find((r) => r.id === 'cmd');
      expect(cmd).toBeDefined();
    });

    it('marks cmd as default when no Windows Terminal found', async () => {
      execFails();
      mockAccess.mockRejectedValue(new Error('not found'));
      process.env.SYSTEMROOT = '/mnt/c/Windows';
      process.env.PROGRAMFILES = '/mnt/c/Program Files';
      process.env['PROGRAMFILES(X86)'] = '/mnt/c/Program Files (x86)';
      delete process.env.LOCALAPPDATA;

      const { join: pathJoin } = await import('path');
      const system32 = pathJoin('/mnt/c/Windows', 'System32');

      mockReaddir.mockImplementation((dir: string) => {
        if (dir === system32) return Promise.resolve(['cmd.exe']);
        return Promise.reject(new Error('not found'));
      });

      const results = await detectWindowsTerminals();
      const cmd = results.find((r) => r.id === 'cmd');
      expect(cmd?.isDefault).toBe(true);
    });
  });

  // ── detectTerminals ──────────────────────────────────────────────

  describe('detectTerminals', () => {
    it('delegates to macOS detection on darwin', async () => {
      mockPlatform.mockReturnValue('darwin');
      mockAccess.mockRejectedValue(new Error('not found'));
      delete process.env.TERM_PROGRAM;

      const results = await detectTerminals();
      expect(Array.isArray(results)).toBe(true);
    });

    it('delegates to Linux detection on linux', async () => {
      mockPlatform.mockReturnValue('linux');
      execFails();
      delete process.env.TERM_PROGRAM;

      const results = await detectTerminals();
      expect(Array.isArray(results)).toBe(true);
    });

    it('delegates to Windows detection on win32', async () => {
      mockPlatform.mockReturnValue('win32');
      execFails();
      mockAccess.mockRejectedValue(new Error('not found'));
      mockReaddir.mockRejectedValue(new Error('not found'));

      const results = await detectTerminals();
      expect(Array.isArray(results)).toBe(true);
    });

    it('returns empty array for unknown platform', async () => {
      mockPlatform.mockReturnValue('freebsd');
      const results = await detectTerminals();
      expect(results).toEqual([]);
    });
  });

  // ── detectMacOSIDEs ──────────────────────────────────────────────

  describe('detectMacOSIDEs', () => {
    it('detects IDE via app bundle in /Applications', async () => {
      mockAccess.mockImplementation((p: string) => {
        if (p === '/Applications/Visual Studio Code.app') return Promise.resolve();
        return Promise.reject(new Error('not found'));
      });
      execFails();

      const results = await detectMacOSIDEs();
      expect(results.find((r) => r.id === 'vscode')).toMatchObject({
        name: 'VS Code',
        path: '/Applications/Visual Studio Code.app',
      });
    });

    it('falls back to CLI command when no app bundle', async () => {
      mockAccess.mockRejectedValue(new Error('not found'));
      // 'which nvim' succeeds for neovim (no macApp)
      execSelective(/which nvim/, '/usr/local/bin/nvim');

      const results = await detectMacOSIDEs();
      expect(results.find((r) => r.id === 'neovim')).toMatchObject({
        path: '/usr/local/bin/nvim',
      });
    });

    it('returns empty when nothing found', async () => {
      mockAccess.mockRejectedValue(new Error('not found'));
      execFails();
      const results = await detectMacOSIDEs();
      expect(results).toEqual([]);
    });
  });

  // ── detectLinuxIDEs ──────────────────────────────────────────────

  describe('detectLinuxIDEs', () => {
    it('detects IDE via which command', async () => {
      execSelective(/which code/, '/usr/bin/code');

      const results = await detectLinuxIDEs();
      expect(results.find((r) => r.id === 'vscode')).toMatchObject({
        path: '/usr/bin/code',
      });
    });

    it('returns empty when nothing installed', async () => {
      execFails();
      const results = await detectLinuxIDEs();
      expect(results).toEqual([]);
    });
  });

  // ── detectWindowsIDEs ────────────────────────────────────────────

  describe('detectWindowsIDEs', () => {
    it('detects IDE via where command', async () => {
      execSelective(/where Code\.exe/, 'C:\\Program Files\\VS Code\\Code.exe');

      const results = await detectWindowsIDEs();
      expect(results.find((r) => r.id === 'vscode')).toMatchObject({
        path: 'C:\\Program Files\\VS Code\\Code.exe',
      });
    });

    it('returns empty when nothing installed', async () => {
      execFails();
      const results = await detectWindowsIDEs();
      expect(results).toEqual([]);
    });
  });

  // ── detectIDEs ───────────────────────────────────────────────────

  describe('detectIDEs', () => {
    it('delegates to correct platform', async () => {
      mockPlatform.mockReturnValue('darwin');
      mockAccess.mockRejectedValue(new Error('not found'));
      execFails();

      const results = await detectIDEs();
      expect(Array.isArray(results)).toBe(true);
    });

    it('returns empty for unknown platform', async () => {
      mockPlatform.mockReturnValue('aix');
      const results = await detectIDEs();
      expect(results).toEqual([]);
    });
  });

  // ── detectShells ─────────────────────────────────────────────────

  describe('detectShells', () => {
    it('detects unix shells by checking path access', async () => {
      mockPlatform.mockReturnValue('darwin');
      process.env.SHELL = '/bin/zsh';
      mockAccess.mockImplementation((p: string) => {
        if (p === '/bin/zsh' || p === '/bin/bash') return Promise.resolve();
        return Promise.reject(new Error('not found'));
      });

      const results = await detectShells();
      expect(results).toHaveLength(2);
      expect(results.find((s) => s.id === 'zsh')?.isDefault).toBe(true);
      expect(results.find((s) => s.id === 'bash')?.isDefault).toBe(false);
    });

    it('marks first shell as default if none match SHELL env', async () => {
      mockPlatform.mockReturnValue('linux');
      process.env.SHELL = '/usr/local/bin/fish'; // Not in candidates' paths for fish
      mockAccess.mockImplementation((p: string) => {
        if (p === '/bin/bash') return Promise.resolve();
        return Promise.reject(new Error('not found'));
      });

      const results = await detectShells();
      expect(results).toHaveLength(1);
      expect(results[0].isDefault).toBe(true); // first found becomes default
    });

    it('detects Windows shells', async () => {
      mockPlatform.mockReturnValue('win32');
      process.env.COMSPEC = 'C:\\Windows\\System32\\cmd.exe';
      mockAccess.mockRejectedValue(new Error('not found'));

      const results = await detectShells();
      expect(results.find((s) => s.id === 'cmd')).toMatchObject({
        name: 'Command Prompt',
        isDefault: true,
      });
    });

    it('detects PowerShell on Windows', async () => {
      mockPlatform.mockReturnValue('win32');
      process.env.COMSPEC = 'C:\\Windows\\System32\\cmd.exe';
      mockAccess.mockImplementation((p: string) => {
        if (p === 'C:\\Program Files\\PowerShell\\7\\pwsh.exe') return Promise.resolve();
        return Promise.reject(new Error('not found'));
      });

      const results = await detectShells();
      expect(results.find((s) => s.id === 'pwsh')).toMatchObject({
        name: 'PowerShell 7',
      });
    });
  });

  // ── readConfig ───────────────────────────────────────────────────

  describe('readConfig', () => {
    it('reads and parses config file', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({ onboarding_completed: true, theme: 'dark' })
      );

      const config = await readConfig();
      expect(config).toEqual({ onboarding_completed: true, theme: 'dark' });
    });

    it('returns defaults when file does not exist', async () => {
      mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));

      const config = await readConfig();
      expect(config).toEqual({ onboarding_completed: false });
    });

    it('returns defaults when file contains invalid JSON', async () => {
      mockReadFile.mockResolvedValueOnce('not json');

      const config = await readConfig();
      expect(config).toEqual({ onboarding_completed: false });
    });
  });

  // ── writeConfig ──────────────────────────────────────────────────

  describe('writeConfig', () => {
    it('creates config dir if missing and merges config', async () => {
      mockExistsSync.mockReturnValue(false);
      mockMkdir.mockResolvedValue(undefined);
      mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));
      mockWriteFile.mockResolvedValue(undefined);

      await writeConfig({ theme: 'dark' });

      expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('.matrix'), {
        recursive: true,
      });
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('.matrix.json'),
        JSON.stringify({ theme: 'dark' }, null, 2),
        { mode: 0o600 }
      );
    });

    it('merges with existing config', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValueOnce(JSON.stringify({ existing: 'value' }));
      mockWriteFile.mockResolvedValue(undefined);

      await writeConfig({ new_key: 'new_value' });

      const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
      expect(written).toEqual({ existing: 'value', new_key: 'new_value' });
    });

    it('sets file permissions to 0o600', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));
      mockWriteFile.mockResolvedValue(undefined);

      await writeConfig({ key: 'val' });

      expect(mockWriteFile).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
        mode: 0o600,
      });
    });
  });

  // ── resetConfig ──────────────────────────────────────────────────

  describe('resetConfig', () => {
    it('creates dir and writes defaults', async () => {
      mockExistsSync.mockReturnValue(false);
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await resetConfig();

      expect(mockMkdir).toHaveBeenCalled();
      const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
      expect(written).toEqual({ onboarding_completed: false });
    });

    it('overwrites existing config with defaults', async () => {
      mockExistsSync.mockReturnValue(true);
      mockWriteFile.mockResolvedValue(undefined);

      await resetConfig();

      const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
      expect(written).toEqual({ onboarding_completed: false });
    });
  });

  // ── setupSystemCheckHandlers ─────────────────────────────────────

  describe('setupSystemCheckHandlers', () => {
    it('registers all expected IPC handlers', () => {
      setupSystemCheckHandlers();

      const registeredChannels = mockHandle.mock.calls.map((call: unknown[]) => call[0] as string);
      expect(registeredChannels).toContain('system:check-command');
      expect(registeredChannels).toContain('system:exec-command');
      expect(registeredChannels).toContain('system:exec-stream');
      expect(registeredChannels).toContain('system:validate-executable');
      expect(registeredChannels).toContain('system:detect-terminals');
      expect(registeredChannels).toContain('system:detect-shells');
      expect(registeredChannels).toContain('system:detect-ides');
      expect(registeredChannels).toContain('config:read');
      expect(registeredChannels).toContain('config:write');
      expect(registeredChannels).toContain('config:reset');
      expect(registeredChannels).toContain('system:get-paths');
      expect(registeredChannels).toContain('shell:open-external');

      const onChannels = mockOn.mock.calls.map((call: unknown[]) => call[0] as string);
      expect(onChannels).toContain('system:exec-stream-kill');
    });

    it('shell:open-external allows https URLs', async () => {
      setupSystemCheckHandlers();

      const openExternalHandler = mockHandle.mock.calls.find(
        (call: unknown[]) => call[0] === 'shell:open-external'
      )?.[1] as IpcHandler;

      mockOpenExternal.mockResolvedValueOnce(undefined);
      await openExternalHandler({}, 'https://example.com');
      expect(mockOpenExternal).toHaveBeenCalledWith('https://example.com');
    });

    it('shell:open-external allows http URLs', async () => {
      setupSystemCheckHandlers();

      const openExternalHandler = mockHandle.mock.calls.find(
        (call: unknown[]) => call[0] === 'shell:open-external'
      )?.[1] as IpcHandler;

      mockOpenExternal.mockResolvedValueOnce(undefined);
      await openExternalHandler({}, 'http://example.com');
      expect(mockOpenExternal).toHaveBeenCalledWith('http://example.com');
    });

    it('shell:open-external rejects non-http protocols', async () => {
      setupSystemCheckHandlers();

      const openExternalHandler = mockHandle.mock.calls.find(
        (call: unknown[]) => call[0] === 'shell:open-external'
      )?.[1] as IpcHandler;

      await expect(openExternalHandler({}, 'file:///etc/passwd')).rejects.toThrow(
        'Only http/https URLs are allowed'
      );
      expect(mockOpenExternal).not.toHaveBeenCalled();
    });

    it('shell:open-external rejects javascript: protocol', async () => {
      setupSystemCheckHandlers();

      const openExternalHandler = mockHandle.mock.calls.find(
        (call: unknown[]) => call[0] === 'shell:open-external'
      )?.[1] as IpcHandler;

      await expect(openExternalHandler({}, 'javascript:alert(1)')).rejects.toThrow();
    });

    it('system:get-paths returns config, db, and workspace paths', async () => {
      setupSystemCheckHandlers();

      const getPathsHandler = mockHandle.mock.calls.find(
        (call: unknown[]) => call[0] === 'system:get-paths'
      )?.[1] as IpcHandler;

      const result = await getPathsHandler({});
      expect(result).toEqual({
        configPath: expect.stringContaining('.matrix.json'),
        dbPath: '/mock/db.path',
        workspacePath: '/mock/workspace',
      });
    });
  });
});
