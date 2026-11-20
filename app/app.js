// Leonida Platinum Atlas — an offline GTA VI trophy guide and tracker.
// Loads the official list from data/trophies.json (a file of this app), renders the checklist, the roadmap
// and the missable audit, and saves progress in localStorage. It fetches nothing beyond its own files.
const STORAGE_KEY = 'leonida-platinum-atlas-v1';

const KIND_LABELS = {
  story: 'Story',
  collectibles: 'Collectibles',
  activities: 'Activities',
  freeplay: 'Free roam',
  platinum: 'Platinum',
};

// The roadmap: 9 stages covering all 55 trophies exactly once, in the order this atlas recommends.
const ROADMAP = [
  { n: 1, title: 'The opening chapters', hours: '≈ 8 hrs', ids: [1, 2, 3, 4, 5, 6, 7, 8],
    why: 'Start with the story spine: the opening mission, the first four chapters and the finale path they set up. Everything else hangs off the world the story unlocks.' },
  { n: 2, title: 'Story-locked missables — the character strands', hours: '≈ 6 hrs', ids: [22, 23, 24, 25, 26, 27, 29],
    why: 'Before the finale, close every character strand: Andy, Kenton, Billy, Randy, Tyrone, the stranger strands and Bret’s hunt. These are the trophies the ending can shut off.' },
  { n: 3, title: 'Act-early missables — partner and place moments', hours: '≈ 3 hrs', ids: [33, 34, 37, 44, 47, 49, 50],
    why: 'While the pair still roam together and early locations are open: the partner escapes and robberies, the VCIA departure, the Ocean Beach cocktail and the one-off odd moments.' },
  { n: 4, title: 'The remaining story', hours: '≈ 5 hrs', ids: [19, 20, 21, 28],
    why: 'Finish the story-shaped leftovers: Cal’s fishing challenge, an arcade game, the race wins that build naturally through play, and the meditation spots across the state.' },
  { n: 5, title: 'Activities tour', hours: '≈ 10 hrs', ids: [9, 10, 11, 12, 13, 14, 15, 16],
    why: 'Work the activity families as a block: the big jobs, the stunt count, one of every activity type, and the push toward 100% completion that this stage anchors.' },
  { n: 6, title: 'Collectibles and the robbery circuit', hours: '≈ 8 hrs', ids: [38, 39, 40, 41, 42, 43],
    why: 'The map sweep: card-hunting territory overlaps the robbery circuit — jewelry stores, bank vaults, armoured trucks, gang operations and the Rhino — while you explore all of Leonida.' },
  { n: 7, title: 'Free roam counters, part 1', hours: '≈ 9 hrs', ids: [30, 31, 32, 35, 36, 48, 51, 53],
    why: 'The counted grinds that tick up in the background: card sets, WAiNK locations, challenges, vehicles discovered, Combat Focus takedowns, choices, drive-by knockdowns and lifetime spending.' },
  { n: 8, title: 'Free roam counters, part 2', hours: '≈ 7 hrs', ids: [17, 18, 45, 46, 52, 54],
    why: 'The skill and money finishers: shooting-range golds, drone-race wins at every location, the showroom exit, the bowling alley, laundering a quarter million and buying every garage.' },
  { n: 9, title: 'The platinum', hours: 'Finale', ids: [55],
    why: 'Last, register the tenth vehicle on the Scooter Bros app with the rest of the list complete — and the platinum, Vice Got a Price!, lands as the 55th trophy closes.' },
];

const els = {
  fill: document.getElementById('progressFill'),
  progressText: document.getElementById('progressText'),
  search: document.getElementById('search'),
  spoilerToggle: document.getElementById('spoilerToggle'),
  spoilerNote: document.getElementById('spoilerNote'),
  stageGrid: document.getElementById('stageGrid'),
  auditRows: document.getElementById('auditRows'),
  citationAudit: document.getElementById('citationAudit'),
  rows: document.getElementById('rows'),
  noResults: document.getElementById('noResults'),
};

