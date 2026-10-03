import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fastifyMultiplayerPlugin } from './server/src/vitePlugin';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), fastifyMultiplayerPlugin()],
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
    },
    resolve: {
      alias: {
        // Vite 8 (ESM): import.meta.dirname thay cho __dirname legacy (Giai đoạn 4).
        '@': import.meta.dirname,
      },
    },
  };
});
