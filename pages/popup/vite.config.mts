import { resolve } from 'node:path';
import { withPageConfig } from '@extension/vite-config';
import { readFileSync } from 'node:fs';

const rootDir = resolve(import.meta.dirname);
const srcDir = resolve(rootDir, 'src');

// Read package.json to get the version
const packageJson = JSON.parse(readFileSync(resolve(rootDir, '..', '..', 'package.json'), 'utf8'));

export default withPageConfig({
  resolve: {
    alias: {
      '@src': srcDir,
    },
  },
  publicDir: resolve(rootDir, 'public'),
  define: {
    // Make package version available as a global constant
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    outDir: resolve(rootDir, '..', '..', 'dist', 'popup'),
  },
});
