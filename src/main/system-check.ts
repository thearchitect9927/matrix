/**
 * System Check & Config Management
 *
 * Handles system-level operations for the onboarding wizard:
 * - CLI command detection (which + --version)
 * - Terminal emulator detection (cross-platform)
 * - Application config read/write (~/.matrix/.matrix.json)
 * - External URL opening
 *
 * Runs in the Electron main process only.
 */

import { ipcMain, shell, BrowserWindow } from 'electron';
import { exec, execFile, spawn, type ChildProcess } from 'child_process';
import { readFile, writeFile, mkdir, readdir, access } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
import { getAppPaths } from './app-paths';

const CONFIG_DIR = join(homedir(), '.matrix');
const CONFIG_PATH = join(CONFIG_DIR, '.matrix.json');

/** Commands allowed for detection (security whitelist) */
export const ALLOWED_COMMANDS = new Set([
  'claude',
  'gemini',
  'codex',
  'git',
  'python',
  'python3',
  'node',
  'uv',
  'pnpm',
  'npm',
]);

/**
 * Get the appropriate shell for command execution based on platform
 */
export function getShell(): string {
  if (platform() === 'win32') {
    return process.env.COMSPEC || 'cmd.exe';
  }
  return process.env.SHELL || '/bin/zsh';
}

/**
 * Execute a shell command and return stdout
 */
export function execAsync(cmd: string, timeout = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout, shell: getShell() }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve((stdout || stderr).trim());
    });
  });
}

export interface CommandCheckResult {
  exists: boolean;
  path?: string;
  version?: string;
}

/**
 * Check if a command exists and get its version
 */
export async function checkCommand(command: string): Promise<CommandCheckResult> {
  // Validate: must be in whitelist AND contain only safe characters
  if (!ALLOWED_COMMANDS.has(command) || !/^[a-zA-Z0-9_-]+$/.test(command)) {
    return { exists: false };
  }

  try {
    const cmdPath = await execAsync(`which ${command}`);

    let version: string | undefined;
    try {
      const output = await execAsync(`${command} --version`);
      const match = output.match(/(\d+\.\d+(?:\.\d+)*)/);
      version = match?.[1] ?? output.split('\n')[0];
    } catch {
      // Some commands don't support --version
    }

    return { exists: true, path: cmdPath, version };
  } catch {
    return { exists: false };
  }
}

// ── Command Execution (for RunTerminal) ────────────────────────────────

export interface CommandExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** Exact install commands allowed to bypass the simple-command regex. */
export const ALLOWED_INSTALL_COMMANDS = new Set([
  'curl -fsSL https://claude.ai/install.sh | bash',
  'brew install --cask claude-code',
  'irm https://claude.ai/install.ps1 | iex',
  'curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd',
  'npm i -g @google/gemini-cli',
  'brew install gemini-cli',
  'npx @google/gemini-cli',
  'npm i -g @openai/codex',
  'brew install --cask codex',
]);

/**
 * Execute a whitelisted command and return its output.
 * Used by the RunTerminal component for read-only command execution.
 *
 * Accepts either:
 * - Simple commands whose base command is in ALLOWED_COMMANDS (regex-validated)
 * - Exact install commands from ALLOWED_INSTALL_COMMANDS (longer timeout)
 */
export async function execCommand(command: string): Promise<CommandExecResult> {
  const isInstall = ALLOWED_INSTALL_COMMANDS.has(command);

  if (!isInstall) {
    // Simple command validation (original path)
    const baseCommand = command.split(/\s+/)[0];
    if (!ALLOWED_COMMANDS.has(baseCommand) || !/^[a-zA-Z0-9_\-\s]+$/.test(command)) {
      return { success: false, stdout: '', stderr: 'Command not allowed', exitCode: 1 };
    }
  }

  const timeout = isInstall ? 120_000 : 10_000;

  return new Promise((resolve) => {
    exec(command, { timeout, shell: getShell() }, (error, stdout, stderr) => {
      const exitCode = error
        ? ((error as NodeJS.ErrnoException & { status?: number }).status ?? 1)
        : 0;
      resolve({
        success: exitCode === 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode,
      });
    });
  });
}

// ── Streaming Command Execution ─────────────────────────────────────────

const activeStreams = new Map<string, ChildProcess>();

/**
 * Execute a whitelisted command with real-time output streaming.
 * Sends `exec-stream:data` and `exec-stream:exit` events to the renderer.
 */
