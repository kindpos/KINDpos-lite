// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:8080',
    viewport: { width: 1024, height: 600 },
    actionTimeout: 10000,
    headless: true,
  },
});
