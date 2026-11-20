// Leonida Platinum Atlas — an offline GTA VI trophy guide & tracker.
// Loads only its own files (style.css, data/trophies.json); progress lives in
// localStorage under one key and can be exported to / imported from a JSON file.
const STORAGE_KEY = 'leonida-platinum-atlas-v1';

const KIND_LABELS = {
  story: 'Story',
  collectibles: 'Collectibles',
  activities: 'Activities',
  freeplay: 'Free roam',
  platinum: 'Platinum',
};

// The platinum roadmap: nine stages, every one of the 55 trophies exactly once.
// Missables and partner-dependent trophies are front-loaded, before the story
// can close their windows; counters and collectibles sweep afterwards.
const ROADMAP = [
  {
    n: 1, title: 'Opening stretch', hours: '6–8 hours',
    note: 'Play the opening of the story straight through. These eight trophies are the campaign\u2019s first beats and are earned in order simply by finishing the missions as they come.',
    ids: [1, 2, 3, 4, 5, 6, 7, 8],
  },
  {
    n: 2, title: 'Stranger strands, before they lapse', hours: '5–7 hours',
    note: 'Story-locked missables first: the strands for Andy, Kenton, Billy, Randy, Tyrone, the eight stranger strands and Bret\u2019s hunt can all be closed off by chapter progress, so finish them while they are still offered.',
    ids: [22, 23, 24, 25, 26, 27, 29],
  },
  {
    n: 3, title: 'Partner moments & one-off events', hours: '2–3 hours',
    note: 'Act-early missables next: the partner escapes and robberies, the VCIA departure, the Ocean Beach cocktail, the partnership moment, the second-try success and the strange event all depend on early-game setups the plot moves past.',
    ids: [33, 34, 37, 44, 47, 49, 50],
  },
  {
    n: 4, title: 'The rest of the story', hours: '4–6 hours',
    note: 'With every missable safe, finish the remaining story trophies — races, Cal\u2019s fishing challenge, the arcade, and the meditation spots that sit along the story\u2019s route.',
    ids: [19, 20, 21, 28],
  },
  {
    n: 5, title: 'Heists, completion & activities', hours: '8–10 hours',
    note: 'The activity block: the big set-piece missions, the stunt total, a taste of every activity type, and the long push to 100% completion that ties this stage to everything else on the list.',
    ids: [9, 10, 11, 12, 13, 14, 15, 16],
  },
  {
    n: 6, title: 'The robbery circuit', hours: '5–7 hours',
    note: 'The collect-and-rob sweep: Rhinos, the undetected jewelry job, five bank vaults, an armored truck, the full map, and one illegal operation from every gang\u2019s turf.',
    ids: [38, 39, 40, 41, 42, 43],
  },
  {
    n: 7, title: 'Counters, part one', hours: '6–8 hours',
    note: 'Free-roam counters with the biggest numbers: cards, photo spots, challenges, vehicles, Combat Focus takedowns, choices and spending — all progress fastest while you are still roaming for other stages.',
    ids: [30, 31, 32, 35, 36, 48, 51, 53],
  },
  {
    n: 8, title: 'Counters, part two', hours: '5–7 hours',
    note: 'The specialist remainder: shooting-range golds, drone races at every location, the showroom escape, bowling, laundering Marked Bills, and the full set of garage properties.',
    ids: [17, 18, 45, 46, 52, 54],
  },
  {
    n: 9, title: 'The platinum', hours: 'Minutes',
    note: 'Nothing left to hunt: with the other 54 trophies earned, registering the last vehicles is done and the platinum — On the Spot — closes the atlas.',
    ids: [55],
  },
];

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));

let state = loadState();
let activeFilter = 'all';
let searchTerm = '';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        checked: Array.isArray(parsed.checked) ? parsed.checked : [],
        counters: parsed.counters && typeof parsed.counters === 'object' ? parsed.counters : {},
        spoilersHidden: parsed.spoilersHidden !== false,
      };
    }
  } catch { /* fall through to defaults */ }
  return { checked: [], counters: {}, spoilersHidden: true };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isComplete(t) {
  if (state.checked.includes(t.id)) return true;
  if (t.target !== undefined && (state.counters[t.id] ?? 0) >= t.target) return true;
  return false;
}

