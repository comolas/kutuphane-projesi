import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor';
          }
          // Firebase
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase';
          }
          // Charts
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2')) {
            return 'charts';
          }
          // UI Libraries
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/sweetalert2')) {
            return 'ui-vendor';
          }
          // PDF Libraries
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/pdfjs-dist') || id.includes('node_modules/react-pdf')) {
            return 'pdf-vendor';
          }
          // Editor
          if (id.includes('node_modules/quill') || id.includes('node_modules/react-quill')) {
            return 'editor';
          }
          // Utils
          if (id.includes('node_modules/date-fns') || id.includes('node_modules/dompurify') || id.includes('node_modules/papaparse')) {
            return 'utils';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    sourcemap: false,
  },
});
