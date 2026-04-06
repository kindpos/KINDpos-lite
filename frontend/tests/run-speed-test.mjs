#!/usr/bin/env node
/**
 * Playwright runner for KINDpos HexNav vs Category-List speed test.
 * Starts the backend, loads headless Chromium, runs the speed comparison.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';

const URL = 'http://127.0.0.1:8000/';
const TIMEOUT = 60_000;

async function waitForServer(url, maxWait) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch(e) { /* not ready */ }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

(async () => {
  // Try to reach the server; if not running, start it
  let serverProc = null;
  let serverReady = false;
  try {
    const r = await fetch(URL);
    if (r.ok) serverReady = true;
  } catch(e) { /* not running */ }

  if (!serverReady) {
    console.log('Starting backend server...');
    serverProc = spawn('python', ['-m', 'uvicorn', 'backend.app.main:app', '--host', '127.0.0.1', '--port', '8000'], {
      cwd: process.cwd().replace(/\/frontend\/tests$/, '').replace(/\/frontend$/, ''),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    serverProc.stdout.on('data', d => process.stdout.write('[server] ' + d));
    serverProc.stderr.on('data', d => process.stderr.write('[server] ' + d));
    const ready = await waitForServer(URL, 15000);
    if (!ready) {
      console.error('Server failed to start');
      if (serverProc) serverProc.kill();
      process.exit(1);
    }
    console.log('Server ready.');
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 600 } });

  page.on('console', msg => process.stdout.write(msg.text() + '\n'));
  page.on('pageerror', err => console.error('[PAGE ERROR]', err.message));

  console.log('Loading KINDpos...');
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-scene="login"]', { timeout: 10000 });
  await page.waitForTimeout(1000);

  console.log('Running speed test...\n');
  const results = await page.evaluate(async () => {
    try { await import('/tests/choo-order-speed-test.js'); } catch(e) { /* self-executing */ }
    const start = Date.now();
    while (!window.KINDspeedResults && Date.now() - start < 45000) {
      await new Promise(r => setTimeout(r, 500));
    }
    return window.KINDspeedResults || { error: 'Timeout waiting for results' };
  });

  await browser.close();
  if (serverProc) serverProc.kill();

  if (results.error) {
    console.error('\nTest failed:', results.error);
    process.exit(1);
  }

  if (results.summary) {
    console.log('\n=== FINAL RESULTS (JSON) ===');
    console.log(JSON.stringify(results.summary, null, 2));
  }

  process.exit(0);
})();
