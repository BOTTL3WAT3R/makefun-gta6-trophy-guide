// cdp.mjs — a minimal Chrome DevTools Protocol driver over a WebSocket, used by
// shots.mjs and functest.mjs to run the cached Chromium headlessly.
// Standard library only (Node's global WebSocket client + child_process).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const CHROME = join(
  process.env.HOME,
  '.cache/ms-playwright/chromium-1255/chrome-linux64/chrome',
);

export async function launchBrowser() {
  const profile = mkdtempSync(join(tmpdir(), 'atlas-cdp-'));
  const proc = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => reject(new Error('timed out waiting for DevTools WS URL')), 20000);
    proc.stderr.on('data', (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(timer); resolve(m[1]); }
    });
    proc.on('exit', (code) => { clearTimeout(timer); reject(new Error(`chrome exited early: ${code}`)); });
  });

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
      else resolve(msg.result);
    } else if (msg.method) {
      for (const fn of listeners) fn(msg);
    }
  });

  function send(method, params = {}, sessionId) {
    const id = nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify(payload));
    });
  }

  return {
    send,
    onEvent(fn) { listeners.push(fn); },
    async newPage() {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      const page = {
        sessionId,
        targetId,
        send: (method, params = {}) => send(method, params, sessionId),
        async evaluate(expression) {
          const res = await send('Runtime.evaluate', {
            expression, returnByValue: true, awaitPromise: true,
          }, sessionId);
          if (res.exceptionDetails) {
            throw new Error('evaluate failed: ' + (res.exceptionDetails.exception?.description ?? res.exceptionDetails.text));
          }
          return res.result.value;
        },
      };
      await page.send('Page.enable');
      await page.send('Runtime.enable');
      return page;
    },
    async close() {
      try { ws.close(); } catch { /* already closed */ }
      proc.kill('SIGKILL');
      rmSync(profile, { recursive: true, force: true });
    },
  };
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function waitFor(page, expression, timeoutMs = 10000) {
  const start = Date.now();
  for (;;) {
    const ok = await page.evaluate(`Boolean(${expression})`).catch(() => false);
    if (ok) return;
    if (Date.now() - start > timeoutMs) throw new Error(`waitFor timed out: ${expression}`);
    await sleep(120);
  }
}