let trophies = [];
let byId = new Map();
let activeFilter = 'all';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        checked: Array.isArray(parsed.checked) ? parsed.checked : [],
        counters: parsed.counters && typeof parsed.counters === 'object' ? parsed.counters : {},
        hideSpoilers: typeof parsed.hideSpoilers === 'boolean' ? parsed.hideSpoilers : true,
      };
    }
  } catch { /* fall through to the default */ }
  return { checked: [], counters: {}, hideSpoilers: true };
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isComplete(t) {
  if (state.checked.includes(t.id)) return true;
  if (typeof t.target === 'number') return (state.counters[t.id] ?? 0) >= t.target;
  return false;
}

function isMasked(t) {
  return state.hideSpoilers && t.kind === 'story' && !isComplete(t);
}

function displayName(t) {
  return isMasked(t) ? 'Hidden trophy — spoilers hidden' : t.name;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderProgress() {
  const done = trophies.filter(isComplete).length;
  const pct = trophies.length ? Math.round((done / trophies.length) * 100) : 0;
  els.fill.style.width = pct + '%';
  els.progressText.textContent = `${done} of ${trophies.length} trophies · ${pct}%`;
}

function renderStages() {
  els.stageGrid.replaceChildren();
  for (const stage of ROADMAP) {
    const card = el('article', 'stage-card');
    card.append(el('p', 'stage-meta', `Stage ${stage.n} · ${stage.hours}`));
    card.append(el('h3', '', stage.title));
    card.append(el('p', 'stage-why', stage.why));
    const chips = el('div', 'chips');
    for (const id of stage.ids) {
      const t = byId.get(id);
      if (!t) continue;
      const chip = el('span', 'chip' + (isComplete(t) ? ' is-done' : ''), displayName(t));
      chips.append(chip);
    }
    card.append(chips);
    els.stageGrid.append(card);
  }
}

function renderAudit() {
  els.auditRows.replaceChildren();
  for (const t of trophies.filter((x) => x.missable)) {
    const row = el('div', 'audit-row');
    row.append(el('strong', '', displayName(t)));
    row.append(el('p', '', t.missableNote ?? ''));
    els.auditRows.append(row);
  }
}

function renderCitationAudit() {
  const citedGuides = trophies.filter((t) => Array.isArray(t.sources) && t.sources.length > 0).length;
  let steps = 0;
  let citedSteps = 0;
  for (const t of trophies) {
    for (const s of t.steps ?? []) {
      steps += 1;
      if (s.source) citedSteps += 1;
    }
  }
  els.citationAudit.textContent =
    `Citation audit — ${citedGuides} of ${trophies.length} guides cite named sources · ${citedSteps} of ${steps} steps carry citations`;
}

function matchesFilter(t) {
  if (activeFilter === 'all') return true;
  if (activeFilter === 'missable') return !!t.missable;
  return t.kind === activeFilter;
}

function matchesSearch(t) {
  const q = els.search.value.trim().toLowerCase();
  if (!q) return true;
  return (t.name + ' ' + t.description + ' ' + (KIND_LABELS[t.kind] ?? '')).toLowerCase().includes(q);
}

function renderRows() {
  const scrollY = window.scrollY;
  els.rows.replaceChildren();
  let shown = 0;
  for (const t of trophies) {
    if (!matchesFilter(t) || !matchesSearch(t)) continue;
    shown += 1;
    els.rows.append(buildRow(t));
  }
  els.noResults.hidden = shown > 0;
  window.scrollTo(window.scrollX, scrollY);
}

function buildRow(t) {
  const row = el('article', 'trophy-row' + (isComplete(t) ? ' is-complete' : ''));
  row.dataset.id = String(t.id);

  const top = el('div', 'row-top');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = state.checked.includes(t.id);
  box.dataset.action = 'check';
  box.setAttribute('aria-label', `Mark ${t.name} as earned`);
  top.append(box);
  top.append(el('span', `grade-badge grade-${t.grade}`, t.grade));
  top.append(el('h3', '', displayName(t)));
  top.append(el('span', 'kind-tag', KIND_LABELS[t.kind] ?? t.kind));
  if (typeof t.target === 'number') top.append(el('span', 'target-chip', `Target ${t.target.toLocaleString('en-US')}`));
  row.append(top);

  if (isMasked(t)) {
    row.append(el('p', 'masked-note',
      'Name, description and guide hidden by the spoiler setting — earn this trophy or use “Show spoilers” to reveal them.'));
    return row;
  }

  row.append(el('p', 'official-desc', t.description));
  row.append(el('p', 'guide-text', t.guide));

  const list = el('ul', 'steps');
  for (const s of t.steps ?? []) {
    const li = el('li', '', s.text);
    li.append(el('span', 'step-source', s.source));
    list.append(li);
  }
  row.append(list);

  row.append(el('p', 'sources-line', `Sources: ${(t.sources ?? []).join(' · ')}`));

  if (t.missable && t.missableNote) {
    row.append(el('p', 'missable-warning', `Missable — ${t.missableNote}`));
  }

  if (typeof t.target === 'number') {
    const counter = el('div', 'counter');
    const dec = el('button', '', '−');
    dec.type = 'button';
    dec.dataset.action = 'dec';
    dec.setAttribute('aria-label', `Decrease count for ${t.name}`);
    const val = el('span', 'count-val', String(state.counters[t.id] ?? 0));
    const inc = el('button', '', '+');
    inc.type = 'button';
    inc.dataset.action = 'inc';
    inc.setAttribute('aria-label', `Increase count for ${t.name}`);
    counter.append(dec, val, inc, el('span', 'count-target', `/ ${t.target.toLocaleString('en-US')}`));
    row.append(counter);
  }
  return row;
}

function renderAll() {
  renderProgress();
  renderStages();
  renderAudit();
  renderCitationAudit();
  renderRows();
  els.spoilerToggle.textContent = state.hideSpoilers ? 'Show spoilers' : 'Hide spoilers';
  els.spoilerToggle.setAttribute('aria-pressed', String(state.hideSpoilers));
  els.spoilerNote.hidden = !state.hideSpoilers;
}

function refreshDerived() {
  renderProgress();
  renderStages();
  renderAudit();
  renderRows();
  els.spoilerNote.hidden = !state.hideSpoilers;
}

els.rows.addEventListener('change', (event) => {
  const box = event.target;
  if (!(box instanceof HTMLInputElement) || box.dataset.action !== 'check') return;
  const row = box.closest('.trophy-row');
  const id = Number(row?.dataset.id);
  if (!id) return;
  state.checked = box.checked
    ? [...new Set([...state.checked, id])]
    : state.checked.filter((x) => x !== id);
  saveState();
  refreshDerived();
});

els.rows.addEventListener('click', (event) => {
  const btn = event.target;
  if (!(btn instanceof HTMLButtonElement)) return;
  const action = btn.dataset.action;
  if (action !== 'inc' && action !== 'dec') return;
  const row = btn.closest('.trophy-row');
  const id = Number(row?.dataset.id);
  const t = byId.get(id);
  if (!t || typeof t.target !== 'number') return;
  const current = state.counters[id] ?? 0;
  const next = action === 'inc' ? current + 1 : Math.max(0, current - 1);
  state.counters[id] = next;
  saveState();
  const val = row.querySelector('.count-val');
  if (val) val.textContent = String(next);
  row.classList.toggle('is-complete', isComplete(t));
  renderProgress();
  renderStages();
});

document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter ?? 'all';
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
    renderRows();
  });
});

els.search.addEventListener('input', renderRows);

els.spoilerToggle.addEventListener('click', () => {
  state.hideSpoilers = !state.hideSpoilers;
  saveState();
  renderAll();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leonida-platinum-atlas-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('importFile').addEventListener('change', async (event) => {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    state = {
      checked: Array.isArray(parsed.checked) ? parsed.checked.filter((x) => Number.isInteger(x)) : [],
      counters: parsed.counters && typeof parsed.counters === 'object' ? parsed.counters : {},
      hideSpoilers: typeof parsed.hideSpoilers === 'boolean' ? parsed.hideSpoilers : state.hideSpoilers,
    };
    saveState();
    renderAll();
  } catch { /* an unreadable file leaves the saved progress untouched */ }
  input.value = '';
});

const doc = await (await fetch('data/trophies.json')).json();
trophies = doc.trophies;
byId = new Map(trophies.map((t) => [t.id, t]));
renderAll();
