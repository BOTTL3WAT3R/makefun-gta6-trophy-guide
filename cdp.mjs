// A minimal Chrome DevTools Protocol driver over the cached Chromium — no Playwright package needed.
// Used by shots.mjs (screenshots) and functest.mjs (functional tests). Node 22+ provides fetch and WebSocket.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';

export const CHROME = join(homedir(), '.cache/ms-playwright/chromium-1255/chrome-linux64/chrome');
const REPO = new URL('.', import.meta.url).pathname;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHttp(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch { /* not up yet */ }
    await sleep(150);
  }
  throw new Error(`timed out waiting for ${url}`);
}

/** Serve the repo's app/ with the starter's serve.ts on the given port. */
export async function serveApp(port) {
  const proc = spawn('node', ['serve.ts', '--port', String(port)], { cwd: REPO, stdio: 'pipe' });
  await waitForHttp(`http://127.0.0.1:${port}/`);
  return proc;
}

/** Launch headless Chromium with a fresh profile; returns { proc, port, profileDir }. */
export async function launchBrowser() {
  const port = 9300 + Math.floor(Math.random() * 500);
  const profileDir = mkdtempSync(join(tmpdir(), 'atlas-chrome-'));
  const proc = spawn(CHROME, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ], { stdio: 'pipe' });
  await waitForHttp(`http://127.0.0.1:${port}/json/version`);
  return { proc, port, profileDir };
}

/** One CDP connection to a page target: send/evaluate plus simple event listeners. */
export class Page {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners.get(msg.method) ?? []) fn(msg.params);
      }
    });
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    return new Page(ws);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error('page evaluation failed: ' + (result.exceptionDetails.exception?.description ?? result.exceptionDetails.text));
    }
    return result.result.value;
  }

  /** Poll an expression until it returns truthy (or time out). */
  async waitFor(expression, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.evaluate(expression)) return true;
      await sleep(120);
    }
    throw new Error(`timed out waiting for: ${expression}`);
  }

  close() {
    try { this.ws.close(); } catch { /* already closed */ }
  }
}

/** Open a fresh page target in the browser and set a 1280x800 viewport. */
export async function newPage(browser) {
  const res = await fetch(`http://127.0.0.1:${browser.port}/json/new?about:blank`, { method: 'PUT' });
  if (!res.ok) throw new Error(`could not create a page target: HTTP ${res.status}`);
  const target = await res.json();
  const page = await Page.connect(target.webSocketDebuggerUrl);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
  });
  return page;
}
