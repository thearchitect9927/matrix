import { ipcMain, dialog, BrowserWindow } from 'electron';

/**
 * Setup dialog handlers for file/directory selection.
 *
 * Provides native OS directory picker dialog accessible from the renderer
 * process via the preload bridge.
 */
export function setupDialogHandlers(): void {
  /**
   * Show directory picker dialog.
   * Returns the selected directory path, or null if cancelled.
   */
  ipcMain.handle('dialog:select-directory', async (): Promise<string | null> => {
    const focusedWindow = BrowserWindow.getFocusedWindow();

    const result = await dialog.showOpenDialog(focusedWindow || BrowserWindow.getAllWindows()[0], {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Source Directory',
      buttonLabel: 'Select',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });
}
