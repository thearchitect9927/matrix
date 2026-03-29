#!/usr/bin/env node

/**
 * Wrapper script for electron-builder that handles pnpm workspace symlinks.
 *
 * Problem: In pnpm monorepos, workspace packages are symlinked into node_modules.
 * electron-builder resolves these symlinks and fails when they point outside the
 * app directory. Since electron-vite already bundles workspace packages into out/,
 * they are not needed at runtime.
 *
 * Solution: Temporarily remove workspace symlinks before packaging, then restore them.
 *
 * Usage:
 *   node scripts/package.mjs --mac --publish never
 *   node scripts/package.mjs --win --publish never
 *   node scripts/package.mjs --linux --publish never
 */

import { existsSync, rmSync, symlinkSync, readlinkSync, lstatSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';


const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = join(__dirname, '..');
const matrixModulesDir = join(appDir, 'node_modules', '@matrix');

// Save and remove workspace symlinks
const savedLinks = [];

function removeWorkspaceSymlinks() {
  if (!existsSync(matrixModulesDir)) return;

  const entries = ['shared', 'ui'];
  for (const name of entries) {
    const linkPath = join(matrixModulesDir, name);
    if (existsSync(linkPath) && lstatSync(linkPath).isSymbolicLink()) {
      const target = readlinkSync(linkPath);
      savedLinks.push({ path: linkPath, target });
      rmSync(linkPath, { force: true });
      console.log(`  Removed symlink: ${linkPath} -> ${target}`);
    }
  }

  // Remove empty @matrix directory
  try {
    rmSync(matrixModulesDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function restoreWorkspaceSymlinks() {
  for (const { path: linkPath, target } of savedLinks) {
    const dir = dirname(linkPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    symlinkSync(target, linkPath);
    console.log(`  Restored symlink: ${linkPath} -> ${target}`);
  }
}

// Run electron-builder with remaining args
const args = process.argv.slice(2).join(' ');

console.log('Preparing for packaging...');
removeWorkspaceSymlinks();

try {
  console.log(`\nRunning: electron-builder ${args}\n`);
  execSync(`npx electron-builder ${args}`, {
    cwd: appDir,
    stdio: 'inherit',
    env: { ...process.env },
  });
} finally {
  console.log('\nRestoring workspace symlinks...');
  restoreWorkspaceSymlinks();
  console.log('Done.');
}
