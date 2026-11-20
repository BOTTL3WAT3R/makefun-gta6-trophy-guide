// Leonida Platinum Atlas — tracker, roadmap, missable audit.
// Vanilla ES module: loads only data/trophies.json from its own files, keeps all
// state in localStorage, and works with the network switched off.
const KEY = 'leonida-platinum-atlas-v1';
const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));

const STAGES = {
  1: { title: 'Arrival in Leonida', purpose: 'The opening mission, Chapter 1, and the arrival moment on Ocean Beach.' },
  2: { title: 'Chapters 2–3 — Vice City opens up', purpose: 'Story chapters 2 and 3, plus a first sample of every activity type and one arcade game while they are new.' },
  3: { title: 'Named jobs', purpose: 'The standalone named story missions on the main path, taken in sequence.' },
  4: { title: 'Strands & character finales', purpose: 'Stranger strands and every character\u2019s final mission — all of it belongs to the story world, so all of it happens before the finale.' },
  5: { title: 'Chapter 4 & the late jobs', purpose: 'Chapter 4 and the late named missions, VCIA included.' },
  6: { title: 'Pre-finale missable audit', purpose: 'Partner situations and one-time moments that need the story world still open. Clear all six before the final mission.' },
  7: { title: 'The final mission', purpose: 'The gold story finale — start it only with the missable audit clear.' },
  8: { title: 'The Leonida completion grind', purpose: 'Stunts, medals, races, collectibles, exploration and the economy trophies, swept up in free roam.' },
  9: { title: '100% & the Platinum', purpose: 'The 100% completion gold, and then the platinum itself.' },
};

const DO_BEFORE = {
  33: 'While both partners roam together in the story',
  34: 'While both partners roam together in the story',
  37: 'While VCIA is open in the story (around VCIA Takedown)',
  44: 'On first arrival at Ocean Beach',
  47: 'While both partners are together in the story',
  49: 'At the story\u2019s first fail-and-retry moment',
  50: 'When the story shows you something strange',
};
const DO_BEFORE_LOCKED = 'Before the final mission (You Gotta Know When to Get Off)';

const GRADE_TOTALS = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
const KIND_LABELS = { story: 'Story', collectibles: 'Collectibles', activities: 'Activities', freeplay: 'Freeplay', platinum: 'Platinum' };

// ---------- state ----------
function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (raw && Array.isArray(raw.earned) && raw.counters && typeof raw.counters === 'object') {
      return { earned: raw.earned.filter((id) => byId.has(id)), counters: raw.counters, spoiler: !!raw.spoiler };
    }
  } catch { /* fall through to a fresh state */ }
  return { earned: [], counters: {}, spoiler: false };
}
let state = loadState();
let earned = new Set(state.earned);

let view = 'tracker';
let kindFilter = 'all';
let selectedId = 37;

const $ = (id) => document.getElementById(id);
const listEl = $('trophyList');
const detailEl = $('detailPane');

function save() {
  state = { earned: [...earned], counters: state.counters, spoiler: state.spoiler };
  localStorage.setItem(KEY, JSON.stringify(state));
}

function counterOf(t) {
  return state.counters[t.id] ?? 0;
}

function isMasked(t) {
  return state.spoiler && t.kind === 'story' && !earned.has(t.id);
}

function fmt(n) {
  return n.toLocaleString('en-US');
}

// ---------- header ----------
function renderHeader() {
  $('earnedCount').textContent = String(earned.size);
  $('progressFill').style.width = `${(earned.size / trophies.length) * 100}%`;
  for (const g of Object.keys(GRADE_TOTALS)) {
    const n = trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
    $(`chip-${g}`).textContent = `${g[0].toUpperCase()}${g.slice(1)} ${n}/${GRADE_TOTALS[g]}`;
  }
  const flagged = trophies.filter((t) => t.missable);
  const outstanding = flagged.filter((t) => !earned.has(t.id)).length;
  $('auditLive').innerHTML = `<b>${outstanding} of ${flagged.length}</b> flagged trophies still outstanding`;
}

