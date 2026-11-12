/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { SITE_URL } from './src/config/site';

/**
 * Injects the canonical site URL (src/config/site.ts) into index.html at
 * build time. Keeps og:image / twitter:image / og:url absolute from a single
 * source of truth — code-review fix: "OG / Twitter image URLs are relative".
 */
const siteUrlPlugin = (): Plugin => ({
  name: 'kafeely-site-url',
  transformIndexHtml(html) {
    return html.replaceAll('{{SITE_URL}}', SITE_URL);
  },
});

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), siteUrlPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    // Unit tests for the pure logic layer (utils/auth.ts, utils/storage.ts,
    // utils/validation.ts) — see tests/. Run with `npm test` / `npm run test:watch`.
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      setupFiles: ['./tests/setup.ts'],
      // Each test boots a real in-process Postgres (PGlite) and applies the
      // migrations; on Windows/CI that routinely needs more than the 5 s
      // default, especially in beforeEach hooks.
      testTimeout: 30_000,
      hookTimeout: 30_000,
    },
  };
});
