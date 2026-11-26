import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      // Dev-only middleware so /api/checkout and /api/verify work under `npm run dev`
      {
        name: 'polypet-dev-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const pathname = (req.url ?? '').split('?')[0];
            if (pathname !== '/api/checkout' && pathname !== '/api/verify') {
              next();
              return;
            }
            try {
              const mod = await server.ssrLoadModule(`/api/${pathname.slice(5)}.ts`);
              await mod.default(req, res);
            } catch (err) {
              server.ssrFixStacktrace(err as Error);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(
                JSON.stringify({
                  error: err instanceof Error ? err.message : 'Internal dev API error',
                })
              );
            }
          });
        },
      },
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
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
  };
});
