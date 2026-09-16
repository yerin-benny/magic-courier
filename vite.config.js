import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // 학교 PC에서 상대 경로로도 열리도록 base를 상대 경로로 둔다
  base: './',
  build: {
    outDir: 'dist',
    // 오래된 Windows 학교 PC의 브라우저를 고려해 지나치게 최신 문법을 남기지 않는다
    target: 'es2019',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        // 개발용 페이지. 배포 시에는 dist/dev 를 올리지 않는다.
        devInput: resolve(__dirname, 'dev/input.html'),
        devAssets: resolve(__dirname, 'dev/assets.html'),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