export function execCommandStream(sessionId: string, command: string): boolean {
  const isInstall = ALLOWED_INSTALL_COMMANDS.has(command);

  if (!isInstall) {
    const baseCommand = command.split(/\s+/)[0];
    if (!ALLOWED_COMMANDS.has(baseCommand) || !/^[a-zA-Z0-9_\-\s]+$/.test(command)) {
      return false;
    }
  }

  const shellPath = getShell();
  const child = spawn(shellPath, ['-c', command], { stdio: ['ignore', 'pipe', 'pipe'] });
  activeStreams.set(sessionId, child);

  const send = (channel: string, ...args: unknown[]) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  };

  child.stdout?.on('data', (chunk: Buffer) =>
    send('exec-stream:data', sessionId, chunk.toString())
  );
  child.stderr?.on('data', (chunk: Buffer) =>
    send('exec-stream:data', sessionId, chunk.toString())
  );

  child.on('close', (code) => {
    activeStreams.delete(sessionId);
    send('exec-stream:exit', sessionId, code ?? 1);
  });

  return true;
}

export interface ExecutableValidationResult {
  valid: boolean;
  version?: string;
  error?: string;
}

/**
 * Validate that a file path points to an executable
 */
export async function validateExecutablePath(
  filePath: string
): Promise<ExecutableValidationResult> {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: 'Invalid path' };
  }

  // Basic path sanitization
  const normalized = filePath.trim();
  if (!normalized.startsWith('/') && !normalized.match(/^[A-Z]:\\/i)) {
    return { valid: false, error: 'Path must be absolute' };
  }

  try {
    await access(normalized, fsConstants.X_OK);

    // Try to get version info (use execFile to avoid shell injection)
    let version: string | undefined;
    try {
      const output = await new Promise<string>((resolve, reject) => {
        execFile(normalized, ['--version'], { timeout: 2000 }, (error, stdout, stderr) => {
          if (error) reject(error);
          else resolve((stdout || stderr).trim());
        });
      });
      const match = output.match(/(\d+\.\d+(?:\.\d+)*)/);
      version = match?.[1];
    } catch {
      // Version check is optional
    }

    return { valid: true, version };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EACCES') return { valid: false, error: 'File is not executable' };
    return { valid: false, error: 'File not found' };
  }
}

// ── Terminal Detection ──────────────────────────────────────────────────

export interface TerminalInfo {
  id: string;
  name: string;
  path: string;
  isDefault: boolean;
}

interface TerminalCandidate {
  id: string;
  name: string;
  /** macOS: app bundle name, Linux: command name, Windows: exe path pattern */
  check: string;
}

export const MACOS_TERMINALS: TerminalCandidate[] = [
  { id: 'terminal', name: 'Terminal', check: 'Terminal.app' },
  { id: 'iterm2', name: 'iTerm2', check: 'iTerm.app' },
  { id: 'warp', name: 'Warp', check: 'Warp.app' },
  { id: 'kitty', name: 'Kitty', check: 'kitty.app' },
  { id: 'alacritty', name: 'Alacritty', check: 'Alacritty.app' },
  { id: 'hyper', name: 'Hyper', check: 'Hyper.app' },
  { id: 'rio', name: 'Rio', check: 'Rio.app' },
  { id: 'ghostty', name: 'Ghostty', check: 'Ghostty.app' },
];

export const LINUX_TERMINALS: TerminalCandidate[] = [
  { id: 'gnome-terminal', name: 'GNOME Terminal', check: 'gnome-terminal' },
  { id: 'konsole', name: 'Konsole', check: 'konsole' },
  { id: 'xfce4-terminal', name: 'XFCE Terminal', check: 'xfce4-terminal' },
  { id: 'kitty', name: 'Kitty', check: 'kitty' },
  { id: 'alacritty', name: 'Alacritty', check: 'alacritty' },
  { id: 'warp', name: 'Warp', check: 'warp-terminal' },
  { id: 'hyper', name: 'Hyper', check: 'hyper' },
  { id: 'tilix', name: 'Tilix', check: 'tilix' },
  { id: 'terminator', name: 'Terminator', check: 'terminator' },
  { id: 'xterm', name: 'XTerm', check: 'xterm' },
  { id: 'ghostty', name: 'Ghostty', check: 'ghostty' },
];

