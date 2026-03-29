import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import type { ExtensionInfo, Manifest } from '@matrix/core';

/**
 * 내장 + 사용자 Extension을 탐색하여 ExtensionInfo 목록을 반환
 */
export async function discoverExtensions(): Promise<ExtensionInfo[]> {
  const builtin = await scanBuiltinExtensions();
  const user = await scanUserExtensions();
  return [...builtin, ...user];
}

/**
 * Builtin extensions: hardcoded list for Vite bundling compatibility
 */
async function scanBuiltinExtensions(): Promise<ExtensionInfo[]> {
  // Phase 1+ 에서 Extension이 추가되면 여기에 등록
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const helloManifest = require('@matrix/hello-world/manifest.json') as Manifest;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const workspaceManifest = require('@matrix/workspace/manifest.json') as Manifest;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const terminalManifest = require('@matrix/terminal/manifest.json') as Manifest;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const kanbanManifest = require('@matrix/kanban/manifest.json') as Manifest;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const githubManifest = require('@matrix/github/manifest.json') as Manifest;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const gitManifest = require('@matrix/git/manifest.json') as Manifest;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const notesManifest = require('@matrix/notes/manifest.json') as Manifest;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const aiManifest = require('@matrix/ai/manifest.json') as Manifest;

  const builtinManifests: Array<{ packageName: string; manifest: Manifest }> = [
    { packageName: '@matrix/hello-world', manifest: helloManifest },
    { packageName: '@matrix/workspace', manifest: workspaceManifest },
    { packageName: '@matrix/terminal', manifest: terminalManifest },
    { packageName: '@matrix/kanban', manifest: kanbanManifest },
    { packageName: '@matrix/github', manifest: githubManifest },
    { packageName: '@matrix/git', manifest: gitManifest },
    { packageName: '@matrix/notes', manifest: notesManifest },
    { packageName: '@matrix/ai', manifest: aiManifest },
  ];

  return builtinManifests.map(({ packageName, manifest }) => ({
    manifest,
    builtin: true,
    path: '', // 내장은 번들에 포함되므로 경로 불필요
    packageName,
  }));
}

// Scan user-installed extensions from Electron userData directory
async function scanUserExtensions(): Promise<ExtensionInfo[]> {
  const extensionsDir = path.join(app.getPath('userData'), 'extensions');

  try {
    await fs.access(extensionsDir);
  } catch {
    return []; // extensions 디렉토리 없으면 빈 목록
  }

  const dirs = await fs.readdir(extensionsDir, { withFileTypes: true });
  const extensions: ExtensionInfo[] = [];

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;

    const manifestPath = path.join(extensionsDir, dir.name, 'manifest.json');
    try {
      const content = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(content) as Manifest;
      extensions.push({
        manifest,
        builtin: false,
        path: path.join(extensionsDir, dir.name),
        packageName: dir.name,
      });
    } catch {
      console.warn(`Invalid extension manifest: ${manifestPath}`);
    }
  }

  return extensions;
}
