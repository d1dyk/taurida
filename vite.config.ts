import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { defineConfig } from 'vite';
import { apiRouter } from './src/server/api';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-server',
        configureServer(server) {
          const app = express();
          app.use(express.json({ limit: '50mb' }));
          app.use(express.urlencoded({ extended: true, limit: '50mb' }));
          app.use(cookieParser());
          app.use('/api', apiRouter);
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
          app.use('/uploads', express.static(uploadsDir));
          server.middlewares.use(app);
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
