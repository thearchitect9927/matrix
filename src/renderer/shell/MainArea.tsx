import { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  useActiveView,
  useViewComponent,
  useCurrentMatrixId,
  setCurrentMatrix,
  setActiveView,
} from '../extension-host/react-hooks';
import { Box } from 'lucide-react';

export function MainArea() {
  const { activeViewId, activeViewProps } = useActiveView();
  const ViewComponent = useViewComponent(activeViewId);
  const currentMatrixId = useCurrentMatrixId();

  if (!ViewComponent) {
    return <WelcomeScreen />;
  }

  // Auto-inject matrixId and navigation helpers into all Extension views
  const injectedProps = {
    ...activeViewProps,
    matrixId: currentMatrixId,
    onSelectMatrix: (id: string) => {
      setCurrentMatrix(id);
      setActiveView('workspace-dashboard', { matrixId: id });
    },
  };

  return (
    <div className="flex-1 overflow-auto">
      <ExtensionErrorBoundary viewId={activeViewId}>
        <ViewComponent {...injectedProps} />
      </ExtensionErrorBoundary>
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-white/40">
      <Box size={48} className="mb-4" />
      <h2 className="text-lg font-medium text-white/60">Matrix</h2>
      <p className="mt-2 text-sm">Select a feature from the sidebar</p>
    </div>
  );
}

// --- Error Boundary ---

interface ErrorBoundaryProps {
  viewId: string | null;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ExtensionErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`Extension view "${this.props.viewId}" crashed:`, error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error when switching views
    if (prevProps.viewId !== this.props.viewId && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-white/40">
          <p className="text-sm font-medium text-red-400">Extension view crashed</p>
          <p className="text-xs text-white/30">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-md bg-white/10 px-3 py-1 text-xs text-white/60 hover:bg-white/20"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