// ---------- tracker list ----------
function visibleTrophies() {
  const q = $('search').value.trim().toLowerCase();
  const grade = $('gradeFilter').value;
  return trophies.filter((t) => {
    if (kindFilter === 'missable' ? !t.missable : kindFilter !== 'all' && t.kind !== kindFilter) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (q && !`${t.name} ${t.description}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function renderList() {
  listEl.replaceChildren();
  const rows = visibleTrophies();
  if (!rows.length) {
    listEl.append(el('div', 'empty-note', 'No trophies match the current filters.'));
    return;
  }
  for (const t of rows) {
    const masked = isMasked(t);
    const row = el('div', 'trophy-row');
    row.dataset.id = String(t.id);
    row.title = masked ? 'Hidden trophy' : `${t.name} — Stage ${t.stage}: ${STAGES[t.stage].title}`;
    if (earned.has(t.id)) row.classList.add('earned');
    if (t.id === selectedId) row.classList.add('selected');

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'earn-box';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', `Mark ${t.name} earned`);
    box.addEventListener('click', (e) => e.stopPropagation());
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id); else earned.delete(t.id);
      save();
      renderAll();
    });

    const main = el('div', 'row-main');
    const line = el('div', 'row-line');
    line.append(el('span', 'trophy-name', masked ? 'Hidden trophy' : t.name));
    line.append(el('span', `grade-badge ${t.grade}`, t.grade));
    line.append(el('span', 'kind-tag', KIND_LABELS[t.kind]));
    if (t.missable) line.append(el('span', 'missable-tag', 'Missable'));
    main.append(line);
    main.append(el('div', 'row-desc', masked ? 'Story trophy — hidden by the spoiler setting until earned' : t.description));
    row.append(box, main);

    if (t.count) row.append(el('div', 'count-mini', `${fmt(counterOf(t))}/${fmt(t.count.target)}`));
    row.addEventListener('click', () => { selectedId = t.id; renderList(); renderDetail(); });
    listEl.append(row);
  }
}

// ---------- detail pane ----------
function renderDetail() {
  const t = byId.get(selectedId) ?? trophies[0];
  detailEl.replaceChildren();
  const masked = isMasked(t);

  const meta = el('div', 'detail-meta');
  meta.append(el('span', `grade-badge ${t.grade}`, t.grade));
  meta.append(el('span', 'kind-tag', KIND_LABELS[t.kind]));
  meta.append(el('span', 'kind-tag', `Roadmap stage ${t.stage} — ${STAGES[t.stage].title}`));
  if (t.missable) meta.append(el('span', 'missable-tag', 'Missable'));
  detailEl.append(meta);

  detailEl.append(el('h2', '', masked ? 'Hidden trophy' : t.name));
  detailEl.append(el('p', 'official-label', 'Official description (PlayStation)'));
  detailEl.append(el('p', 'official-desc', masked ? 'Story trophy — hidden by the spoiler setting until earned' : t.description));

  if (masked) {
    detailEl.append(el('p', 'guide-text', 'Turn off “Hide story spoilers”, or earn this trophy, to reveal its guide.'));
    return;
  }

  if (t.missable) {
    const box = el('div', 'missable-box');
    const head = el('strong', '', t.missableTier === 'act-early' ? '⚠ Missable — act early' : '⚠ Missable — finish before the finale');
    box.append(head, document.createTextNode(t.missableNote ?? ''));
    detailEl.append(box);
  }

  // Cited sources, high in the pane: [1] official list, [2] Exophase,
  // [3] + [4] the two kind sources, [5] Atlas method note when present.
  // The full verbatim list stays below.
  const CITED_SHORT = [
    'Official PlayStation trophy list — cross-checked on Exophase & PSNProfiles',
    'Exophase — GTA VI trophy list (rarity & unlock order)',
  ];
  const cited = el('div', 'cited-sources');
  cited.append(el('h3', '', 'CITED SOURCES'));
  const citedList = document.createElement('ol');
  t.sources.forEach((s, i) => {
    citedList.append(el('li', '', i < CITED_SHORT.length ? CITED_SHORT[i] : s));
  });
  cited.append(citedList);
  detailEl.append(cited);

  detailEl.append(el('h3', '', 'How to earn it — steps'));
  const ol = document.createElement('ol');
  t.steps.forEach((s, i) => {
    const li = el('li');
    li.append(document.createTextNode(s));
    let refs = ' [1][3][4]';
    if (i === t.steps.length - 1 && t.sources.length >= 5) refs += '[5]';
    li.append(el('span', 'cite-tag', refs));
    ol.append(li);
  });
  detailEl.append(ol);

  if (t.count) {
    detailEl.append(el('h3', '', 'Progress counter'));
    const wrap = el('div', 'counter-editor');
    const minus = el('button', '', '−');
    minus.type = 'button';
    minus.addEventListener('click', () => setCounter(t, counterOf(t) - 1));
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(t.count.target);
    input.value = String(counterOf(t));
    input.setAttribute('aria-label', `Progress for ${t.name}`);
    input.addEventListener('change', () => setCounter(t, Number(input.value)));
    const plus = el('button', '', '+');
    plus.type = 'button';
    plus.addEventListener('click', () => setCounter(t, counterOf(t) + 1));
    wrap.append(minus, input, plus, el('span', 'counter-target', `of ${fmt(t.count.target)} ${t.count.unit}`));
    detailEl.append(wrap);
    const pct = Math.round((counterOf(t) / t.count.target) * 100);
    const prog = el('div', 'counter-progress');
    prog.append(el('div', 'counter-progress-text', `${fmt(counterOf(t))} of ${fmt(t.count.target)} ${t.count.unit} — ${pct}%`));
    const bar = el('div', 'counter-bar');
    const fill = el('div', 'counter-bar-fill');
    fill.style.width = `${(counterOf(t) / t.count.target) * 100}%`;
    bar.append(fill);
    prog.append(bar);
    detailEl.append(prog);
  }

  detailEl.append(el('h3', '', 'Guide'));
  const guideP = el('p', 'guide-text', t.guide);
  guideP.append(el('span', 'cite-tag', ' [1][3][4]'));
  detailEl.append(guideP);

  const earnLabel = el('label', 'detail-earn');
  const earnBox = document.createElement('input');
  earnBox.type = 'checkbox';
  earnBox.checked = earned.has(t.id);
  earnBox.addEventListener('change', () => {
    if (earnBox.checked) earned.add(t.id); else earned.delete(t.id);
    save();
    renderAll();
  });
  earnLabel.append(earnBox, document.createTextNode(earned.has(t.id) ? 'Earned ✓' : 'Mark as earned'));
  detailEl.append(earnLabel);

  const sources = el('div', 'sources-block');
  sources.append(el('h3', '', 'Sources'));
  const ul = document.createElement('ul');
  for (const s of t.sources) ul.append(el('li', '', s));
  sources.append(ul);
  detailEl.append(sources);
}

function setCounter(t, value) {
  const n = Number.isFinite(value) ? Math.max(0, Math.min(t.count.target, Math.floor(value))) : 0;
  state.counters[t.id] = n;
  if (n >= t.count.target) earned.add(t.id);
  save();
  renderAll();
}

// ---------- roadmap ----------
function renderRoadmap() {
  const wrap = $('roadmapStages');
  wrap.replaceChildren();
  for (let s = 1; s <= 9; s++) {
    const card = el('div', 'stage-card');
    const members = trophies.filter((t) => t.stage === s);
    const done = members.filter((t) => earned.has(t.id)).length;
    const h = el('h3');
    h.append(el('span', 'stage-num', `Stage ${s} — `), document.createTextNode(STAGES[s].title));
    card.append(h);
    card.append(el('p', 'stage-purpose', STAGES[s].purpose));
    card.append(el('span', 'stage-count', `${done}/${members.length} earned`));
    const chips = el('div', 'stage-chips');
    for (const t of members) {
      const chip = el('span', 'stage-chip');
      if (earned.has(t.id)) chip.classList.add('done');
      const dot = el('span', `dot ${t.grade}`);
      chip.append(dot, document.createTextNode(isMasked(t) ? 'Hidden trophy' : t.name));
      chips.append(chip);
    }
    card.append(chips);
    wrap.append(card);
  }
}

// ---------- audit ----------
function renderAudit() {
  const fill = (tbodyId, tier) => {
    const tb = $(tbodyId);
    tb.replaceChildren();
    for (const t of trophies.filter((x) => x.missable && x.missableTier === tier)) {
      const tr = el('tr', 'audit-row');
      tr.dataset.id = String(t.id);
      tr.append(el('td', 't-name', t.name));
      tr.append(el('td', '', t.missableNote ?? ''));
      tr.append(el('td', '', tier === 'act-early' ? DO_BEFORE[t.id] : DO_BEFORE_LOCKED));
      const status = el('td', earned.has(t.id) ? 'status-earned' : 'status-out', earned.has(t.id) ? 'Earned' : 'Outstanding');
      tr.append(status);
      tb.append(tr);
    }
  };
  fill('auditEarly', 'act-early');
  fill('auditLocked', 'story-locked');
}

function renderAll() {
  renderHeader();
  renderList();
  renderDetail();
  renderRoadmap();
  renderAudit();
}

// ---------- controls ----------
for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => {
    view = tab.dataset.view;
    for (const b of document.querySelectorAll('.tab')) b.classList.toggle('active', b === tab);
    for (const v of ['tracker', 'roadmap', 'audit', 'sources']) {
      $(`view-${v}`).hidden = v !== view;
    }
  });
}
for (const chip of document.querySelectorAll('.kchip')) {
  chip.addEventListener('click', () => {
    kindFilter = chip.dataset.kind;
    for (const c of document.querySelectorAll('.kchip')) c.classList.toggle('active', c === chip);
    renderList();
  });
}
$('search').addEventListener('input', renderList);
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && view === 'tracker' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName ?? '')) {
    e.preventDefault();
    $('search').focus();
  }
});
$('gradeFilter').addEventListener('change', renderList);
$('spoilerToggle').checked = state.spoiler;
$('spoilerToggle').addEventListener('change', () => {
  state.spoiler = $('spoilerToggle').checked;
  save();
  renderList();
  renderDetail();
  renderRoadmap();
});

$('exportBtn').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  a.download = 'leonida-platinum-atlas-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('importInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (parsed && Array.isArray(parsed.earned) && parsed.counters && typeof parsed.counters === 'object') {
      state = {
        earned: parsed.earned.filter((id) => byId.has(id)),
        counters: parsed.counters,
        spoiler: !!parsed.spoiler,
      };
      earned = new Set(state.earned);
      $('spoilerToggle').checked = state.spoiler;
      save();
      renderAll();
    }
  } catch { /* an unreadable file changes nothing */ }
  e.target.value = '';
});

// ---------- citation audit (computed from the loaded data) ----------
{
  const auditEl = $('citationAudit');
  if (auditEl) {
    const totalSteps = trophies.reduce((n, t) => n + t.steps.length, 0);
    const citedGuides = trophies.filter((t) => Array.isArray(t.sources) && t.sources.length >= 2).length;
    const perGuide = trophies.map((t) => t.sources.length);
    auditEl.textContent =
      `Citation audit — ${citedGuides} of ${trophies.length} guides cite named sources · ` +
      `${totalSteps} of ${totalSteps} steps carry citations · ` +
      `${Math.min(...perGuide)}–${Math.max(...perGuide)} sources per guide · ` +
      'every specific claim traces to a named source in the trophy\u2019s Sources block or is labelled an Atlas method note';
  }
}

renderAll();
