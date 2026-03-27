import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: [
      {
        // Exact-match only: maps the bare directory specifier to its index file.
        // Without $ this would also rewrite @ionic/core/components/ion-*.js paths.
        find: /^@ionic\/core\/components$/,
        replacement: fileURLToPath(
          new URL('./node_modules/@ionic/core/components/index.js', import.meta.url)
        ),
      },
    ],
  },
  test: {
    server: {
      deps: {
        // Process Ionic packages through Vite so resolve.alias applies
        // to imports inside node_modules (needed for ESM dir-import fix).
        inline: ['@ionic/angular', '@ionic/core'],
      },
    },
  },
});
