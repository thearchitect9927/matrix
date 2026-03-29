import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { Matrix } from '@shared/types/matrix';
import { MatrixTabBar } from '@/components/layout/MatrixTabBar';
import { ContextSidebar, type ContextItemId } from '@/components/layout/ContextSidebar';
import { OnboardingView } from '@/components/layout/OnboardingView';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { HomeView } from '@/components/home/HomeView';
import { KanbanBoard } from '@/components/workflow/KanbanBoard';
import { PipelineEditor } from '@/components/workflow/PipelineEditor';
import { TerminalManager } from '@/components/terminal/TerminalManager';
import { MCPControl } from '@/components/agent/MCPControl';
import { PRsView } from '@/components/workspace/PRsView';
import { IssuesView } from '@/components/workspace/IssuesView';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { MatrixForm, type MatrixFormValues } from '@/components/matrix/MatrixForm';
import { DashboardView } from '@/components/matrix/DashboardView';
import { DevToolsModal } from '@/components/devtools/DevToolsModal';
import { useShortcutAction } from '@/hooks/useShortcutAction';
import { useShortcuts } from '@/contexts/ShortcutProvider';
import type { ShortcutActionId } from '@shared/types/shortcuts';

/**
 * Main App component for Matrix desktop application
 *
 * New layout: MatrixTabBar on top, ContextSidebar + main content in flex row.
 * Each matrix is a tab; selecting a tab shows its contextual sidebar.
 */
// ── Persistent matrices cache (localStorage — survives HMR + app restart) ──
const MATRICES_CACHE_KEY = 'matrix:matrices-cache';

interface MatricesCacheEntry {
  matrices: Matrix[];
  timestamp: number;
}

