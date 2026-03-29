import type { MatrixBrowserAPI, ExtensionContext } from '@matrix/core';
import { MatrixHome } from './MatrixHome';
import { DashboardView } from './DashboardView';

export function activate(api: MatrixBrowserAPI, context: ExtensionContext): void {
  api.views.register('workspace-home', MatrixHome);
  api.views.register('workspace-dashboard', DashboardView);

  context.subscriptions.push(
    api.sidebar.onSelect('workspace-home', () => {
      api.views.open('workspace-home');
    }),
    api.sidebar.onSelect('workspace-dashboard', () => {
      api.views.open('workspace-dashboard');
    })
  );
}
