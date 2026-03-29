#!/usr/bin/env node

/**
 * Downloads platform-specific Python (python-build-standalone) and uv binaries
 * for bundling with the Electron app.
 *
 * Versions are read from python-versions.json to stay in sync with the project.
 *
 * Usage:
 *   node scripts/download-python.mjs              # Download for current platform
 *   node scripts/download-python.mjs darwin        # Download for macOS
 *   node scripts/download-python.mjs win32         # Download for Windows
 *   node scripts/download-python.mjs linux         # Download for Linux
 *   node scripts/download-python.mjs all           # Download for all platforms
 *
 * Output structure (after extraction):
 *   resources/python/darwin-arm64/python/bin/python3
 *   resources/python/darwin-x64/python/bin/python3
 *   resources/python/win32-x64/python/python.exe
 *   resources/python/linux-x64/python/bin/python3
 *   resources/uv/darwin-arm64/uv
 *   resources/uv/darwin-x64/uv
 *   resources/uv/win32-x64/uv.exe
 *   resources/uv/linux-x64/uv
 */

import { createWriteStream, existsSync, readdirSync } from 'fs';
import { mkdir, rm, readFile, chmod, rename, cp } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESOURCES_DIR = join(__dirname, '../resources');
const DOWNLOADS_DIR = join(RESOURCES_DIR, 'downloads');

// Load version config
const versionsPath = join(__dirname, 'python-versions.json');
const versions = JSON.parse(await readFile(versionsPath, 'utf-8'));

const PYTHON_VERSION = versions.python.version;
const PBS_RELEASE = versions.python.buildStandaloneRelease;
const UV_VERSION = versions.uv.version;

// python-build-standalone URL patterns
// Extracts to: python/ (contains bin/, lib/, include/, etc.)
const PYTHON_ASSETS = {
  'darwin-arm64': `cpython-${PYTHON_VERSION}+${PBS_RELEASE}-aarch64-apple-darwin-install_only_stripped.tar.gz`,
  'darwin-x64': `cpython-${PYTHON_VERSION}+${PBS_RELEASE}-x86_64-apple-darwin-install_only_stripped.tar.gz`,
  'win32-x64': `cpython-${PYTHON_VERSION}+${PBS_RELEASE}-x86_64-pc-windows-msvc-install_only_stripped.tar.gz`,
  'linux-x64': `cpython-${PYTHON_VERSION}+${PBS_RELEASE}-x86_64-unknown-linux-gnu-install_only_stripped.tar.gz`,
};

const PBS_BASE_URL = `https://github.com/astral-sh/python-build-standalone/releases/download/${PBS_RELEASE}`;

// uv binary URL patterns
// Extracts to: uv-{target}/ (contains uv, uvx binaries)
const UV_ASSETS = {
  'darwin-arm64': { file: 'uv-aarch64-apple-darwin.tar.gz', innerDir: 'uv-aarch64-apple-darwin' },
  'darwin-x64': { file: 'uv-x86_64-apple-darwin.tar.gz', innerDir: 'uv-x86_64-apple-darwin' },
  'win32-x64': { file: 'uv-x86_64-pc-windows-msvc.zip', innerDir: 'uv-x86_64-pc-windows-msvc' },
  'linux-x64': { file: 'uv-x86_64-unknown-linux-gnu.tar.gz', innerDir: 'uv-x86_64-unknown-linux-gnu' },
};

const UV_BASE_URL = `https://github.com/astral-sh/uv/releases/download/${UV_VERSION}`;

