// Takes the entry's 4 screenshots with the cached Chromium over CDP — real renders of the app at 1280x800,
// JPEG, each at most 262,144 bytes (quality steps down until it fits). Run: node shots.mjs
import { writeFileSync, statSync } from 'node:fs';
import { serveApp, launchBrowser, newPage } from './cdp.mjs';

const PORT = 8912;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const KEY = 'leonida-platinum-atlas-v1';
const MAX_BYTES = 262144;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shoot(page, file) {
  for (const quality of [72, 62, 52, 42]) {
    const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality, fromSurface: true });
    const buf = Buffer.from(shot.data, 'base64');
    if (buf.length <= MAX_BYTES) {
      writeFileSync(new URL(`./screenshots/${file}`, import.meta.url), buf);
      console.log(`${file}: ${buf.length} bytes (quality ${quality})`);
      return;
    }
    console.log(`${file}: ${buf.length} bytes at quality ${quality} — too big, retrying lower`);
  }
  throw new Error(`${file} still over ${MAX_BYTES} bytes at the lowest quality`);
}

async function openSeeded(browser, seed) {
  const page = await newPage(browser);
  if (seed) {
    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('${KEY}', ${JSON.stringify(JSON.stringify(seed))});`,
    });
  }
  await page.send('Page.navigate', { url: ORIGIN + '/' });
  await page.waitFor(`document.querySelectorAll('.trophy-row').length === 55`);
  await sleep(300);
  return page;
}

const topOf = (page, selector) =>
  page.evaluate(`(() => { const r = document.querySelector('${selector}').getBoundingClientRect(); return Math.round(r.top + window.scrollY); })()`);

const server = await serveApp(PORT);
const browser = await launchBrowser();
try {
  // 1 — cover: default first load, top of page.
  {
    const page = await openSeeded(browser, null);
    await page.evaluate(`window.scrollTo(0, 0)`);
    await sleep(200);
    await shoot(page, '1-cover.jpg');
    page.close();
  }
  // 2 — roadmap cards on top, missable audit in frame below; spoilers revealed so chips show names.
  {
    const page = await openSeeded(browser, { checked: [], counters: {}, hideSpoilers: false });
    const auditTop = await topOf(page, '#audit');
    await page.evaluate(`window.scrollTo(0, ${Math.max(0, auditTop - 470)})`);
    await sleep(250);
    await shoot(page, '2-roadmap.jpg');
    page.close();
  }
  // 3 — checklist mid-progress: seeded checks and counters, a counted row in frame.
  {
    const page = await openSeeded(browser, { checked: [1, 2, 3], counters: { 9: 4, 12: 9 }, hideSpoilers: false });
    const rowTop = await topOf(page, '.trophy-row[data-id="9"]');
    await page.evaluate(`window.scrollTo(0, ${Math.max(0, rowTop - 150)})`);
    await sleep(250);
    await shoot(page, '3-audit.jpg');
    page.close();
  }
  // 4 — spoiler protection on at the checklist, masked story rows and the explaining note.
  {
    const page = await openSeeded(browser, { checked: [], counters: {}, hideSpoilers: true });
    const listTop = await topOf(page, '#checklist');
    await page.evaluate(`window.scrollTo(0, ${Math.max(0, listTop - 14)})`);
    await sleep(250);
    await shoot(page, '4-spoiler.jpg');
    page.close();
  }
} finally {
  browser.proc.kill('SIGKILL');
  server.kill('SIGKILL');
}

for (const f of ['1-cover.jpg', '2-roadmap.jpg', '3-audit.jpg', '4-spoiler.jpg']) {
  const size = statSync(new URL(`./screenshots/${f}`, import.meta.url)).size;
  console.log(`final ${f}: ${size} bytes ${size <= MAX_BYTES ? '(within cap)' : '(OVER CAP)'}`);
}
