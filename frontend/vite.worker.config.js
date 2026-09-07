import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

// P5-3 · QuickEdit Worker 的独立构建。
//
// 背景：应用运行在 file:// 协议下，WebView2 无法直接 `new Worker(file://...)`，
// 既有机制是「页面脚本加载 worker 源码 → app.js 取源码字符串 → Blob Worker」。
// 因此本构建的产物**不是**可直接运行的 worker 文件，而是被 closeBundle 变换成的
// 「window.PicScannerQuickEditWorkerSource = <bundle 文本>」赋值文件：
//   - 页面加载它只定义字符串，永不执行 bundle；
//   - app.js 的 Blob 路径（quickEditPreviewWorkerUrl）零改动；
//   - bundle 内联了 frontend/src/quickedit/pixel/* 共享模块（与主线程同源），
//     消除 worker 与 app.js 两份像素数学拷贝的漂移。
// 构建命令：`vite build --config vite.worker.config.js`（package.json 的 build 已串联）。

const WORKER_OUTPUT = resolve(__dirname, '../app/ui/assets/vue/quick-edit-worker.js');
const INDEX_HTML = resolve(__dirname, '../app/ui/index.html');

function stringifyWorkerBundle() {
  return {
    name: 'stringify-worker-bundle',
    apply: 'build',
    closeBundle() {
      try {
        const content = readFileSync(WORKER_OUTPUT, 'utf-8');
        // 整包变为字符串常量：页面不执行任何逻辑，Blob Worker 评估文本时
        // bundle 内的 `typeof document === 'undefined'` 守卫才会启动主循环。
        writeFileSync(WORKER_OUTPUT, 'window.PicScannerQuickEditWorkerSource = ' + JSON.stringify(content) + ';\n');
        const mtime = Math.round(statSync(WORKER_OUTPUT).mtimeMs);
        let html = readFileSync(INDEX_HTML, 'utf-8');
        html = html.replace(
          /(assets\/vue\/quick-edit-worker\.js)(\?v=[^"']*)?/g,
          `$1?v=${mtime}`,
        );
        writeFileSync(INDEX_HTML, html, 'utf-8');
        console.log(`[stringify-worker] bundle 已变换为源码字符串，index.html ?v=${mtime}`);
      } catch (e) {
        console.warn('[stringify-worker] 变换失败（忽略）:', e);
      }
    },
  };
}

export default defineConfig({
  plugins: [stringifyWorkerBundle()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: resolve(__dirname, '../app/ui/assets/quick_edit_worker.js'),
      name: 'PicScannerQuickEditWorker',
      formats: ['iife'],
      fileName: () => 'quick-edit-worker.js',
    },
    outDir: '../app/ui/assets/vue',
    emptyOutDir: false,
  },
});