export const WINDOWS_TERMINALS: TerminalCandidate[] = [
  { id: 'windows-terminal', name: 'Windows Terminal', check: 'wt.exe' },
  { id: 'powershell', name: 'PowerShell', check: 'pwsh.exe' },
  { id: 'cmd', name: 'Command Prompt', check: 'cmd.exe' },
  { id: 'git-bash', name: 'Git Bash', check: 'git-bash.exe' },
  { id: 'hyper', name: 'Hyper', check: 'Hyper.exe' },
  { id: 'alacritty', name: 'Alacritty', check: 'alacritty.exe' },
];

/**
 * Check if a path exists (async)
 */
export async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect installed terminal emulators on macOS
 */
export async function detectMacOSTerminals(): Promise<TerminalInfo[]> {
  const results: TerminalInfo[] = [];
  const appDirs = ['/Applications', join(homedir(), 'Applications')];

  // Detect default terminal by checking LaunchServices
  let defaultTerminalId: string | undefined;
  try {
    // The default terminal handles x-man-page URLs; fallback to checking TERM_PROGRAM
    const termProgram = process.env.TERM_PROGRAM?.toLowerCase() || '';
    if (termProgram.includes('iterm')) defaultTerminalId = 'iterm2';
    else if (termProgram.includes('warp')) defaultTerminalId = 'warp';
    else if (termProgram.includes('kitty')) defaultTerminalId = 'kitty';
    else if (termProgram.includes('alacritty')) defaultTerminalId = 'alacritty';
    else if (termProgram.includes('hyper')) defaultTerminalId = 'hyper';
    else if (termProgram.includes('ghostty')) defaultTerminalId = 'ghostty';
    else defaultTerminalId = 'terminal'; // Apple Terminal
  } catch {
    defaultTerminalId = 'terminal';
  }

  for (const candidate of MACOS_TERMINALS) {
    for (const dir of appDirs) {
      const appPath = join(dir, candidate.check);
      if (await pathExists(appPath)) {
        results.push({
          id: candidate.id,
          name: candidate.name,
          path: appPath,
          isDefault: candidate.id === defaultTerminalId,
        });
        break; // Found in one dir, no need to check others
      }
    }
  }

  return results;
}

/**
 * Detect installed terminal emulators on Linux
 */
export async function detectLinuxTerminals(): Promise<TerminalInfo[]> {
  const results: TerminalInfo[] = [];

  // Detect default terminal
  let defaultTerminalId: string | undefined;
  try {
    // Check common default terminal indicators
    const termProgram = process.env.TERM_PROGRAM?.toLowerCase() || '';
    const defaultEntry = LINUX_TERMINALS.find(
      (t) => termProgram.includes(t.id) || termProgram.includes(t.check)
    );
    defaultTerminalId = defaultEntry?.id;

    // Fallback: check x-terminal-emulator symlink
    if (!defaultTerminalId) {
      try {
        const resolved = await execAsync('readlink -f /usr/bin/x-terminal-emulator');
        const matchedTerminal = LINUX_TERMINALS.find((t) =>
          resolved.toLowerCase().includes(t.check)
        );
        defaultTerminalId = matchedTerminal?.id;
      } catch {
        // x-terminal-emulator not available
      }
    }
  } catch {
    // Ignore
  }

  for (const candidate of LINUX_TERMINALS) {
    try {
      const cmdPath = await execAsync(`which ${candidate.check}`);
      if (cmdPath) {
        results.push({
          id: candidate.id,
          name: candidate.name,
          path: cmdPath,
          isDefault: candidate.id === defaultTerminalId,
        });
      }
    } catch {
      // Not installed
    }
  }

  return results;
}

/**
 * Detect installed terminal emulators on Windows
 */
