import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          'game-data': [
            './src/data/skills.json',
            './src/data/enemies.json',
            './src/data/battle-groups.json',
            './src/data/combo-skills.json',
            './src/data/quests.json',
            './src/data/items.json',
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
