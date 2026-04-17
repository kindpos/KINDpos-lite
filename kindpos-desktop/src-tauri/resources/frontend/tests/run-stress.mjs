#!/usr/bin/env node
/**
 * Playwright runner for KINDpos frontend stress tests.
 * Loads the app in headless Chromium, injects stress-test.js, captures results.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const URL = 'http://127.0.0.1:8000/';
const TIMEOUT = 120_000; // 2 minutes max

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 600 } });

  // Collect console output
  const consoleLines = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLines.push(text);
    process.stdout.write(text + '\n');
  });

  // Collect page errors
  page.on('pageerror', err => {
    console.error('[PAGE ERROR]', err.message);
  });

  console.log('Loading KINDpos at ' + URL + '...');
  await page.goto(URL, { waitUntil: 'domcontentloaded' });

  // Wait for the app to boot (login scene to render)
  await page.waitForSelector('[data-scene="login"]', { timeout: 10000 });
  console.log('App loaded. Login scene visible.');

  // Give the app a moment to fully initialize
  await page.waitForTimeout(1000);

  // Inject and run the stress test
  console.log('Injecting stress-test.js...\n');

  const results = await page.evaluate(async () => {
    // Dynamic import of the stress test module
    try {
      await import('/tests/stress-test.js');
    } catch(e) {
      // The module auto-runs and assigns window.KINDstressResults
      console.error('Import error (may be normal if self-executing):', e.message);
    }

    // Wait for results with polling
    const start = Date.now();
    while (!window.KINDstressResults && Date.now() - start < 90000) {
      await new Promise(r => setTimeout(r, 500));
    }
    return window.KINDstressResults || { error: 'Timeout waiting for results' };
  });

  console.log('\n=== STRESS TEST RESULTS (JSON) ===');
  console.log(JSON.stringify(results, null, 2));

  await browser.close();

  // Exit with error code if failures
  if (results.totalFail > 0) {
    process.exit(1);
  }
  process.exit(0);
})();
