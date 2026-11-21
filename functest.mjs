// Functional test for Leonida Platinum Atlas — serves app/ and drives the
// cached Chromium over CDP. Every assertion prints PASS or FAIL; the process
// exits non-zero if any assertion fails.
import { spawn } from 'node:child_process';
import { launchChromium, openPage, sleep, waitForHttp } from './cdp.mjs';

const PORT = 8091;
const DEBUG_PORT = 9223;
const BASE = 'http://127.0.0.1:' + PORT + '/';
const PROFILE = '/tmp/atlas-functest-profile-' + Date.now();

let failures = 0;
function check(name, ok, detail = '') {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  if (!ok) failures += 1;
}

const server = spawn('node', ['serve.ts', '--port', String(PORT)], {
  cwd: import.meta.dirname, stdio: 'ignore',
});
const chrome = launchChromium(DEBUG_PORT, PROFILE);
try {
  await waitForHttp(BASE);
  const page = await openPage(DEBUG_PORT);
  await page.navigate(BASE);
  await page.evaluate(`new Promise(r => {
    const t = setInterval(() => {
      if (document.querySelectorAll('#checklist .trophy').length === 55) { clearInterval(t); r(true); }
    }, 100);
    setTimeout(() => { clearInterval(t); r(false); }, 8000);
  })`);

  const rows = await page.evaluate(`document.querySelectorAll('#checklist .trophy').length`);
  check('exactly 55 checklist rows', rows === 55, 'got ' + rows);

  const stages = await page.evaluate(`document.querySelectorAll('.stage').length`);
  check('9 roadmap stages render', stages === 9, 'got ' + stages);

  const auditRows = await page.evaluate(`document.querySelectorAll('.audit-row').length`);
  check('missable audit has 14 rows', auditRows === 14, 'got ' + auditRows);

  const auditLine = await page.evaluate(`document.getElementById('auditLine').textContent`);
  check('citation audit line shows real counts',
    auditLine.includes('55 of 55') && auditLine.includes('220 of 220'), auditLine);

  const maskedName = await page.evaluate(
    `document.querySelector('.trophy[data-id="9"] .trophy-name').textContent`);
  check('spoiler mode masks a story trophy name by default',
    maskedName.includes('Hidden trophy'), maskedName.trim());

  await page.evaluate(`document.getElementById('spoilerBtn').click()`);
  await sleep(300);
  const revealedName = await page.evaluate(
    `document.querySelector('.trophy[data-id="9"] .trophy-name').textContent`);
  check('spoiler toggle reveals the story trophy name',
    revealedName.includes('Break the Bank'), revealedName.trim());
  await page.evaluate(`document.getElementById('spoilerBtn').click()`);
  await sleep(300);

  await page.evaluate(
    `document.querySelector('#filters button[data-filter="story"]').click()`);
  await sleep(300);
  const storyRows = await page.evaluate(`document.querySelectorAll('#checklist .trophy').length`);
  check('Story filter shows 19', storyRows === 19, 'got ' + storyRows);

  await page.evaluate(
    `document.querySelector('#filters button[data-filter="missable"]').click()`);
  await sleep(300);
  const missRows = await page.evaluate(`document.querySelectorAll('#checklist .trophy').length`);
  check('Missable filter shows 14', missRows === 14, 'got ' + missRows);

  await page.evaluate(
    `document.querySelector('#filters button[data-filter="all"]').click()`);
  await sleep(300);

  const before = await page.evaluate(`document.getElementById('progressText').textContent`);
  // id 30 has target 3: three clicks complete it, so progress must move.
  await page.evaluate(
    `for (let i = 0; i < 3; i++) {
       document.querySelector('.trophy[data-id="30"] button[data-step="1"]').click();
     }`);
  await sleep(300);
  const counter = await page.evaluate(
    `document.querySelector('.trophy[data-id="30"] .count').textContent`);
  const after = await page.evaluate(`document.getElementById('progressText').textContent`);
  check('counter stepper increments and updates progress',
    counter.trim() === '3 / 3' && before !== after,
    'counter=' + counter.trim() + ' before=' + before + ' after=' + after);

  await page.evaluate(
    `document.querySelector('.trophy[data-id="2"] input[type="checkbox"]').click()`);
  await sleep(300);
  await page.navigate(BASE);
  await page.evaluate(`new Promise(r => {
    const t = setInterval(() => {
      if (document.querySelectorAll('#checklist .trophy').length === 55) { clearInterval(t); r(true); }
    }, 100);
    setTimeout(() => { clearInterval(t); r(false); }, 8000);
  })`);
  const persisted = await page.evaluate(
    `document.querySelector('.trophy[data-id="2"] input[type="checkbox"]').checked`);
  check('checked state persists across reload', persisted === true);

  const hasExport = await page.evaluate(`!!document.getElementById('exportBtn')`);
  const hasImport = await page.evaluate(`!!document.getElementById('importBtn')`);
  check('export and import controls exist', hasExport && hasImport);

  check('zero external network requests', page.externalRequests.length === 0,
    page.externalRequests.join(', '));
  check('zero console errors', page.consoleErrors.length === 0,
    page.consoleErrors.join(' | '));

  page.close();
} finally {
  chrome.kill();
  server.kill();
}
console.log(failures === 0 ? 'FUNCTEST ALL PASS' : 'FUNCTEST ' + failures + ' FAILURES');
process.exit(failures === 0 ? 0 : 1);
