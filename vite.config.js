import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Builds the React app into ./dist, which the Cloudflare Worker serves as
// static assets (see wrangler.jsonc + worker/index.js).
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
