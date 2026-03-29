import { app } from 'electron';
import { mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const MATRIX_WORKSPACE_DIR = '.matrix';

export interface AppPaths {
  dbPath: string;
  workspacePath: string;
}

let appPaths: AppPaths;

export function initializeAppPaths(): void {
  const appDataDir = join(app.getPath('appData'), 'Matrix');
  const dbPath = join(appDataDir, 'matrix.db');
  const workspacePath = join(homedir(), MATRIX_WORKSPACE_DIR);

  mkdirSync(appDataDir, { recursive: true });
  mkdirSync(workspacePath, { recursive: true });

  appPaths = { dbPath, workspacePath };
  console.log(`Matrix app data: ${appDataDir}`);
  console.log(`Matrix workspace: ${workspacePath}`);
}

export function getAppPaths(): AppPaths {
  return appPaths;
}
