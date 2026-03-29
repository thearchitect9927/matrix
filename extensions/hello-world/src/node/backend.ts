import type { MatrixNodeAPI, ExtensionContext } from '@matrix/core';

export function activate(_api: MatrixNodeAPI, _context: ExtensionContext): void {
  console.log('[hello-world] Node backend activated');
}

export function deactivate(): void {
  console.log('[hello-world] Node backend deactivated');
}
