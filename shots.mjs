// Screenshot driver for Leonida Platinum Atlas — serves app/ and captures
// the 4 shots of shots.json at 1280x800 JPEG, each at most 256 KiB.
// Shot 1: cover (header, progress, controls, roadmap start).
// Shot 2: roadmap cards + missable audit.
// Shot 3: checklist rows with counters mid-progress (seeded state).
// Shot 4: spoiler mode on, masked story rows visible.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launchChromium, openPage, sleep, waitForHttp } from './cdp.mjs';

const PORT = 8092;
const DEBUG_PORT = 9224;
const BASE = 'http://127.0.0.1:' + PORT + '/';
const PROFILE = '/tmp/atlas-shots-profile-' + Date.now();
const OUT = import.meta.dirname;

const SEED = {
  checked: { 2: true, 3: true, 4: true },
  counters: { 15: 120, 31: 40 },
  spoilers: true,
};

async function waitForRows(page) {
  await page.evaluate(`new Promise(r => {
    const t = setInterval(() => {
      if (document.querySelectorAll('#checklist .trophy').length === 55) { clearInterval(t); r(true); }
    }, 100);
    setTimeout(() => { clearInterval(t); r(false); }, 8000);
  })`);
}

async function scrollTo(page, expression) {
  const y = await page.evaluate(expression);
  await page.evaluate(`window.scrollTo(0, ${y}); 'ok'`);
  await sleep(400);
}

const server = spawn('node', ['serve.ts', '--port', String(PORT)], {
  cwd: OUT, stdio: 'ignore',
});
const chrome = launchChromium(DEBUG_PORT, PROFILE);
const sizes = {};
try {
  await waitForHttp(BASE);
  const page = await openPage(DEBUG_PORT);

  // Shot 1 — fresh state, top of page.
  await page.navigate(BASE);
  await waitForRows(page);
  let buf = await page.screenshot(72);
  writeFileSync(join(OUT, 'screenshots/1-cover.jpg'), buf);
  sizes['1-cover.jpg'] = buf.length;

  // Shot 2 — roadmap cards + missable audit in frame.
  await scrollTo(page, `document.querySelector('.roadmap').getBoundingClientRect().top + window.scrollY - 140`);
  buf = await page.screenshot(72);
  writeFileSync(join(OUT, 'screenshots/2-roadmap.jpg'), buf);
  sizes['2-roadmap.jpg'] = buf.length;

  // Shot 3 — seeded mid-progress state, counted row in frame.
  await page.evaluate(`localStorage.setItem('leonida-platinum-atlas-v1', JSON.stringify(${JSON.stringify(SEED)})); 'ok'`);
  await page.navigate(BASE);
  await waitForRows(page);
  await scrollTo(page, `document.querySelector('.trophy[data-id="15"]').getBoundingClientRect().top + window.scrollY - 90`);
  buf = await page.screenshot(72);
  writeFileSync(join(OUT, 'screenshots/3-audit.jpg'), buf);
  sizes['3-audit.jpg'] = buf.length;

  // Shot 4 — fresh state again, spoiler masking visible in the checklist.
  await page.evaluate(`localStorage.clear(); 'ok'`);
  await page.navigate(BASE);
  await waitForRows(page);
  await scrollTo(page, `document.querySelector('#checklist').getBoundingClientRect().top + window.scrollY - 180`);
  buf = await page.screenshot(72);
  writeFileSync(join(OUT, 'screenshots/4-spoiler.jpg'), buf);
  sizes['4-spoiler.jpg'] = buf.length;

  console.log('console errors:', page.consoleErrors.length, page.consoleErrors.join(' | '));
  console.log('external requests:', page.externalRequests.length, page.externalRequests.join(', '));
  page.close();
} finally {
  chrome.kill();
  server.kill();
}
for (const [name, bytes] of Object.entries(sizes)) {
  const ok = bytes <= 262144;
  console.log((ok ? 'OK  ' : 'OVER') + ' ' + name + ' ' + bytes + ' bytes');
}
const over = Object.values(sizes).some((b) => b > 262144);
if (over) process.exit(1);
console.log('SHOTS DONE');
