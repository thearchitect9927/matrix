import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import type { ExtensionInfo, Manifest } from '@matrix/core';

/**
 * Discovers builtin and user Extensions and returns the ExtensionInfo list.
 */
export async function discoverExtensions(): Promise<ExtensionInfo[]> {
  const builtin = await scanBuiltinExtensions();
  const user = await scanUserExtensions();
  return [...builtin, ...user];
}

interface PackageJsonWithMatrix {
  matrix?: Manifest;
}

/**
 * Builtin extensions: reads the "matrix" field from each package.json.
 * Hardcoded list for Vite bundling compatibility.
 */
async function scanBuiltinExtensions(): Promise<ExtensionInfo[]> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const packages: Array<{ packageName: string; pkg: PackageJsonWithMatrix }> = [
    { packageName: '@matrix/hello-world', pkg: require('@matrix/hello-world/package.json') },
    { packageName: '@matrix/workspace', pkg: require('@matrix/workspace/package.json') },
    { packageName: '@matrix/terminal', pkg: require('@matrix/terminal/package.json') },
    { packageName: '@matrix/kanban', pkg: require('@matrix/kanban/package.json') },
    { packageName: '@matrix/github', pkg: require('@matrix/github/package.json') },
    { packageName: '@matrix/git', pkg: require('@matrix/git/package.json') },
    { packageName: '@matrix/notes', pkg: require('@matrix/notes/package.json') },
    { packageName: '@matrix/ai', pkg: require('@matrix/ai/package.json') },
  ];
  /* eslint-enable @typescript-eslint/no-require-imports */

  return packages
    .filter(({ pkg }) => pkg.matrix)
    .map(({ packageName, pkg }) => ({
      manifest: pkg.matrix!,
      builtin: true,
      path: '',
      packageName,
    }));
}

/**
 * Scan user-installed extensions from Electron userData directory.
 * Reads the "matrix" field from each extension's package.json.
 */
async function scanUserExtensions(): Promise<ExtensionInfo[]> {
  const extensionsDir = path.join(app.getPath('userData'), 'extensions');

  try {
    await fs.access(extensionsDir);
  } catch {
    return [];
  }

  const dirs = await fs.readdir(extensionsDir, { withFileTypes: true });
  const extensions: ExtensionInfo[] = [];

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;

    const pkgPath = path.join(extensionsDir, dir.name, 'package.json');
    try {
      const content = await fs.readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(content) as PackageJsonWithMatrix;
      if (pkg.matrix) {
        extensions.push({
          manifest: pkg.matrix,
          builtin: false,
          path: path.join(extensionsDir, dir.name),
          packageName: dir.name,
        });
      }
    } catch {
      console.warn(`Invalid extension package.json: ${pkgPath}`);
    }
  }

  return extensions;
}
