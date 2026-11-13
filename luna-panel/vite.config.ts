import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Los esquemas compartidos se usan desde el código fuente: Vite los compila
      // como ESM y no hace falta buildear luna-shared para el panel.
      '@luna/shared': fileURLToPath(new URL('../luna-shared/src/index.ts', import.meta.url)),
    },
  },
  server: { port: 5173, strictPort: true },
});