export async function detectWindowsTerminals(): Promise<TerminalInfo[]> {
  const results: TerminalInfo[] = [];

  const searchPaths = [
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Microsoft', 'WindowsApps') : '',
    process.env.PROGRAMFILES || 'C:\\Program Files',
    process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)',
    process.env.SYSTEMROOT ? join(process.env.SYSTEMROOT, 'System32') : 'C:\\Windows\\System32',
  ].filter(Boolean);

  // Git Bash specific paths
  const gitBashPaths = [
    join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Git', 'git-bash.exe'),
    join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Git', 'git-bash.exe'),
  ];

  for (const candidate of WINDOWS_TERMINALS) {
    let found = false;

    // Special handling for Git Bash
    if (candidate.id === 'git-bash') {
      for (const gitPath of gitBashPaths) {
        if (await pathExists(gitPath)) {
          results.push({
            id: candidate.id,
            name: candidate.name,
            path: gitPath,
            isDefault: false,
          });
          found = true;
          break;
        }
      }
      if (found) continue;
    }

    // Check with `where` command (Windows equivalent of `which`)
    try {
      const cmdPath = await execAsync(`where ${candidate.check}`);
      const firstPath = cmdPath.split('\n')[0].trim();
      if (firstPath) {
        results.push({
          id: candidate.id,
          name: candidate.name,
          path: firstPath,
          isDefault: candidate.id === 'windows-terminal', // WT is default if installed
        });
        continue;
      }
    } catch {
      // Not found via where
    }

    // Search common paths
    for (const dir of searchPaths) {
      try {
        const files = await readdir(dir);
        if (files.some((f) => f.toLowerCase() === candidate.check.toLowerCase())) {
          results.push({
            id: candidate.id,
            name: candidate.name,
            path: join(dir, candidate.check),
            isDefault: candidate.id === 'windows-terminal',
          });
          found = true;
          break;
        }
      } catch {
        // Can't read directory
      }
    }
  }

  // If no default was marked and Windows Terminal isn't installed, mark cmd as default
  if (results.length > 0 && !results.some((r) => r.isDefault)) {
    const cmd = results.find((r) => r.id === 'cmd');
    if (cmd) cmd.isDefault = true;
  }

  return results;
}

/**
 * Detect installed terminal emulators (cross-platform)
 */
export async function detectTerminals(): Promise<TerminalInfo[]> {
  try {
    switch (platform()) {
      case 'darwin':
        return detectMacOSTerminals();
      case 'linux':
        return detectLinuxTerminals();
      case 'win32':
        return detectWindowsTerminals();
      default:
        return [];
    }
  } catch {
    return [];
  }
}

// ── IDE Detection ─────────────────────────────────────────────────────

export interface IDEInfo {
  id: string;
  name: string;
  path: string;
}

interface IDECandidate {
  id: string;
  name: string;
  /** macOS: app bundle name, Linux/Windows: command name */
  macApp?: string;
  command?: string;
  /** Windows-specific exe name */
  winExe?: string;
}

export const IDE_CANDIDATES: IDECandidate[] = [
  {
    id: 'vscode',
    name: 'VS Code',
    macApp: 'Visual Studio Code.app',
    command: 'code',
    winExe: 'Code.exe',
  },
  { id: 'cursor', name: 'Cursor', macApp: 'Cursor.app', command: 'cursor', winExe: 'Cursor.exe' },
  {
    id: 'windsurf',
    name: 'Windsurf',
    macApp: 'Windsurf.app',
    command: 'windsurf',
    winExe: 'Windsurf.exe',
  },
  {
    id: 'webstorm',
    name: 'WebStorm',
    macApp: 'WebStorm.app',
    command: 'webstorm',
    winExe: 'webstorm64.exe',
  },
  {
    id: 'intellij',
    name: 'IntelliJ IDEA',
    macApp: 'IntelliJ IDEA.app',
    command: 'idea',
    winExe: 'idea64.exe',
  },
  { id: 'zed', name: 'Zed', macApp: 'Zed.app', command: 'zed', winExe: 'zed.exe' },
  {
    id: 'sublime',
    name: 'Sublime Text',
    macApp: 'Sublime Text.app',
    command: 'subl',
    winExe: 'sublime_text.exe',
  },
  { id: 'neovim', name: 'Neovim', command: 'nvim' },
  { id: 'vim', name: 'Vim', command: 'vim' },
  { id: 'emacs', name: 'Emacs', macApp: 'Emacs.app', command: 'emacs' },
];

/**
 * Detect installed IDEs on macOS
 */
export async function detectMacOSIDEs(): Promise<IDEInfo[]> {
  const results: IDEInfo[] = [];
  const appDirs = ['/Applications', join(homedir(), 'Applications')];

  for (const candidate of IDE_CANDIDATES) {
    // Check .app bundle first
    if (candidate.macApp) {
      let found = false;
      for (const dir of appDirs) {
        const appPath = join(dir, candidate.macApp);
        if (await pathExists(appPath)) {
          results.push({ id: candidate.id, name: candidate.name, path: appPath });
          found = true;
          break;
        }
      }
      if (found) continue;
    }

    // Fallback to CLI command
    if (candidate.command) {
      try {
        const cmdPath = await execAsync(`which ${candidate.command}`);
        if (cmdPath) {
          results.push({ id: candidate.id, name: candidate.name, path: cmdPath });
        }
      } catch {
        // Not installed
      }
    }
  }

  return results;
}

