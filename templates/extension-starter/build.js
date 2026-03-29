const esbuild = require('esbuild');

// Build browser bundle
esbuild.buildSync({
  entryPoints: ['src/browser/frontend.ts'],
  bundle: true,
  outfile: 'dist/browser.js',
  format: 'esm',
  platform: 'browser',
  external: ['react', 'react-dom', '@matrix/core'],
  jsx: 'automatic',
});

// Build node bundle (optional — only if you have node/backend.ts)
try {
  esbuild.buildSync({
    entryPoints: ['src/node/backend.ts'],
    bundle: true,
    outfile: 'dist/node.js',
    format: 'cjs',
    platform: 'node',
    external: ['electron', '@matrix/core', '@matrix/workspace', '@matrix/git', '@matrix/kanban'],
  });
} catch {
  // No node backend — that's fine
}

console.log('Build complete: dist/browser.js + dist/node.js');
