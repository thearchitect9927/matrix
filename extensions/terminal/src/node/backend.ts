import type { MatrixNodeAPI, ExtensionContext } from '@matrix/core';

// The existing terminal-manager.ts in main process already handles PTY.
// This backend will connect to it in Phase 5 when the main process is refactored.

export function activate(_api: MatrixNodeAPI, _context: ExtensionContext): void {
  console.log('[terminal] Node backend activated');
}
