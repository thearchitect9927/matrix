import type { MatrixBrowserAPI, ExtensionContext } from '@matrix/core';
import { MyView } from './MyView';

export function activate(api: MatrixBrowserAPI, _context: ExtensionContext): void {
  api.views.register('my-view', MyView);
}
