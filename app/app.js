/* Leonida Platinum Atlas — tracker logic.
   Loads app/data/trophies.json, renders the roadmap, the missable audit and
   the 55-row checklist, and keeps progress in localStorage. No network use
   beyond the same-origin data file. */
const STORE_KEY = 'leonida-platinum-atlas-v1';
const DATA_URL = 'data/trophies.json';

let trophies = [];
let roadmap = [];
let state = { checked: {}, counters: {}, spoilers: true };
let filter = 'all';
let searchText = '';

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatNumber(n) {
  return Number(n).toLocaleString('en-US');
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && typeof saved === 'object') {
      state.checked = saved.checked || {};
      state.counters = saved.counters || {};
      if (typeof saved.spoilers === 'boolean') state.spoilers = saved.spoilers;
    }
  } catch (err) { /* corrupted save: start fresh */ }
}

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (err) { /* storage full or blocked: progress just does not persist */ }
}

function trophyById(id) {
  return trophies.find(function (t) { return t.id === id; });
}

function isEarned(trophy) {
  if (state.checked[trophy.id]) return true;
  if (trophy.target) return (state.counters[trophy.id] || 0) >= trophy.target;
  return false;
}

function earnedCount() {
  return trophies.filter(isEarned).length;
}

function updateProgress() {
  const done = earnedCount();
  const total = trophies.length || 55;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent =
    done + ' of ' + total + ' trophies · ' + pct + '%';
}

function updateAuditLine() {
  const cited = trophies.filter(function (t) {
    return t.guide && t.guide.trim() && t.sources && t.sources.length > 0;
  }).length;
  let citedSteps = 0;
  let allSteps = 0;
  trophies.forEach(function (t) {
    (t.steps || []).forEach(function (s) {
      allSteps += 1;
      if (s.source) citedSteps += 1;
    });
  });
  document.getElementById('auditLine').textContent =
    'Citation audit — ' + cited + ' of ' + trophies.length +
    ' guides cite named sources · ' + citedSteps + ' of ' + allSteps +
    ' steps carry citations';
}

function renderRoadmap() {
  const host = document.getElementById('roadmap');
  host.innerHTML = roadmap.map(function (stage) {
    const chips = stage.ids.map(function (id) {
      const t = trophyById(id);
      if (!t) return '';
      const done = isEarned(t) ? ' done' : '';
      return '<span class="chip' + done + '">' + esc(t.name) + '</span>';
    }).join('');
    return '<div class="stage"><h3>Stage ' + stage.stage + ' — ' +
      esc(stage.title) + '</h3><p class="hours">~' + stage.hours +
      ' hours · ' + stage.ids.length + ' trophies</p><p>' +
      esc(stage.why) + '</p><div class="chips">' + chips + '</div></div>';
  }).join('');
}

function renderAudit() {
  const host = document.getElementById('audit');
  const missables = trophies.filter(function (t) { return t.missable; });
  host.innerHTML = missables.map(function (t) {
    const mark = isEarned(t) ? ' ✓ earned' : '';
    return '<div class="audit-row"><span class="name">' + esc(t.name) +
      mark + '</span><p class="note">' + esc(t.missableNote || '') +
      '</p></div>';
  }).join('');
}

function trophyRow(trophy) {
  const earned = isEarned(trophy);
  const masked = state.spoilers && trophy.kind === 'story' && !earned;
  const gradeLabel = trophy.grade.charAt(0).toUpperCase() + trophy.grade.slice(1);
  let head = '<div class="trophy-top"><input type="checkbox" data-id="' +
    trophy.id + '"' + (state.checked[trophy.id] ? ' checked' : '') +
    ' aria-label="Mark ' + esc(trophy.name) + ' earned">';
  head += '<div><h3 class="trophy-name">';
  head += masked ? 'Hidden trophy — spoilers hidden'
    : esc(trophy.name);
  head += '<span class="grade grade-' + trophy.grade + '">' + gradeLabel +
    '</span><span class="kind-tag">' + trophy.kind + '</span>';
  if (trophy.target) {
    head += '<span class="target-chip">Target ' + formatNumber(trophy.target) + '</span>';
  }
  head += '</h3>';
  if (masked) {
    head += '<p class="masked">Story trophy — name and description hidden until earned. ' +
      'Toggle “Hide spoilers” to reveal it.</p></div></div>';
    return '<article class="trophy' + (earned ? ' earned' : '') +
      '" data-id="' + trophy.id + '">' + head + '</article>';
  }
  head += '<p class="desc">“' + esc(trophy.description) + '”</p>';
  head += '<p class="guide">' + esc(trophy.guide) + '</p>';
  if (trophy.steps && trophy.steps.length) {
    head += '<ol class="steps">' + trophy.steps.map(function (s) {
      return '<li>' + esc(s.text) +
        '<span class="src-tag">' + esc(s.source) + '</span></li>';
    }).join('') + '</ol>';
  }
  if (trophy.sources && trophy.sources.length) {
    head += '<p class="sources">Sources: ' + esc(trophy.sources.join(' · ')) + '</p>';
  }
  if (trophy.missable && trophy.missableNote) {
    head += '<p class="warn">⚠ Missable — ' + esc(trophy.missableNote) + '</p>';
  }
  head += '</div></div>';
  if (trophy.target) {
    const value = state.counters[trophy.id] || 0;
    head += '<div class="stepper"><button type="button" data-step="-1" data-id="' +
      trophy.id + '" aria-label="Decrease counter">−</button>' +
      '<span class="count">' + formatNumber(value) + ' / ' +
      formatNumber(trophy.target) + '</span>' +
      '<button type="button" data-step="1" data-id="' + trophy.id +
      '" aria-label="Increase counter">+</button></div>';
  }
  return '<article class="trophy' + (earned ? ' earned' : '') +
    '" data-id="' + trophy.id + '">' + head + '</article>';
}