function isMasked(t) {
  return state.spoilersHidden && t.kind === 'story' && !isComplete(t);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ---- Header / progress -------------------------------------------------------------
const progressText = document.getElementById('progress-text');
const progressFill = document.getElementById('progress-fill');
function renderProgress() {
  const done = trophies.filter(isComplete).length;
  const pct = Math.round((done / trophies.length) * 100);
  progressText.textContent = `${done} of ${trophies.length} trophies · ${pct}%`;
  progressFill.style.width = `${pct}%`;
}

// ---- Roadmap ------------------------------------------------------------------------
function renderRoadmap() {
  const wrap = document.getElementById('roadmap-stages');
  wrap.replaceChildren();
  for (const stage of ROADMAP) {
    const card = el('article', 'stage-card');
    card.append(el('h3', null, `Stage ${stage.n} — ${stage.title}`));
    card.append(el('p', 'stage-hours', stage.hours));
    card.append(el('p', 'stage-note', stage.note));
    const chips = el('div', 'chips');
    for (const id of stage.ids) {
      const t = byId.get(id);
      const chip = el('span', 'chip' + (isComplete(t) ? ' done' : ''), t.name);
      chips.append(chip);
    }
    card.append(chips);
    wrap.append(card);
  }
}

// ---- Missable audit -------------------------------------------------------------------
function renderAudit() {
  const wrap = document.getElementById('audit-rows');
  wrap.replaceChildren();
  for (const t of trophies.filter((x) => x.missable)) {
    const row = el('div', 'audit-row');
    row.dataset.trophyId = String(t.id);
    row.append(el('span', 'audit-name', t.name));
    row.append(el('span', 'audit-note', t.missableNote));
    wrap.append(row);
  }
}

// ---- Citation audit (computed from the data at runtime) --------------------------------
function renderCitationAudit() {
  const guidesCited = trophies.filter((t) => Array.isArray(t.sources) && t.sources.length > 0).length;
  let stepsTotal = 0;
  let stepsCited = 0;
  for (const t of trophies) {
    for (const s of t.steps ?? []) {
      stepsTotal += 1;
      if (s.source) stepsCited += 1;
    }
  }
  document.getElementById('citation-audit').textContent =
    `Citation audit — ${guidesCited} of ${trophies.length} guides cite named sources · ${stepsCited} of ${stepsTotal} steps carry citations`;
}

// ---- Checklist ---------------------------------------------------------------------------
const rowsWrap = document.getElementById('rows');

function matchesFilter(t) {
  if (activeFilter === 'all') return true;
  if (activeFilter === 'missable') return t.missable === true;
  return t.kind === activeFilter;
}

function matchesSearch(t) {
  if (!searchTerm) return true;
  const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
  return hay.includes(searchTerm);
}

function renderList() {
  rowsWrap.replaceChildren();
  const visible = trophies.filter((t) => matchesFilter(t) && matchesSearch(t));
  if (visible.length === 0) {
    rowsWrap.append(el('p', 'empty-note', 'No trophies match the current filter and search.'));
    return;
  }
  for (const t of visible) rowsWrap.append(buildRow(t));
}

function buildRow(t) {
  const row = el('article', 'trophy-row' + (isComplete(t) ? ' complete' : ''));
  row.dataset.trophyId = String(t.id);
  const masked = isMasked(t);

  const head = el('div', 'trophy-head');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = state.checked.includes(t.id);
  box.setAttribute('aria-label', `Mark ${t.name} as earned`);
  box.addEventListener('change', () => {
    if (box.checked) {
      if (!state.checked.includes(t.id)) state.checked.push(t.id);
    } else {
      state.checked = state.checked.filter((id) => id !== t.id);
    }
    saveState();
    renderAll();
  });
  head.append(box);
  head.append(el('span', 'badge badge-' + t.grade, t.grade));
  head.append(el('span', 'trophy-name', masked ? 'Hidden trophy — spoilers hidden' : t.name));
  head.append(el('span', 'kind-tag', KIND_LABELS[t.kind] ?? t.kind));
  if (t.target !== undefined) head.append(el('span', 'target-chip', `Target ${t.target.toLocaleString('en-US')}`));
  if (t.missable) head.append(el('span', 'missable-flag', 'Missable'));
  row.append(head);

  if (masked) {
    row.append(el('p', 'masked-note',
      'Story trophy — its name, description and guide are hidden while spoiler protection is on, and are revealed when you earn it or switch spoilers off.'));
    return row;
  }

  row.append(el('p', 'trophy-desc', t.description));
  row.append(el('p', 'trophy-guide', t.guide));

  const steps = el('ol', 'steps');
  for (const s of t.steps ?? []) {
    const li = el('li', null, s.text);
    if (s.source) li.append(el('span', 'step-source', s.source));
    steps.append(li);
  }
  row.append(steps);

  row.append(el('p', 'sources-line', `Sources: ${(t.sources ?? []).join(' · ')}`));

  if (t.missable && t.missableNote) {
    row.append(el('p', 'warning-line', `Missable: ${t.missableNote}`));
  }

  if (t.target !== undefined) {
    const counter = el('div', 'counter');
    const value = state.counters[t.id] ?? 0;
    const dec = el('button', null, '−');
    dec.type = 'button';
    dec.setAttribute('aria-label', `Decrease count for ${t.name}`);
    dec.addEventListener('click', () => setCounter(t.id, value - 1));
    const inc = el('button', null, '+');
    inc.type = 'button';
    inc.setAttribute('aria-label', `Increase count for ${t.name}`);
    inc.addEventListener('click', () => setCounter(t.id, value + 1));
    counter.append(dec, el('span', 'counter-value', String(value)), inc,
      el('span', 'counter-target', `/ ${t.target.toLocaleString('en-US')}`));
    row.append(counter);
  }
  return row;
}

function setCounter(id, value) {
  const t = byId.get(id);
  const clamped = Math.max(0, Math.min(value, t.target));
  if (clamped === 0) delete state.counters[id];
  else state.counters[id] = clamped;
  saveState();
  renderAll();
}

function renderAll() {
  renderProgress();
  renderRoadmap();
  renderAudit();
  renderCitationAudit();
  renderList();
  syncControls();
}

// ---- Controls ----------------------------------------------------------------------------
function syncControls() {
  const btn = document.getElementById('spoiler-btn');
  btn.textContent = state.spoilersHidden ? 'Show spoilers' : 'Hide spoilers';
  btn.setAttribute('aria-pressed', String(!state.spoilersHidden));
  document.getElementById('spoiler-note').style.display = state.spoilersHidden ? '' : 'none';
  for (const b of document.querySelectorAll('.filter-btn')) {
    b.classList.toggle('active', b.dataset.filter === activeFilter);
  }
}

for (const b of document.querySelectorAll('.filter-btn')) {
  b.addEventListener('click', () => {
    activeFilter = b.dataset.filter;
    renderList();
    syncControls();
  });
}

document.getElementById('search').addEventListener('input', (e) => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderList();
});

document.getElementById('spoiler-btn').addEventListener('click', () => {
  state.spoilersHidden = !state.spoilersHidden;
  saveState();
  renderAll();
});

document.getElementById('export-btn').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  a.download = 'leonida-platinum-atlas-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    state = {
      checked: Array.isArray(parsed.checked) ? parsed.checked.filter((id) => byId.has(id)) : [],
      counters: parsed.counters && typeof parsed.counters === 'object' ? parsed.counters : {},
      spoilersHidden: parsed.spoilersHidden !== false,
    };
    saveState();
    renderAll();
  } catch { /* ignore a malformed import file */ }
  e.target.value = '';
});

renderAll();
