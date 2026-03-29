import { useContext, useEffect, useState } from 'react';
import { ExtensionHostContext } from './extension-host/react-hooks';
import { Sidebar } from './shell/Sidebar';
import { MainArea } from './shell/MainArea';
import { BottomPanel } from './shell/BottomPanel';

/**
 * Extension-based App Shell.
 *
 * All content is provided by Extensions via manifest contributions.
 * Sidebar items, main views, and bottom panels are auto-composed.
 */
const App: React.FC = () => {
  const extensionHost = useContext(ExtensionHostContext);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (extensionHost) {
      setReady(true);
    }
  }, [extensionHost]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          <p className="text-sm text-white/40">Loading extensions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-white">
      {/* Title bar drag region */}
      <div className="h-8 w-full shrink-0 [-webkit-app-region:drag]" />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainArea />
      </div>

      {/* Bottom panel (terminal, etc.) */}
      <BottomPanel />
    </div>
  );
};

export default App;
