import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 10000 },
  use: {
    baseURL: 'http://127.0.0.1:3100',
    headless: true,
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 360, height: 800 }, isMobile: true } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
  ],
  webServer: process.env.E2E_EXTERNAL
    ? undefined
    : {
        command: 'npm run dev -- --port 3100',
        url: 'http://127.0.0.1:3100',
        reuseExistingServer: false,
        timeout: 90000,
        env: {
          NEXT_DIST_DIR: '.next-e2e',
          NEXT_PUBLIC_BACKEND: 'local',
          LOCAL_DATA_PATH: '.local-data/e2e.json',
        },
      },
});
