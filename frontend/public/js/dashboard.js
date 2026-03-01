let currentFilter = '';
let leadsCache = [];
let autoRefreshTimer = null;

// --- KPI表示 ---
async function loadKpis() {
  const res = await apiFetch(API_PATHS.KPIS);
  if (!res.isSuccess) return;
  const d = res.data;
  document.getElementById('kpi-total-called').textContent = d.totalCalled;
  document.getElementById('kpi-success-rate').textContent = d.successRate + '%';
  document.getElementById('kpi-avg-interest').textContent = d.avgInterestLevel;
  document.getElementById('kpi-email-sent').textContent = d.emailSentCount;
}

// --- 架電リスト管理 ---
function buildLeadRow(l) {
  return '<tr class="hover:bg-gray-50">'
    + '<td class="px-4 py-3">' + esc(l.companyName) + '</td>'
    + '<td class="px-4 py-3">' + esc(l.contactName) + '</td>'
    + '<td class="px-4 py-3 font-mono text-xs">' + esc(l.phoneNumber) + '</td>'
    + '<td class="px-4 py-3">' + statusBadge(l.status) + '</td>'
    + '<td class="px-4 py-3">' + resultBadge(l.callResult) + '</td>'
    + '<td class="px-4 py-3">' + interestBar(l.interestLevel) + '</td>'
    + '<td class="px-4 py-3 text-xs text-gray-500">' + esc(l.lastCalledAt) + '</td>'
    + '<td class="px-4 py-3 text-xs">' + esc(l.nextAction) + '</td>'
    + '<td class="px-4 py-3 text-center">' + l.retryCount + '</td>'
    + '<td class="px-4 py-3 text-center">'
    + '<button onclick="openEditModal(' + l.rowIndex + ')"'
    + ' class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">編集</button>'
    + '</td></tr>';
}

function emptyRow(message, colspan) {
  return '<tr><td colspan="' + colspan + '" class="px-4 py-8 text-center text-gray-400">' + message + '</td></tr>';
}

async function loadLeads() {
  const q = currentFilter ? '?status=' + currentFilter : '';
  const res = await apiFetch(API_PATHS.LEADS + q);
  if (!res.isSuccess) return;
  leadsCache = res.data;
  const tbody = document.getElementById('leads-tbody');
  if (res.data.length === 0) {
    tbody.innerHTML = emptyRow(EMPTY_MESSAGES.NO_LEADS, LEADS_TABLE_COLSPAN);
    return;
  }
  tbody.innerHTML = res.data.map(buildLeadRow).join('');
}

function filterLeads(status) {
  currentFilter = status;
  document.querySelectorAll('#lead-tabs button').forEach(function (btn) {
    const tab = btn.dataset.tab;
    const isActive = (tab === 'all' && status === '') || tab === status;
    btn.className = isActive ? 'tab-active pb-1' : 'tab-inactive pb-1';
  });
  loadLeads();
}

// --- リード追加 ---
function toggleAddLeadForm() {
  const form = document.getElementById('add-lead-form');
  form.classList.toggle('hidden');
  if (!form.classList.contains('hidden')) {
    document.getElementById('new-company').focus();
  }
}

async function submitNewLead() {
  const companyName = document.getElementById('new-company').value.trim();
  const contactName = document.getElementById('new-contact').value.trim();
  const phoneNumber = document.getElementById('new-phone').value.trim();
  const email = document.getElementById('new-email').value.trim();
  const errorEl = document.getElementById('add-lead-error');

  if (!companyName || !contactName || !phoneNumber) {
    errorEl.textContent = ERROR_MESSAGES.REQUIRED_FIELDS;
    errorEl.classList.remove('hidden');
    return;
  }

  errorEl.classList.add('hidden');
  const res = await apiPost(API_PATHS.LEADS, { companyName, contactName, phoneNumber, email });

  if (res.isSuccess) {
    document.getElementById('new-company').value = '';
    document.getElementById('new-contact').value = '';
    document.getElementById('new-phone').value = '';
    document.getElementById('new-email').value = '';
    toggleAddLeadForm();
    await refreshAll();
  } else {
    errorEl.textContent = res.message || ERROR_MESSAGES.ADD_LEAD_FAILED;
    errorEl.classList.remove('hidden');
  }
}

// --- リード編集 ---
function openEditModal(rowIndex) {
  const lead = leadsCache.find(function (l) { return l.rowIndex === rowIndex; });
  if (!lead) return;
  document.getElementById('edit-row-index').value = rowIndex;
  document.getElementById('edit-company').value = lead.companyName;
  document.getElementById('edit-contact').value = lead.contactName;
  document.getElementById('edit-phone').value = lead.phoneNumber;
  document.getElementById('edit-email').value = lead.email || '';
  document.getElementById('edit-lead-error').classList.add('hidden');
  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
}