/**
 * Detect installed IDEs on Linux
 */
export async function detectLinuxIDEs(): Promise<IDEInfo[]> {
  const results: IDEInfo[] = [];

  for (const candidate of IDE_CANDIDATES) {
    if (!candidate.command) continue;
    try {
      const cmdPath = await execAsync(`which ${candidate.command}`);
      if (cmdPath) {
        results.push({ id: candidate.id, name: candidate.name, path: cmdPath });
      }
    } catch {
      // Not installed
    }
  }

  return results;
}

/**
 * Detect installed IDEs on Windows
 */
export async function detectWindowsIDEs(): Promise<IDEInfo[]> {
  const results: IDEInfo[] = [];

  for (const candidate of IDE_CANDIDATES) {
    const checkName = candidate.winExe || candidate.command;
    if (!checkName) continue;

    try {
      const cmdPath = await execAsync(`where ${checkName}`);
      const firstPath = cmdPath.split('\n')[0].trim();
      if (firstPath) {
        results.push({ id: candidate.id, name: candidate.name, path: firstPath });
      }
    } catch {
      // Not installed
    }
  }

  return results;
}

/**
 * Detect installed IDEs (cross-platform)
 */
export async function detectIDEs(): Promise<IDEInfo[]> {
  try {
    switch (platform()) {
      case 'darwin':
        return detectMacOSIDEs();
      case 'linux':
        return detectLinuxIDEs();
      case 'win32':
        return detectWindowsIDEs();
      default:
        return [];
    }
  } catch {
    return [];
  }
}

// ── Config Management ───────────────────────────────────────────────────

/**
 * Read application config from ~/.matrix/.matrix.json
 */
export async function readConfig(): Promise<Record<string, unknown>> {
  try {
    const data = await readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { onboarding_completed: false };
  }
}

/**
 * Write application config to ~/.matrix/.matrix.json (merge with existing)
 */
export async function writeConfig(config: Record<string, unknown>): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }

  // Merge with existing config
  let existing: Record<string, unknown> = {};
  try {
    const data = await readFile(CONFIG_PATH, 'utf-8');
    existing = JSON.parse(data);
  } catch {
    // No existing config
  }

  const merged = { ...existing, ...config };
  await writeFile(CONFIG_PATH, JSON.stringify(merged, null, 2), { mode: 0o600 });
}

/**
 * Reset application config to defaults (overwrites entire file)
 */
export async function resetConfig(): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
  const defaults = { onboarding_completed: false };
  await writeFile(CONFIG_PATH, JSON.stringify(defaults, null, 2), { mode: 0o600 });
}

// ── Shell Detection (for PTY sessions) ──────────────────────────────────

export interface ShellInfo {
  id: string;
  name: string;
  path: string;
  isDefault: boolean;
}

/**
 * Detect available shells on the system for PTY terminal sessions.
 * Unlike detectTerminals() which finds terminal emulator apps,
 * this finds actual shell executables (zsh, bash, fish, etc.).
 */
export async function detectShells(): Promise<ShellInfo[]> {
  const defaultShell = process.env.SHELL || '/bin/zsh';
  const shells: ShellInfo[] = [];

  const candidates = [
    {
      id: 'zsh',
      name: 'Zsh',
      paths: ['/bin/zsh', '/usr/bin/zsh', '/usr/local/bin/zsh', '/opt/homebrew/bin/zsh'],
    },
    {
      id: 'bash',
      name: 'Bash',
      paths: ['/bin/bash', '/usr/bin/bash', '/usr/local/bin/bash', '/opt/homebrew/bin/bash'],
    },
    {
      id: 'fish',
      name: 'Fish',
      paths: ['/usr/local/bin/fish', '/opt/homebrew/bin/fish', '/usr/bin/fish'],
    },
    { id: 'sh', name: 'sh', paths: ['/bin/sh', '/usr/bin/sh'] },
  ];

  if (platform() === 'win32') {
    // Windows shells
    const winShells: ShellInfo[] = [];
    const comspec = process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe';
    winShells.push({ id: 'cmd', name: 'Command Prompt', path: comspec, isDefault: true });

    // Check for PowerShell
    const psPaths = [
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
    ];
    for (const ps of psPaths) {
      try {
        await access(ps);
        winShells.push({
          id: ps.includes('pwsh') ? 'pwsh' : 'powershell',
          name: ps.includes('pwsh') ? 'PowerShell 7' : 'PowerShell',
          path: ps,
          isDefault: false,
        });
      } catch {
        /* not found */
      }
    }

    return winShells;
  }

  // Unix-like (macOS, Linux)
  for (const candidate of candidates) {
    for (const shellPath of candidate.paths) {
      try {
        await access(shellPath);
        shells.push({
          id: candidate.id,
          name: candidate.name,
          path: shellPath,
          isDefault: shellPath === defaultShell,
        });
        break; // Use first found path for this shell
      } catch {
        /* not found */
      }
    }
  }

  // Ensure at least one shell is marked as default
  if (shells.length > 0 && !shells.some((s) => s.isDefault)) {
    shells[0].isDefault = true;
  }

  return shells;
}

