import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        // Vite 8 (ESM): import.meta.dirname thay cho __dirname legacy (Giai đoạn 4).
        '@': import.meta.dirname,
      },
    },
  };
});
