// shots.mjs — takes the four entry screenshots listed in shots.json by driving the
// cached Chromium over CDP against the app served by serve.ts. JPEG quality starts
// at 72 and steps down until each file fits the gate's 262,144-byte cap.
// Run: node shots.mjs
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { launchBrowser, sleep, waitFor } from './cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = 8141;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const STORAGE_KEY = 'leonida-platinum-atlas-v1';
const MAX_BYTES = 262144;

const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['serve.ts', '--port', String(PORT)], {
      cwd: here, stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timer = setTimeout(() => reject(new Error('server start timed out')), 15000);
    proc.stdout.on('data', (d) => {
      if (String(d).includes('app/ is on')) { clearTimeout(timer); resolve(proc); }
    });
    proc.on('exit', (code) => { clearTimeout(timer); reject(new Error(`server exited: ${code}`)); });
  });
}

async function capture(page, file) {
  for (const quality of [72, 64, 56, 48, 40]) {
    const shot = await page.send('Page.captureScreenshot', {
      format: 'jpeg', quality, captureBeyondViewport: false,
    });
    const bytes = Buffer.from(shot.data, 'base64');
    if (bytes.length <= MAX_BYTES) {
      writeFileSync(join(here, 'screenshots', file), bytes);
      return { bytes: bytes.length, quality };
    }
    if (quality === 40) {
      writeFileSync(join(here, 'screenshots', file), bytes);
      return { bytes: bytes.length, quality, over: true };
    }
  }
}

async function applyScroll(page, shot) {
  if (shot.scrollToRow) {
    await page.evaluate(`(() => {
      const row = document.querySelector('.trophy-row[data-trophy-id="${shot.scrollToRow}"]');
      const y = row.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo(0, Math.max(0, y));
    })()`);
  } else if (shot.scroll === 'roadmap-audit') {
    await page.evaluate(`(() => {
      const audit = document.querySelector('#audit');
      const y = audit.getBoundingClientRect().top + window.scrollY - 400;
      window.scrollTo(0, Math.max(0, y));
    })()`);
  } else if (shot.scroll === 'checklist') {
    await page.evaluate(`document.querySelector('#checklist').scrollIntoView()`);
  } else {
    await page.evaluate('window.scrollTo(0, 0)');
  }
  await sleep(250);
}

async function frameCheck(page, shot) {
  // Report which key elements intersect the viewport, to confirm composition.
  return page.evaluate(`(() => {
    const vis = (sel) => [...document.querySelectorAll(sel)].some((n) => {
      const r = n.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
    });
    return {
      header: vis('.site-header'),
      controls: vis('.controls'),
      stageCard: vis('.stage-card'),
      auditRow: vis('.audit-row'),
      citation: vis('#citation-audit'),
      spoilerNote: vis('#spoiler-note'),
      trophyRow: vis('.trophy-row'),
      counter: vis('.counter'),
      sourcesLine: vis('.sources-line'),
      maskedRow: [...document.querySelectorAll('.trophy-name')].some((n) => n.textContent.includes('spoilers hidden')),
    };
  })()`);
}

const server = await startServer();
const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
  });
  for (const shot of shots) {
    await page.send('Page.navigate', { url: ORIGIN + shot.path });
    await waitFor(page, 'document.querySelectorAll(".trophy-row").length === 55');
    // Deterministic state per shot: seeded, or cleared back to first-load defaults.
    if (shot.seed) {
      await page.evaluate(`localStorage.setItem('${STORAGE_KEY}', ${JSON.stringify(JSON.stringify(shot.seed))})`);
    } else {
      await page.evaluate(`localStorage.removeItem('${STORAGE_KEY}')`);
    }
    await page.send('Page.reload');
    await waitFor(page, 'document.querySelectorAll(".trophy-row").length === 55');
    await applyScroll(page, shot);
    const result = await capture(page, shot.file);
    const frame = await frameCheck(page, shot);
    console.log(`${shot.file}: ${result.bytes} bytes @ q${result.quality}${result.over ? ' (OVER CAP)' : ''} frame=${JSON.stringify(frame)}`);
  }
} finally {
  await browser.close();
  server.kill('SIGKILL');
}