// ── IPC Handler Registration ────────────────────────────────────────────

/**
 * Register IPC handlers for system checks and config management
 */
// ── Agent Auth Check ──────────────────────────────────────────────────────

/** Known credential file locations per agent */
const AGENT_AUTH_PATHS: Record<string, { file: string; key: string }> = {
  claude: { file: join(homedir(), '.claude', '.claude.json'), key: 'userID' },
  gemini: { file: join(homedir(), '.gemini', 'oauth_creds.json'), key: 'client_id' },
  codex: { file: join(homedir(), '.codex', 'auth.json'), key: 'token' },
};

/**
 * Check if an agent has valid auth credentials by reading its config file.
 * Returns { authenticated: true } if the expected key is present and non-empty.
 */
export async function checkAgentAuth(agentId: string): Promise<{ authenticated: boolean }> {
  const spec = AGENT_AUTH_PATHS[agentId];
  if (!spec) return { authenticated: false };

  try {
    const raw = await readFile(spec.file, 'utf-8');
    const data = JSON.parse(raw);
    const value = data[spec.key];
    return { authenticated: typeof value === 'string' && value.length > 0 };
  } catch {
    return { authenticated: false };
  }
}

export function setupSystemCheckHandlers(): void {
  // Check if a CLI command exists and get version info
  ipcMain.handle('system:check-command', async (_event, command: string) => {
    return checkCommand(command);
  });

  // Execute a whitelisted command and return output (for RunTerminal)
  ipcMain.handle('system:exec-command', async (_event, command: string) => {
    return execCommand(command);
  });

  // Start a streaming command execution (real-time output)
  ipcMain.handle('system:exec-stream', async (_event, sessionId: string, command: string) => {
    return { started: execCommandStream(sessionId, command) };
  });

  // Kill a running streaming command
  ipcMain.on('system:exec-stream-kill', (_event, sessionId: string) => {
    const child = activeStreams.get(sessionId);
    if (child) {
      child.kill();
      activeStreams.delete(sessionId);
    }
  });

  // Validate an executable file path
  ipcMain.handle('system:validate-executable', async (_event, filePath: string) => {
    return validateExecutablePath(filePath);
  });

  // Detect installed terminal emulators
  ipcMain.handle('system:detect-terminals', async () => {
    return detectTerminals();
  });

  // Detect available shells (for PTY terminal sessions)
  ipcMain.handle('system:detect-shells', async () => {
    return detectShells();
  });

  // Detect installed IDEs / code editors
  ipcMain.handle('system:detect-ides', async () => {
    return detectIDEs();
  });

  // Read application config
  ipcMain.handle('config:read', async () => {
    return readConfig();
  });

  // Write application config (merge with existing)
  ipcMain.handle('config:write', async (_event, config: Record<string, unknown>) => {
    await writeConfig(config);
    return { success: true };
  });

  // Reset application config to defaults (overwrites entire file)
  ipcMain.handle('config:reset', async () => {
    await resetConfig();
    return { success: true };
  });

  // Get application paths (for DevTools panel)
  ipcMain.handle('system:get-paths', async () => {
    const { dbPath, workspacePath } = getAppPaths();
    return { configPath: CONFIG_PATH, dbPath, workspacePath };
  });

  // Check if an agent has stored auth credentials
  ipcMain.handle('system:check-agent-auth', async (_event, agentId: string) => {
    return checkAgentAuth(agentId);
  });

  // Open URL in default browser (only allow http/https)
  ipcMain.handle('shell:open-external', async (_event, url: string) => {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Only http/https URLs are allowed');
    }
    await shell.openExternal(url);
  });
}
