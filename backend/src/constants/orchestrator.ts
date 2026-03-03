const JST_OFFSET_HOURS = 9;

export const JST_OFFSET_MS = JST_OFFSET_HOURS * 60 * 60 * 1000;

export const BUSINESS_HOURS_START = 9 * 60;
export const BUSINESS_HOURS_END = 17 * 60 + 30;
export const LUNCH_BREAK_START = 12 * 60;
export const LUNCH_BREAK_END = 13 * 60;

export const WEEKEND_DAYS: readonly number[] = [0, 6];

export const MAX_RETRY_COUNT = 3;

export const CALL_TIMEOUT_MS = 120_000;

export const INTER_CALL_DELAY_MS = 5_000;

export const BUSINESS_HOURS_CHECK_INTERVAL_MS = 60_000;

export const PAUSE_CHECK_INTERVAL_MS = 1_000;

export const LEAD_SHEET_RANGE = "A:K" as const;

export const LEAD_SHEET_COLUMNS = {
  COMPANY_NAME: 0,
  CONTACT_NAME: 1,
  PHONE_NUMBER: 2,
  EMAIL: 3,
  STATUS: 4,
  LAST_CALLED_AT: 5,
  CALL_RESULT: 6,
  INTEREST_LEVEL: 7,
  NEXT_ACTION: 8,
  MEMO: 9,
  RETRY_COUNT: 10,
} as const;

export const HEADER_ROW_OFFSET = 1;

export const LEAD_STATUS = {
  PENDING: "未対応",
  FOLLOWING: "フォロー中",
  COMPLETED: "対応済み",
} as const;

export const ORCHESTRATOR_PHASE = {
  IDLE: "",
  CALLING: "calling",
  WAITING_RESPONSE: "waiting_response",
  ANALYZING: "analyzing",
  SENDING_EMAIL: "sending_email",
  UPDATING: "updating",
} as const;

export type OrchestratorPhaseValue = typeof ORCHESTRATOR_PHASE[keyof typeof ORCHESTRATOR_PHASE];

export const MAX_ACTIVITY_LOG_ENTRIES = 20;