function matchesFilter(trophy) {
  if (filter === 'missable') return !!trophy.missable;
  if (filter === 'all') return true;
  return trophy.kind === filter;
}

function renderChecklist() {
  const host = document.getElementById('checklist');
  const query = searchText.trim().toLowerCase();
  const shown = trophies.filter(function (t) {
    if (!matchesFilter(t)) return false;
    if (query && t.name.toLowerCase().indexOf(query) === -1) return false;
    return true;
  });
  host.innerHTML = shown.map(trophyRow).join('');
  document.getElementById('emptyState').hidden = shown.length > 0;
}

function renderAll() {
  renderRoadmap();
  renderAudit();
  renderChecklist();
  updateProgress();
  updateAuditLine();
  document.getElementById('spoilerBtn').textContent =
    'Hide spoilers: ' + (state.spoilers ? 'ON' : 'OFF');
}

function exportProgress() {
  const blob = new Blob([JSON.stringify(state, null, 2)],
    { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leonida-platinum-atlas-progress.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!parsed || typeof parsed !== 'object') throw new Error('bad file');
      state.checked = parsed.checked || {};
      state.counters = parsed.counters || {};
      if (typeof parsed.spoilers === 'boolean') state.spoilers = parsed.spoilers;
      saveState();
      renderAll();
    } catch (err) {
      alert('That file is not a Leonida Platinum Atlas progress export.');
    }
  };
  reader.readAsText(file);
}

function wireEvents() {
  document.getElementById('checklist').addEventListener('change', function (event) {
    const box = event.target;
    if (box.matches('input[type="checkbox"]')) {
      const id = Number(box.dataset.id);
      if (box.checked) state.checked[id] = true;
      else delete state.checked[id];
      saveState();
      renderAll();
    }
  });
  document.getElementById('checklist').addEventListener('click', function (event) {
    const button = event.target.closest('button[data-step]');
    if (!button) return;
    const id = Number(button.dataset.id);
    const trophy = trophyById(id);
    if (!trophy || !trophy.target) return;
    const next = Math.max(0, Math.min(trophy.target,
      (state.counters[id] || 0) + Number(button.dataset.step)));
    state.counters[id] = next;
    saveState();
    renderAll();
  });
  document.getElementById('filters').addEventListener('click', function (event) {
    const button = event.target.closest('button[data-filter]');
    if (!button) return;
    filter = button.dataset.filter;
    document.querySelectorAll('#filters button').forEach(function (b) {
      b.classList.toggle('active', b === button);
    });
    renderChecklist();
  });
  document.getElementById('search').addEventListener('input', function (event) {
    searchText = event.target.value;
    renderChecklist();
  });
  document.getElementById('spoilerBtn').addEventListener('click', function () {
    state.spoilers = !state.spoilers;
    saveState();
    renderAll();
  });
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importBtn').addEventListener('click', function () {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', function (event) {
    if (event.target.files && event.target.files[0]) {
      importProgress(event.target.files[0]);
    }
    event.target.value = '';
  });
}

function loadTrophies() {
  loadState();
  wireEvents();
  fetch(DATA_URL).then(function (response) {
    if (!response.ok) throw new Error('data failed to load');
    return response.json();
  }).then(function (data) {
    trophies = data.trophies || [];
    roadmap = data.roadmap || [];
    renderAll();
  }).catch(function () {
    document.getElementById('checklist').innerHTML =
      '<p class="empty">The trophy data could not be loaded. ' +
      'Serve this folder over HTTP and reload.</p>';
  });
}

loadTrophies();