function getArchTargets(platform) {
  switch (platform) {
    case 'darwin':
      return ['darwin-arm64', 'darwin-x64'];
    case 'win32':
      return ['win32-x64'];
    case 'linux':
      return ['linux-x64'];
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

async function downloadFile(url, destPath) {
  await mkdir(dirname(destPath), { recursive: true });

  console.log(`  Downloading: ${url}`);
  const response = await fetch(url, { redirect: 'follow' });

  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }

  const fileStream = createWriteStream(destPath);
  await pipeline(response.body, fileStream);
  console.log(`  Saved: ${destPath}`);
}

async function extractTarGz(archivePath, outputDir) {
  await mkdir(outputDir, { recursive: true });
  execSync(`tar -xzf "${archivePath}" -C "${outputDir}"`, { stdio: 'pipe' });
}

async function extractZip(archivePath, outputDir) {
  await mkdir(outputDir, { recursive: true });
  // PowerShell on Windows, unzip on Unix
  if (process.platform === 'win32') {
    execSync(
      `powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${outputDir}' -Force"`,
      { stdio: 'pipe' }
    );
  } else {
    execSync(`unzip -q -o "${archivePath}" -d "${outputDir}"`, { stdio: 'pipe' });
  }
}

/**
 * Flatten a directory: if extractPath contains a single subdirectory,
 * move its contents up to extractPath level.
 */
async function flattenSingleSubdir(extractPath, expectedSubdir) {
  const nestedDir = join(extractPath, expectedSubdir);
  if (!existsSync(nestedDir)) {
    // Try to find any single subdirectory
    const entries = readdirSync(extractPath);
    if (entries.length === 1) {
      const single = join(extractPath, entries[0]);
      const tmpDir = extractPath + '_tmp';
      await rename(single, tmpDir);
      await rm(extractPath, { recursive: true });
      await rename(tmpDir, extractPath);
    }
    return;
  }

  // Move contents of nestedDir to extractPath
  const tmpDir = extractPath + '_tmp';
  await rename(nestedDir, tmpDir);
  await rm(extractPath, { recursive: true });
  await rename(tmpDir, extractPath);
}

async function downloadPython(archTarget) {
  const asset = PYTHON_ASSETS[archTarget];
  if (!asset) {
    console.warn(`  No Python asset for: ${archTarget}`);
    return;
  }

  const extractPath = join(RESOURCES_DIR, 'python', archTarget);

  // Skip if already extracted
  if (existsSync(extractPath)) {
    console.log(`  Already exists: ${extractPath} (skipping, use --force or delete to re-download)`);
    return;
  }

  const url = `${PBS_BASE_URL}/${asset}`;
  const downloadPath = join(DOWNLOADS_DIR, `python-${archTarget}.tar.gz`);

  await downloadFile(url, downloadPath);
  await rm(extractPath, { recursive: true, force: true });
  await extractTarGz(downloadPath, extractPath);
  // python-build-standalone extracts to: extractPath/python/ which is what we want

  // Verify extraction
  const pythonBin = archTarget.startsWith('win32')
    ? join(extractPath, 'python', 'python.exe')
    : join(extractPath, 'python', 'bin', 'python3');

  if (!existsSync(pythonBin)) {
    throw new Error(`Python binary not found after extraction: ${pythonBin}`);
  }

  // Make executable (unix only)
  if (!archTarget.startsWith('win32')) {
    await chmod(pythonBin, 0o755);
  }

  console.log(`  Verified: ${pythonBin}`);
}

async function downloadUv(archTarget) {
  const uvAsset = UV_ASSETS[archTarget];
  if (!uvAsset) {
    console.warn(`  No uv asset for: ${archTarget}`);
    return;
  }

  const extractPath = join(RESOURCES_DIR, 'uv', archTarget);

  // Skip if already extracted
  if (existsSync(extractPath)) {
    console.log(`  Already exists: ${extractPath} (skipping, use --force or delete to re-download)`);
    return;
  }

  const url = `${UV_BASE_URL}/${uvAsset.file}`;
  const isZip = uvAsset.file.endsWith('.zip');
  const downloadPath = join(DOWNLOADS_DIR, `uv-${archTarget}.${isZip ? 'zip' : 'tar.gz'}`);

  await downloadFile(url, downloadPath);
  await rm(extractPath, { recursive: true, force: true });

  if (isZip) {
    await extractZip(downloadPath, extractPath);
  } else {
    await extractTarGz(downloadPath, extractPath);
  }

  // uv archives extract to a subdirectory like uv-aarch64-apple-darwin/
  // Flatten so uv binary is directly in extractPath/
  await flattenSingleSubdir(extractPath, uvAsset.innerDir);

  // Verify extraction
  const uvBin = archTarget.startsWith('win32')
    ? join(extractPath, 'uv.exe')
    : join(extractPath, 'uv');

  if (!existsSync(uvBin)) {
    throw new Error(`uv binary not found after extraction: ${uvBin}`);
  }

  // Make executable (unix only)
  if (!archTarget.startsWith('win32')) {
    await chmod(uvBin, 0o755);
  }

  console.log(`  Verified: ${uvBin}`);
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const force = process.argv.includes('--force');

  console.log(`Python ${PYTHON_VERSION} (python-build-standalone ${PBS_RELEASE})`);
  console.log(`uv ${UV_VERSION}`);

  if (force) {
    console.log('Force mode: will re-download all resources');
    await rm(join(RESOURCES_DIR, 'python'), { recursive: true, force: true });
    await rm(join(RESOURCES_DIR, 'uv'), { recursive: true, force: true });
  }

  let platforms;
  if (args.length === 0) {
    platforms = [process.platform];
  } else if (args[0] === 'all') {
    platforms = ['darwin', 'win32', 'linux'];
  } else {
    platforms = args;
  }

  console.log(`Platforms: ${platforms.join(', ')}\n`);

  for (const platform of platforms) {
    const archTargets = getArchTargets(platform);

    for (const archTarget of archTargets) {
      console.log(`\n--- Python (${archTarget}) ---`);
      await downloadPython(archTarget);

      console.log(`\n--- uv (${archTarget}) ---`);
      await downloadUv(archTarget);
    }
  }

  console.log('\nDone! Resources ready at:');
  console.log(`  ${RESOURCES_DIR}/python/`);
  console.log(`  ${RESOURCES_DIR}/uv/`);
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
