// Functional test for the Leonida Platinum Atlas app, driven over CDP against the cached Chromium.
// Serves app/ with the starter's serve.ts, loads the page, and asserts the tracker's behaviour end to end.
// Run: node functest.mjs  — prints one line per assertion and a final PASS count; exits 1 on any failure.
import { readFileSync } from 'node:fs';
import { serveApp, launchBrowser, newPage } from './cdp.mjs';

const PORT = 8911;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const KEY = 'leonida-platinum-atlas-v1';

let passed = 0;
let failed = 0;
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  ok - ${name}`); }
  else { failed++; console.log(`  FAIL - ${name}${detail ? ' :: ' + detail : ''}`); }
}

const server = await serveApp(PORT);
const browser = await launchBrowser();
try {
  const page = await newPage(browser);
  const requests = [];
  const consoleErrors = [];
  await page.send('Network.enable');
  page.on('Network.requestWillBeSent', (p) => requests.push(p.request.url));
  page.on('Runtime.consoleAPICalled', (p) => {
    if (p.type === 'error') consoleErrors.push(p.args.map((a) => a.value ?? a.description ?? '').join(' '));
  });
  page.on('Runtime.exceptionThrown', (p) => consoleErrors.push(p.exceptionDetails?.exception?.description ?? 'exception'));

  await page.send('Page.navigate', { url: ORIGIN + '/' });
  await page.waitFor(`document.querySelectorAll('.trophy-row').length === 55`);

  // 1. Exactly 55 checklist rows.
  check('checklist renders exactly 55 rows',
    await page.evaluate(`document.querySelectorAll('.trophy-row').length`) === 55);

  // 2. Citation audit line carries the real counts from the data file.
  const data = JSON.parse(readFileSync(new URL('./app/data/trophies.json', import.meta.url), 'utf8'));
  const citedGuides = data.trophies.filter((t) => t.sources?.length > 0).length;
  const totalSteps = data.trophies.reduce((n, t) => n + t.steps.length, 0);
  const citedSteps = data.trophies.reduce((n, t) => n + t.steps.filter((s) => s.source).length, 0);
  const auditText = await page.evaluate(`document.getElementById('citationAudit').textContent`);
  check('citation audit line shows real counts',
    auditText === `Citation audit — ${citedGuides} of 55 guides cite named sources · ${citedSteps} of ${totalSteps} steps carry citations`,
    auditText);

  // 3. Roadmap renders 9 stages; missable audit renders 14 rows.
  check('roadmap renders 9 stages',
    await page.evaluate(`document.querySelectorAll('.stage-card').length`) === 9);
  check('missable audit renders 14 rows',
    await page.evaluate(`document.querySelectorAll('.audit-row').length`) === 14);

  // 4. Spoiler masking hides, then the toggle reveals, a story trophy name.
  const maskedName = await page.evaluate(`document.querySelector('.trophy-row[data-id="2"] h3').textContent`);
  check('spoiler mode masks a story trophy name', maskedName === 'Hidden trophy — spoilers hidden', maskedName);
  await page.evaluate(`document.getElementById('spoilerToggle').click()`);
  const revealedName = await page.evaluate(`document.querySelector('.trophy-row[data-id="2"] h3').textContent`);
  check('spoiler toggle reveals the story trophy name', revealedName === 'Just Like Paradise', revealedName);
  await page.evaluate(`document.getElementById('spoilerToggle').click()`); // back to hidden for the filter checks

  // 5. Filters: Story shows 19, Missable shows 14.
  await page.evaluate(`document.querySelector('[data-filter="story"]').click()`);
  check('Story filter shows 19 rows',
    await page.evaluate(`document.querySelectorAll('.trophy-row').length`) === 19);
  await page.evaluate(`document.querySelector('[data-filter="missable"]').click()`);
  check('Missable filter shows 14 rows',
    await page.evaluate(`document.querySelectorAll('.trophy-row').length`) === 14);
  await page.evaluate(`document.querySelector('[data-filter="all"]').click()`);

  // 6. A counter stepper increments its value.
  await page.evaluate(`document.querySelector('.trophy-row[data-id="9"] [data-action="inc"]').click()`);
  const countAfter = await page.evaluate(`document.querySelector('.trophy-row[data-id="9"] .count-val').textContent`);
  check('counter stepper increments', countAfter === '1', countAfter);

  // 7. State persists across a reload (checkbox + counter + progress text).
  await page.evaluate(`document.querySelector('.trophy-row[data-id="5"] input[type="checkbox"]').click()`);
  await page.send('Page.reload');
  await page.waitFor(`document.querySelectorAll('.trophy-row').length === 55`);
  const persistedBox = await page.evaluate(`document.querySelector('.trophy-row[data-id="5"] input[type="checkbox"]').checked`);
  const persistedCount = await page.evaluate(`document.querySelector('.trophy-row[data-id="9"] .count-val').textContent`);
  const progressAfterReload = await page.evaluate(`document.getElementById('progressText').textContent`);
  check('checkbox state persists across reload', persistedBox === true);
  check('counter state persists across reload', persistedCount === '1', persistedCount);
  check('progress text reflects the persisted completion', progressAfterReload.startsWith('1 of 55'), progressAfterReload);

  // 8. Completing a counter target updates the progress text.
  await page.evaluate(`(() => {
    const s = JSON.parse(localStorage.getItem('${KEY}'));
    s.counters[43] = 4;
    localStorage.setItem('${KEY}', JSON.stringify(s));
  })()`);
  await page.send('Page.reload');
  await page.waitFor(`document.querySelectorAll('.trophy-row').length === 55`);
  await page.evaluate(`document.querySelector('.trophy-row[data-id="43"] [data-action="inc"]').click()`);
  const progressFinal = await page.evaluate(`document.getElementById('progressText').textContent`);
  check('reaching a counter target updates progress', progressFinal.startsWith('2 of 55'), progressFinal);

  // 9. No external network requests; no console errors.
  const external = requests.filter((u) => !u.startsWith(ORIGIN) && !u.startsWith('data:') && u !== 'about:blank');
  check('zero external network requests', external.length === 0, external.join(', '));
  check('zero console errors', consoleErrors.length === 0, consoleErrors.join(' | '));

  page.close();
} finally {
  browser.proc.kill('SIGKILL');
  server.kill('SIGKILL');
}

console.log(`\nfunctest: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
