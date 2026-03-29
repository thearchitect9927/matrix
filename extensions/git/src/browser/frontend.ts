import type { MatrixBrowserAPI, ExtensionContext } from '@matrix/core';
import { BranchesView } from './BranchesView';

export function activate(api: MatrixBrowserAPI, _context: ExtensionContext): void {
  api.views.register('git-branches', BranchesView);
}
