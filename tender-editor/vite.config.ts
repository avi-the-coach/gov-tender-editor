import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/search': 'http://localhost:3001',
      '/analyze': 'http://localhost:3001',
      '/insights': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
    },
  },
  plugins: [react()],
  define: {
    // Read GEMINI_API_KEY directly from Windows environment (no .env file needed)
    'process.env.API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
