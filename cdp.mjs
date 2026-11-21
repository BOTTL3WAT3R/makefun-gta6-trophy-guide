// Minimal CDP driver over Node's built-in WebSocket — drives the cached
// Chromium (no Playwright package installed) for screenshots and functests.
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const CHROME = join(homedir(), '.cache/ms-playwright/chromium-1255/chrome-linux64/chrome');

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForHttp(url, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('never came up: ' + url);
}

export function launchChromium(debugPort, userDataDir) {
  const child = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + debugPort,
    '--user-data-dir=' + userDataDir,
    '--window-size=1280,800', '--hide-scrollbars',
    '--force-device-scale-factor=1', 'about:blank',
  ], { stdio: 'ignore' });
  return child;
}

export async function openPage(debugPort) {
  await waitForHttp('http://127.0.0.1:' + debugPort + '/json/version');
  const targets = await (await fetch('http://127.0.0.1:' + debugPort + '/json')).json();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let nextId = 1;
  const pending = new Map();
  const consoleErrors = [];
  const externalRequests = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push('exception: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 300));
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push('console.error: ' + JSON.stringify(msg.params.args).slice(0, 300));
    } else if (msg.method === 'Network.requestWillBeSent') {
      const url = msg.params.request.url;
      if (!url.startsWith('http://127.0.0.1:') && !url.startsWith('http://localhost:') && !url.startsWith('data:')) {
        externalRequests.push(url);
      }
    }
  };
  async function send(method, params = {}) {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  // Pin the viewport to 1280x800: headless Chrome otherwise defaults to 800x600
  // regardless of --window-size.
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
  });
  return {
    send,
    consoleErrors,
    externalRequests,
    async navigate(url) {
      await send('Page.navigate', { url });
      await sleep(1200);
    },
    async evaluate(expression) {
      const result = await send('Runtime.evaluate', {
        expression, awaitPromise: true, returnByValue: true,
      });
      if (result.exceptionDetails) {
        throw new Error('evaluate failed: ' + JSON.stringify(result.exceptionDetails).slice(0, 400));
      }
      return result.result.value;
    },
    async screenshot(quality = 72) {
      // Plain viewport capture: a clip region taller than the viewport
      // renders the overflow as blank background in headless Chrome.
      const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality });
      return Buffer.from(shot.data, 'base64');
    },
    close() { ws.close(); },
  };
}
