import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/**
 * Mock window.api for IPC tests.
 * Each test can override specific methods via vi.mocked().
 *
 * Guard: only set up in jsdom environment (window exists).
 * Main-process tests run in node environment where window is undefined.
 */
if (typeof window !== 'undefined') {
  const mockApi = {
    sendMessage: vi.fn().mockResolvedValue({ success: true, data: {} }),
    on: vi.fn(),
    off: vi.fn(),
    checkCommand: vi.fn().mockResolvedValue({ exists: false }),
    execCommand: vi.fn().mockResolvedValue({ success: true, stdout: '', stderr: '', exitCode: 0 }),
    checkAgentAuth: vi.fn().mockResolvedValue({ authenticated: false }),
    execStream: {
      start: vi.fn().mockResolvedValue({ started: true }),
      kill: vi.fn(),
      onData: vi.fn().mockReturnValue(() => {}),
      onExit: vi.fn().mockReturnValue(() => {}),
    },
    detectTerminals: vi.fn().mockResolvedValue([]),
    detectShells: vi.fn().mockResolvedValue([]),
    detectIDEs: vi.fn().mockResolvedValue([]),
    readConfig: vi.fn().mockResolvedValue({ onboarding_completed: true }),
    writeConfig: vi.fn().mockResolvedValue({ success: true }),
    openExternal: vi.fn().mockResolvedValue(undefined),
    selectDirectory: vi.fn().mockResolvedValue(null),
    terminal: {
      create: vi
        .fn()
        .mockResolvedValue({ success: true, data: { sessionId: 'test-id', pid: 1234 } }),
      write: vi.fn(),
      resize: vi.fn(),
      close: vi.fn(),
      onData: vi.fn().mockReturnValue(() => {}),
      onExit: vi.fn().mockReturnValue(() => {}),
      saveState: vi.fn().mockResolvedValue({ success: true }),
      loadState: vi.fn().mockResolvedValue({ success: true, data: null }),
    },
  };

  Object.defineProperty(window, 'api', {
    value: mockApi,
    writable: true,
  });
}
