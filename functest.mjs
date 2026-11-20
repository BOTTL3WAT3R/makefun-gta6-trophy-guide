// functest.mjs — end-to-end checks for the Leonida Platinum Atlas app, driven
// over CDP against the app served by serve.ts. Asserts row counts, filters,
// spoiler masking, persistence, roadmap/audit/citation rendering, counter-driven
// progress, and that the app makes zero external requests and logs zero errors.
// Run: node functest.mjs
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { launchBrowser, sleep, waitFor } from './cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = 8177;
const ORIGIN = `http://127.0.0.1:${PORT}`;

let passed = 0;
let failed = 0;
function check(label, cond, detail = '') {
  if (cond) { passed++; console.log(`PASS ${label}`); }
  else { failed++; console.log(`FAIL ${label}${detail ? ' — ' + detail : ''}`); }
}

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

const server = await startServer();
const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  const requests = [];
  const consoleErrors = [];
  browser.onEvent((msg) => {
    if (msg.sessionId !== page.sessionId) return;
    if (msg.method === 'Network.requestWillBeSent') requests.push(msg.params.request.url);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(JSON.stringify(msg.params.args?.map((a) => a.value ?? a.description) ?? []));
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      consoleErrors.push(msg.params.entry.text);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push('exception: ' + (msg.params.exceptionDetails?.exception?.description ?? ''));
    }
  });
  await page.send('Network.enable');
  await page.send('Log.enable');
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
  });

  await page.send('Page.navigate', { url: ORIGIN + '/' });
  await waitFor(page, 'document.querySelectorAll(".trophy-row").length === 55');

  // 1. Exactly 55 checklist rows.
  check('checklist renders exactly 55 rows',
    await page.evaluate('document.querySelectorAll(".trophy-row").length') === 55);

  // 2. Roadmap renders 9 stages; audit renders 14 rows.
  check('roadmap renders 9 stages',
    await page.evaluate('document.querySelectorAll(".stage-card").length') === 9);
  check('missable audit renders 14 rows',
    await page.evaluate('document.querySelectorAll(".audit-row").length') === 14);

  // 3. Citation audit line carries the real counts from the data file.
  const data = await (await fetch(ORIGIN + '/data/trophies.json')).json();
  const totalSteps = data.trophies.reduce((s, t) => s + t.steps.length, 0);
  const citedSteps = data.trophies.reduce((s, t) => s + t.steps.filter((x) => x.source).length, 0);
  const citation = await page.evaluate('document.getElementById("citation-audit").textContent');
  check('citation audit line present with real counts',
    citation.includes(`55 of 55 guides cite named sources`) &&
    citation.includes(`${citedSteps} of ${totalSteps} steps carry citations`),
    citation);

  // 4. Spoiler masking hides, then the toggle reveals, a story trophy name.
  const maskedName = await page.evaluate(
    'document.querySelector(\'.trophy-row[data-trophy-id="2"] .trophy-name\').textContent');
  check('spoiler mode masks a story trophy name by default', maskedName.includes('spoilers hidden'), maskedName);
  await page.evaluate('document.getElementById("spoiler-btn").click()');
  await sleep(150);
  const revealedName = await page.evaluate(
    'document.querySelector(\'.trophy-row[data-trophy-id="2"] .trophy-name\').textContent');
  check('spoiler toggle reveals the story trophy name', revealedName === 'Just Like Paradise', revealedName);
  await page.evaluate('document.getElementById("spoiler-btn").click()');
  await sleep(150);

  // 5. Filters: Story shows 19, Missable shows 14, All restores 55.
  await page.evaluate('document.querySelector(\'.filter-btn[data-filter="story"]\').click()');
  await sleep(150);
  check('filter Story shows 19 rows',
    await page.evaluate('document.querySelectorAll(".trophy-row").length') === 19);
  await page.evaluate('document.querySelector(\'.filter-btn[data-filter="missable"]\').click()');
  await sleep(150);
  check('filter Missable shows 14 rows',
    await page.evaluate('document.querySelectorAll(".trophy-row").length') === 14);
  await page.evaluate('document.querySelector(\'.filter-btn[data-filter="all"]\').click()');
  await sleep(150);
  check('filter All restores 55 rows',
    await page.evaluate('document.querySelectorAll(".trophy-row").length') === 55);

  // 6. Counter stepper: drive trophy 43 (target 5) to its target and watch progress move.
  const progressBefore = await page.evaluate('document.getElementById("progress-text").textContent');
  for (let i = 0; i < 5; i++) {
    await page.evaluate(`(() => {
      const row = document.querySelector('.trophy-row[data-trophy-id="43"]');
      row.querySelectorAll('.counter button')[1].click();
    })()`);
    await sleep(80);
  }
  const counterValue = await page.evaluate(
    'document.querySelector(\'.trophy-row[data-trophy-id="43"] .counter-value\').textContent');
  check('counter stepper increments to the target', counterValue === '5', counterValue);
  const progressAfter = await page.evaluate('document.getElementById("progress-text").textContent');
  check('progress text updates when a counter completes a trophy',
    progressBefore.startsWith('0 of 55') && progressAfter.startsWith('1 of 55'),
    `${progressBefore} -> ${progressAfter}`);

  // 7. Persistence: tick trophy 17, reload, and confirm state survives.
  await page.evaluate(`(() => {
    const box = document.querySelector('.trophy-row[data-trophy-id="17"] input[type="checkbox"]');
    box.click();
  })()`);
  await sleep(150);
  await page.send('Page.reload');
  await waitFor(page, 'document.querySelectorAll(".trophy-row").length === 55');
  const persistedBox = await page.evaluate(
    'document.querySelector(\'.trophy-row[data-trophy-id="17"] input[type="checkbox"]\').checked');
  const persistedCounter = await page.evaluate(
    'document.querySelector(\'.trophy-row[data-trophy-id="43"] .counter-value\').textContent');
  const persistedProgress = await page.evaluate('document.getElementById("progress-text").textContent');
  check('checkbox state persists across reload', persistedBox === true);
  check('counter state persists across reload', persistedCounter === '5', persistedCounter);
  check('progress persists across reload', persistedProgress.startsWith('2 of 55'), persistedProgress);

  // 8. Zero external network requests; zero console errors.
  const external = requests.filter((u) => !u.startsWith(ORIGIN) && !u.startsWith('data:') && !u.startsWith('blob:'));
  check('zero external network requests', external.length === 0, external.join(', '));
  check('zero console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
} finally {
  await browser.close();
  server.kill('SIGKILL');
}

console.log(`\nfunctest: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
