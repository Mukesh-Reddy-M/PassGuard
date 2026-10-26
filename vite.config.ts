import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig, type Plugin} from 'vite';

/**
 * The production CSP in index.html is strict (connect-src 'none').
 * The dev server needs a WebSocket for hot reload and an inline React Refresh
 * preamble, so relax the policy ONLY while running `vite dev`.
 * Production builds keep the strict policy untouched.
 */
function devCspRelaxation(): Plugin {
  return {
    name: 'passguard-dev-csp',
    apply: 'serve',
    transformIndexHtml(html) {
      return html
        .replace("connect-src 'none'", "connect-src 'self' ws: wss:")
        .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'");
    },
  };
}

export default defineConfig({
  // Relative asset paths so the build works on GitHub Pages sub-paths
  // (https://<user>.github.io/<repo>/) as well as on a root domain.
  base: './',
  plugins: [react(), tailwindcss(), devCspRelaxation()],
  server: {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
});
