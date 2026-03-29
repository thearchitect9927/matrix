import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

/**
 * Resource paths for Python runtime, uv binary, and backend source.
 * Handles dev vs production mode transparently.
 */
export interface ResourcePaths {
  /** Path to uv executable (system 'uv' in dev, bundled binary in production) */
  uvPath: string;
  /** Python options for python-shell (varies between dev and production) */
  pythonOptions: string[];
  /** Path to Python backend source directory */
  backendPath: string;
  /** Environment variables to pass to the Python process */
  env: Record<string, string>;
  /** Whether running in packaged mode */
  isProduction: boolean;
}

/**
 * Resolve resource paths based on environment (dev vs production).
 *
 * Development: Uses system `uv` and relative path to `apps/backend/`
 * Production: Uses bundled Python + uv from `process.resourcesPath`
 *
 * In production, the Resources directory is read-only, so uv's virtual
 * environment and cache are redirected to app.getPath('userData') via
 * UV_PROJECT_ENVIRONMENT and UV_CACHE_DIR environment variables.
 */
export function getResourcePaths(): ResourcePaths {
  const isProduction = app.isPackaged;

  if (isProduction) {
    const resourcesPath = process.resourcesPath;

    // Python executable (platform-specific)
    const pythonPath =
      process.platform === 'win32'
        ? join(resourcesPath, 'python', 'python', 'python.exe')
        : join(resourcesPath, 'python', 'python', 'bin', 'python3');

    // uv executable (platform-specific)
    const uvPath =
      process.platform === 'win32'
        ? join(resourcesPath, 'uv', 'uv.exe')
        : join(resourcesPath, 'uv', 'uv');

    const backendPath = join(resourcesPath, 'backend');

    // Validate critical paths (log error instead of crashing)
    for (const [name, p] of [
      ['uv', uvPath],
      ['Python', pythonPath],
      ['backend', backendPath],
    ]) {
      if (!existsSync(p)) {
        console.error(`Bundled ${name} not found: ${p}`);
      }
    }

    // Writable directories for uv (Resources/ is read-only in packaged apps)
    const userData = app.getPath('userData');
    const pythonEnvPath = join(userData, 'python-env');
    const uvCachePath = join(userData, 'uv-cache');
    mkdirSync(pythonEnvPath, { recursive: true });
    mkdirSync(uvCachePath, { recursive: true });

    return {
      uvPath,
      pythonOptions: ['run', '--python', pythonPath, 'python', '-u'],
      backendPath,
      env: {
        UV_PROJECT_ENVIRONMENT: pythonEnvPath,
        UV_CACHE_DIR: uvCachePath,
      },
      isProduction,
    };
  }

  // Development: use system uv and relative backend path
  return {
    uvPath: 'uv',
    pythonOptions: ['run', 'python', '-u'],
    backendPath: join(__dirname, '../../../backend'),
    env: {},
    isProduction,
  };
}