async function submitEditLead() {
  const rowIndex = document.getElementById('edit-row-index').value;
  const companyName = document.getElementById('edit-company').value.trim();
  const contactName = document.getElementById('edit-contact').value.trim();
  const phoneNumber = document.getElementById('edit-phone').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const errorEl = document.getElementById('edit-lead-error');

  if (!companyName || !contactName || !phoneNumber) {
    errorEl.textContent = ERROR_MESSAGES.REQUIRED_FIELDS;
    errorEl.classList.remove('hidden');
    return;
  }

  errorEl.classList.add('hidden');
  const res = await apiPut(API_PATHS.LEADS + '/' + rowIndex, { companyName, contactName, phoneNumber, email });

  if (res.isSuccess) {
    closeEditModal();
    await refreshAll();
  } else {
    errorEl.textContent = res.message || ERROR_MESSAGES.EDIT_LEAD_FAILED;
    errorEl.classList.remove('hidden');
  }
}

// --- 架電履歴一覧 ---
async function loadCallHistory() {
  const res = await apiFetch(API_PATHS.CALL_HISTORY);
  if (!res.isSuccess) return;
  const tbody = document.getElementById('history-tbody');
  if (res.data.length === 0) {
    tbody.innerHTML = emptyRow(EMPTY_MESSAGES.NO_HISTORY, HISTORY_TABLE_COLSPAN);
    return;
  }
  tbody.innerHTML = res.data.map(function (h) {
    return '<tr class="hover:bg-gray-50">'
      + '<td class="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">' + esc(h.lastCalledAt) + '</td>'
      + '<td class="px-4 py-3">' + esc(h.companyName) + '</td>'
      + '<td class="px-4 py-3">' + esc(h.contactName) + '</td>'
      + '<td class="px-4 py-3">' + resultBadge(h.callResult) + '</td>'
      + '<td class="px-4 py-3">' + interestBar(h.interestLevel) + '</td>'
      + '<td class="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">' + esc(h.memo) + '</td>'
      + '</tr>';
  }).join('');
}

// --- ライブアクティビティ ---
async function loadStatus() {
  const res = await apiFetch(API_PATHS.STATUS);
  if (!res.isSuccess) return;
  const d = res.data;
  const stateEl = document.getElementById('orchestrator-state');
  const dotEl = document.getElementById('status-dot');

  stateEl.textContent = STATE_LABELS[d.orchestratorState] || d.orchestratorState;

  const colors = STATE_COLORS[d.orchestratorState] || STATE_COLORS.idle;
  stateEl.className = 'status-badge ' + colors.badge;
  dotEl.className = 'w-2.5 h-2.5 rounded-full ' + colors.dot
    + (d.orchestratorState === 'running' ? ' pulse-dot' : '');

  const isRunning = d.orchestratorState === 'running';
  const isPaused = d.orchestratorState === 'paused';
  const canStart = d.orchestratorState === 'idle' || d.orchestratorState === 'stopped';

  document.getElementById('btn-start').disabled = !canStart;
  document.getElementById('btn-pause').disabled = !isRunning;
  document.getElementById('btn-resume').disabled = !isPaused;
  document.getElementById('btn-stop').disabled = !isRunning && !isPaused;

  var progressEl = document.getElementById('live-progress');
  var currentEl = document.getElementById('live-current-lead');

  if (d.spreadsheetUrl) {
    document.getElementById('sheets-link').href = d.spreadsheetUrl;
  }

  if (isRunning || isPaused) {
    progressEl.textContent = '進捗: ' + d.processedCount + ' / ' + d.totalLeads + ' 件';
    if (d.currentLead) {
      currentEl.textContent = '架電中: ' + d.currentLead.companyName + '（' + d.currentLead.contactName + '）';
    } else {
      currentEl.textContent = '';
    }
  } else {
    progressEl.textContent = '';
    currentEl.textContent = '';
  }
}

async function orchestratorAction(action) {
  await apiPost(API_PATHS.ORCHESTRATOR + action);
  await loadStatus();
  if (action === 'start') {
    await loadKpis();
    await loadLeads();
  }
}

// --- 初期化 ---
async function refreshAll() {
  await Promise.all([loadKpis(), loadLeads(), loadCallHistory(), loadStatus()]);
}

function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(loadStatus, AUTO_REFRESH_INTERVAL_MS);
}

refreshAll();
startAutoRefresh();
