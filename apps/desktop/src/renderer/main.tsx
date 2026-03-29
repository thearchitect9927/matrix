import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './contexts/ThemeProvider';
import { ShortcutProvider } from './contexts/ShortcutProvider';
import App from './App';
import { BrowserExtensionHost } from './extension-host/browser-extension-host';
import { ExtensionHostContext } from './extension-host/react-hooks';
import type { ExtensionInfo } from '@matrix/core';
import './index.css';

function Root() {
  const [extensionHost, setExtensionHost] = useState<BrowserExtensionHost | null>(null);

  useEffect(() => {
    async function initExtensions() {
      try {
        const extensions = (await window.api.invoke('extensions:list')) as ExtensionInfo[];
        const host = new BrowserExtensionHost();
        await host.initialize(extensions);
        setExtensionHost(host);
      } catch (err) {
        console.error('Failed to initialize Extension Host:', err);
        // Still render app without extensions
        setExtensionHost(new BrowserExtensionHost());
      }
    }
    initExtensions();
  }, []);

  return (
    <React.StrictMode>
      <ThemeProvider>
        <ShortcutProvider>
          <ExtensionHostContext.Provider value={extensionHost}>
            <App />
          </ExtensionHostContext.Provider>
        </ShortcutProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);
root.render(<Root />);
