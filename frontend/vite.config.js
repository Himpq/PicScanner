import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: 'src/main.js',
      name: 'PicScannerVue',
      formats: ['iife'],
      fileName: () => 'picscanner-vue.js',
    },
    outDir: '../app/ui/assets/vue',
    emptyOutDir: true,
  },
});
