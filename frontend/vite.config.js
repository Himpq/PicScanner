import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

// 解决 file:// 下 WebView2 缓存旧 picscanner-vue.js 的问题：
// 构建完成后，把 app/ui/index.html 里 vue bundle 的 <script src> 版本号
// 改写为产物文件的 mtime，确保每次重建 URL 变化、强制重新加载最新代码。
function stampVueVersion() {
  const indexPath = resolve(__dirname, '../app/ui/index.html');
  const bundlePath = resolve(__dirname, '../app/ui/assets/vue/picscanner-vue.js');
  return {
    name: 'stamp-vue-version',
    apply: 'build',
    closeBundle() {
      try {
        const mtime = Math.round(statSync(bundlePath).mtimeMs);
        let html = readFileSync(indexPath, 'utf-8');
        html = html.replace(
          /(assets\/vue\/picscanner-vue\.js)(\?v=[^"']*)?/g,
          `$1?v=${mtime}`,
        );
        writeFileSync(indexPath, html, 'utf-8');
        console.log(`[stamp-vue-version] index.html vue 版本号已更新为 mtime=${mtime}`);
      } catch (e) {
        console.warn('[stamp-vue-version] 更新 index.html 失败（忽略）:', e);
      }
    },
  };
}

export default defineConfig({
  plugins: [vue(), stampVueVersion()],
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
    // lib 模式文件名固定（picscanner-vue.js / picscanner-frontend.css），
    // 直接覆盖即可。不做清空：部分环境下回收站删除会失败，
    // 一旦清空步骤出错就会连上一版产物一起弄没，导致界面白屏。
    emptyOutDir: false,
  },
});
