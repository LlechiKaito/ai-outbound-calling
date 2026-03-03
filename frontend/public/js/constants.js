const API_BASE_URL = window.API_BASE_URL || '';

const API_PATHS = {
  KPIS: '/api/dashboard/kpis',
  LEADS: '/api/dashboard/leads',
  CALL_HISTORY: '/api/dashboard/call-history',
  STATUS: '/api/dashboard/status',
  ORCHESTRATOR: '/api/orchestrator/',
};

const STATE_LABELS = {
  idle: '待機中',
  running: '実行中',
  paused: '一時停止',
  stopped: '停止',
};

const STATE_COLORS = {
  idle: { badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  running: { badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  paused: { badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  stopped: { badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

const PHASE_LABELS = {
  calling: '架電中...',
  waiting_response: '通話中...',
  analyzing: '分析中...',
  sending_email: 'メール送信中...',
  updating: '更新中...',
};

const PHASE_COLORS = {
  calling: 'text-blue-600',
  waiting_response: 'text-green-600',
  analyzing: 'text-purple-600',
  sending_email: 'text-orange-600',
  updating: 'text-gray-600',
};

const ERROR_MESSAGES = {
  REQUIRED_FIELDS: '会社名・担当者名・電話番号は必須です。',
  ADD_LEAD_FAILED: 'リードの追加に失敗しました。',
  EDIT_LEAD_FAILED: 'リードの更新に失敗しました。',
};

const EMPTY_MESSAGES = {
  NO_LEADS: 'リードがありません',
  NO_HISTORY: '履歴がありません',
};

const LEADS_TABLE_COLSPAN = 10;
const HISTORY_TABLE_COLSPAN = 6;
const AUTO_REFRESH_INTERVAL_MS = 5000;