function readMatricesCache(): MatricesCacheEntry | null {
  try {
    const raw = localStorage.getItem(MATRICES_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MatricesCacheEntry;
  } catch {
    return null;
  }
}

function writeMatricesCache(entry: MatricesCacheEntry): void {
  try {
    localStorage.setItem(MATRICES_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — ignore
  }
}

const App: React.FC = () => {
  const initialMatricesCache = readMatricesCache();

  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [matrices, setMatrices] = useState<Matrix[]>(initialMatricesCache?.matrices ?? []);
  const [activeMatrixId, setActiveMatrixId] = useState<string | null>(null);
  const [isHomeActive, setIsHomeActive] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const [activeContextItem, setActiveContextItem] = useState<ContextItemId>('kanban');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMatrix, setEditingMatrix] = useState<Matrix | null>(null);
  const [isLoading, setIsLoading] = useState(initialMatricesCache === null);

  /**
   * Fetch matrices from backend and optionally navigate to Home.
   * Uses stale-while-revalidate: if cache exists, skip the loading screen
   * and refresh in the background.
   */
  const fetchMatrices = useCallback(async (navigateToHome = false) => {
    // Only show full-screen loading on the very first load (no cache)
    if (!readMatricesCache()) {
      setIsLoading(true);
    }
    try {
      const response = await window.api.sendMessage({ type: 'matrix-list' });
      if (response.success && response.data) {
        const loaded = (response.data as { matrices: Matrix[] }).matrices || [];
        writeMatricesCache({ matrices: loaded, timestamp: Date.now() });
        setMatrices(loaded);
        if (navigateToHome && loaded.length > 0) {
          setIsHomeActive(true);
        }
      }
    } catch {
      // Silently handle - matrices will be empty
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initialize app: check onboarding status, then fetch matrices
   */
  useEffect(() => {
    const init = async () => {
      try {
        const config = await window.api.readConfig().catch(() => ({ onboarding_completed: false }));
        const needsOnboarding = !config.onboarding_completed;
        setShowOnboarding(needsOnboarding);

        if (!needsOnboarding) {
          // If we have cached matrices, navigate immediately and refresh in background
          const cached = readMatricesCache();
          if (cached && cached.matrices.length > 0) {
            setIsHomeActive(true);
          }
          fetchMatrices(true);
        }
      } catch {
        // If config check fails, skip onboarding and go to app
        setShowOnboarding(false);
        fetchMatrices(true);
      }
    };
    init();
  }, [fetchMatrices]);

  /**
   * Handle onboarding completion
   */
  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    fetchMatrices(true);
  }, [fetchMatrices]);

  /**
   * Select the Home tab
   */
  const handleSelectHome = useCallback(() => {
    setActiveMatrixId(null);
    setIsHomeActive(true);
  }, []);

  /**
   * Select a matrix tab
   */
  const handleSelectMatrix = useCallback((id: string) => {
    setActiveMatrixId(id);
    setIsHomeActive(false);
  }, []);

  /**
   * Toggle global settings modal
   */
  const handleToggleSettings = useCallback(() => {
    setShowGlobalSettings((prev) => !prev);
  }, []);

  const handleToggleDevTools = useCallback(() => {
    setShowDevTools((prev) => !prev);
  }, []);

  /**
   * Handle data reset from DevTools (refresh matrices list)
   */
  const handleDevToolsDataReset = useCallback(() => {
    fetchMatrices(true);
  }, [fetchMatrices]);

  /**
   * Handle onboarding toggle from DevTools (immediately reflect in app)
   */
  const handleOnboardingToggle = useCallback(
    (completed: boolean) => {
      setShowOnboarding(!completed);
      if (completed) {
        fetchMatrices(true);
      }
    },
    [fetchMatrices]
  );

  /**
   * Open create matrix form
   */
  const handleOpenCreateForm = useCallback(() => {
    setIsFormOpen(true);
  }, []);

  /**
   * Create a new matrix via IPC
   */
  const handleCreateMatrix = useCallback(async (values: MatrixFormValues) => {
    const response = await window.api.sendMessage({
      type: 'matrix-create',
      data: { name: values.name },
    });

    if (response.success && response.data) {
      const newMatrix = (response.data as { matrix: Matrix }).matrix;
      setMatrices((prev) => [...prev, newMatrix]);
      setActiveMatrixId(newMatrix.id);
      setIsHomeActive(false);
      setIsFormOpen(false);
    } else {
      throw new Error(response.error || 'Failed to create matrix');
    }
  }, []);

  /**
   * Close (delete) a matrix tab
   */
  const handleCloseMatrix = useCallback(
    async (id: string) => {
      const matrix = matrices.find((m) => m.id === id);
      if (!matrix) return;

      const confirmed = window.confirm(
        `Are you sure you want to delete "${matrix.name}"? This action cannot be undone.`
      );
      if (!confirmed) return;

      try {
        const response = await window.api.sendMessage({
          type: 'matrix-delete',
          data: { id },
        });

        if (response.success) {
          setMatrices((prev) => {
            const remaining = prev.filter((m) => m.id !== id);
            // If we deleted the active tab, go to Home
            if (activeMatrixId === id) {
              setActiveMatrixId(null);
              setIsHomeActive(remaining.length > 0);
            }
            return remaining;
          });
        }
      } catch {
        // Silently handle
      }
    },
    [matrices, activeMatrixId]
  );

  /**
   * Open edit form for a matrix
   */
  const handleEditMatrix = useCallback(
    (id: string) => {
      const matrix = matrices.find((m) => m.id === id);
      if (matrix) setEditingMatrix(matrix);
    },
    [matrices]
  );

  /**
   * Update matrix name via IPC
   */
  const handleUpdateMatrix = useCallback(
    async (values: MatrixFormValues) => {
      if (!editingMatrix) return;

      const response = await window.api.sendMessage({
        type: 'matrix-update',
        data: { id: editingMatrix.id, name: values.name },
      });

      if (response.success && response.data) {
        const updated = (response.data as { matrix: Matrix }).matrix;
        setMatrices((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setEditingMatrix(null);
      } else {
        throw new Error(response.error || 'Failed to update matrix');
      }
    },
    [editingMatrix]
  );

  // ── Keyboard shortcut registrations ──
  const noModal = !showGlobalSettings && !showDevTools && !isFormOpen && !editingMatrix;
  const canSwitchContext = !!activeMatrixId && !isHomeActive && noModal;

  // Tab shortcuts: ⌘1 = Home, ⌘2–⌘9 = matrix tabs by position, ⌘9 = last tab
  const { registerAction } = useShortcuts();
  useEffect(() => {
    if (!noModal) return;

    const cleanups: (() => void)[] = [];
    for (let i = 1; i <= 9; i++) {
      const actionId = `tab-${i}` as ShortcutActionId;
      cleanups.push(
        registerAction(actionId, () => {
          if (i === 1) {
            handleSelectHome();
          } else if (i === 9) {
            // ⌘9 = last tab
            if (matrices.length > 0) {
              handleSelectMatrix(matrices[matrices.length - 1].id);
            }
          } else {
            const idx = i - 2; // tab-2 = matrices[0]
            if (idx < matrices.length) {
              handleSelectMatrix(matrices[idx].id);
            }
          }
        })
      );
    }
    return () => cleanups.forEach((c) => c());
  }, [registerAction, matrices, handleSelectHome, handleSelectMatrix, noModal]);

  // Navigation shortcuts
  useShortcutAction('toggle-settings', handleToggleSettings);
  useShortcutAction('toggle-devtools', handleToggleDevTools, noModal);
  useShortcutAction('create-matrix', handleOpenCreateForm, noModal);

  // Context sidebar shortcuts (⌘+letter)
  useShortcutAction(
    'context-kanban',
    useCallback(() => setActiveContextItem('kanban'), []),
    canSwitchContext
  );
  useShortcutAction(
    'context-pipeline',
    useCallback(() => setActiveContextItem('pipeline'), []),
    canSwitchContext
  );
  useShortcutAction(
    'context-ideation',
    useCallback(() => setActiveContextItem('ideation'), []),
    canSwitchContext
  );
  useShortcutAction(
    'context-ctx',
    useCallback(() => setActiveContextItem('ctx'), []),
    canSwitchContext
  );
  useShortcutAction(
    'context-console',
    useCallback(() => setActiveContextItem('console'), []),
    canSwitchContext
  );
  useShortcutAction(
    'context-mcp',
    useCallback(() => setActiveContextItem('mcp'), []),
    canSwitchContext
  );
  useShortcutAction(
    'context-dashboard',
    useCallback(() => setActiveContextItem('dashboard'), []),
    canSwitchContext
  );
  useShortcutAction(
    'context-worktree',
    useCallback(() => setActiveContextItem('worktree'), []),
    canSwitchContext
  );
  useShortcutAction(
    'context-pr',
    useCallback(() => setActiveContextItem('pr'), []),
    canSwitchContext
  );
  useShortcutAction(
    'context-issue',
    useCallback(() => setActiveContextItem('issue'), []),
    canSwitchContext
  );

  /**
   * Render content based on active context item
   */
  const renderContent = () => {
    // Home view: full-width grid, no sidebar
    if (isHomeActive && !activeMatrixId) {
      return (
        <HomeView
          matrices={matrices}
          onSelectMatrix={handleSelectMatrix}
          onCreateMatrix={handleOpenCreateForm}
        />
      );
    }

    if (!activeMatrixId) return null;

    switch (activeContextItem) {
      // Task
      case 'kanban':
        return <KanbanBoard />;
      case 'pipeline':
        return <PipelineEditor />;
      case 'ideation':
        return (
          <div className="flex h-full items-center justify-center text-text-muted">
            Ideation — Coming soon
          </div>
        );
      // Agent
      case 'ctx':
        return (
          <div className="flex h-full items-center justify-center text-text-muted">
            Context — Coming soon
          </div>
        );
      case 'console':
        // Terminal is rendered separately (always mounted) — return null here
        return null;
      case 'mcp':
        return <MCPControl />;
      // Source
      case 'dashboard':
        return <DashboardView key={activeMatrixId} matrixId={activeMatrixId} />;
      case 'worktree':
        return (
          <div className="flex h-full items-center justify-center text-text-muted">
            Worktree — Coming soon
          </div>
        );
      case 'pr':
        return (
          <PRsView
            key={activeMatrixId}
            sourceIds={matrices.find((m) => m.id === activeMatrixId)?.source_ids ?? []}
          />
        );
      case 'issue':
        return (
          <IssuesView
            key={activeMatrixId}
            sourceIds={matrices.find((m) => m.id === activeMatrixId)?.source_ids ?? []}
          />
        );
      default:
        return <KanbanBoard />;
    }
  };

  // Show loading while checking onboarding status
  if (showOnboarding === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-base-900">
        <div className="text-sm text-text-muted">Loading...</div>
      </div>
    );
  }

  // Show onboarding wizard
  if (showOnboarding) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  // Show loading while fetching matrices
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-base-900">
        <div className="text-sm text-text-muted">Loading...</div>
      </div>
    );
  }

  // No matrices - show onboarding
  if (matrices.length === 0 && !isFormOpen) {
    return (
      <div className="flex h-screen w-full flex-col bg-base-900">
        {/* Empty tab bar with just the Home + button */}
        <MatrixTabBar
          matrices={[]}
          activeMatrixId={null}
          isHomeActive={isHomeActive}
          isSettingsActive={showGlobalSettings}
          isDevToolsActive={showDevTools}
          onSelectMatrix={() => {}}
          onSelectHome={handleSelectHome}
          onCreateMatrix={handleOpenCreateForm}
          onCloseMatrix={() => {}}
          onOpenSettings={handleToggleSettings}
          onOpenDevTools={handleToggleDevTools}
        />
        <OnboardingView onCreateMatrix={handleOpenCreateForm} />

        {isFormOpen && (
          <FormModal onSubmit={handleCreateMatrix} onCancel={() => setIsFormOpen(false)} />
        )}
      </div>
    );
  }

  const showSidebar = activeMatrixId !== null && !isHomeActive;

  return (
    <div className="flex h-screen w-full flex-col bg-base-900">
      {/* Matrix Tab Bar */}
      <MatrixTabBar
        matrices={matrices}
        activeMatrixId={activeMatrixId}
        isHomeActive={isHomeActive}
        isSettingsActive={showGlobalSettings}
        isDevToolsActive={showDevTools}
        onSelectMatrix={handleSelectMatrix}
        onSelectHome={handleSelectHome}
        onCreateMatrix={handleOpenCreateForm}
        onCloseMatrix={handleCloseMatrix}
        onEditMatrix={handleEditMatrix}
        onOpenSettings={handleToggleSettings}
        onOpenDevTools={handleToggleDevTools}
      />

      {/* Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && (
          <ContextSidebar activeItem={activeContextItem} onItemSelect={setActiveContextItem} />
        )}

        {/* Content area — relative container for stacking main + terminal */}
        <div className="relative flex-1 overflow-hidden">
          {/* Regular content (non-terminal views, or Home view) */}
          {(isHomeActive || activeContextItem !== 'console') && (
            <main
              className={cn(
                'h-full overflow-auto animate-fade-in',
                showSidebar && activeContextItem !== 'issue' && activeContextItem !== 'pr' && 'p-4'
              )}
            >
              {renderContent()}
            </main>
          )}

          {/* Terminal — always mounted, uses visibility instead of display
              to preserve container dimensions and avoid ResizeObserver flicker */}
          {activeMatrixId && (
            <div
              className={cn(
                'absolute inset-0 overflow-hidden',
                (isHomeActive || activeContextItem !== 'console') && 'invisible pointer-events-none'
              )}
            >
              <TerminalManager
                workspacePath={matrices.find((m) => m.id === activeMatrixId)?.workspace_path}
              />
            </div>
          )}
        </div>
      </div>

      {/* Settings modal overlay */}
      {showGlobalSettings && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
          onClick={() => setShowGlobalSettings(false)}
          onKeyDown={(e) => e.key === 'Escape' && setShowGlobalSettings(false)}
        >
          <div
            className="h-[85vh] w-full max-w-5xl animate-slide-in overflow-hidden rounded-xl border border-border-default bg-base-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SettingsPage
              initialSection="appearance"
              onClose={() => setShowGlobalSettings(false)}
            />
          </div>
        </div>
      )}

      {/* DevTools modal overlay (dev mode only) */}
      {import.meta.env.DEV && showDevTools && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-label="DevTools"
          onClick={() => setShowDevTools(false)}
          onKeyDown={(e) => e.key === 'Escape' && setShowDevTools(false)}
        >
          <div
            className="h-[70vh] w-full max-w-2xl animate-slide-in overflow-hidden rounded-xl border border-border-default bg-base-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <DevToolsModal
              onClose={() => setShowDevTools(false)}
              onDataReset={handleDevToolsDataReset}
              onOnboardingToggle={handleOnboardingToggle}
            />
          </div>
        </div>
      )}

      {/* Create matrix form modal */}
      {isFormOpen && (
        <FormModal onSubmit={handleCreateMatrix} onCancel={() => setIsFormOpen(false)} />
      )}

      {/* Edit matrix form modal */}
      {editingMatrix && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
          onClick={() => setEditingMatrix(null)}
        >
          <div className="w-full max-w-md animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <MatrixForm
              mode="edit"
              matrix={editingMatrix}
              onSubmit={handleUpdateMatrix}
              onCancel={() => setEditingMatrix(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Modal wrapper for the matrix creation form
 */
interface FormModalProps {
  onSubmit: (values: MatrixFormValues) => void | Promise<void>;
  onCancel: () => void;
}

const FormModal: React.FC<FormModalProps> = ({ onSubmit, onCancel }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    role="dialog"
    aria-modal="true"
    onClick={onCancel}
  >
    <div className="w-full max-w-md animate-slide-in" onClick={(e) => e.stopPropagation()}>
      <MatrixForm mode="create" matrix={null} onSubmit={onSubmit} onCancel={onCancel} />
    </div>
  </div>
);

export default App;
