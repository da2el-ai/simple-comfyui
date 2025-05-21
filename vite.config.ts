import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ command }) => ({
  root: resolve(__dirname, 'src'), // srcをルートにする
  publicDir: resolve(__dirname, 'public'), // publicアセットの場所も手動指定（オプション）
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: resolve(__dirname, 'dist'), // 出力はプロジェクト直下のdist
    minify: command === 'build' ? 'esbuild' : false, // 開発時は難読化しない
    sourcemap: command !== 'build', // 開発時はソースマップを生成
    rollupOptions: {
      output: {
        entryFileNames: 'bundle.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'index.css' || assetInfo.name === 'style.css') return 'common.css';
          return '[name].[ext]';
        }
      }
    }
  }
}))
