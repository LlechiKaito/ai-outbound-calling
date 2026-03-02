export const ORCHESTRATOR_ERROR_MESSAGES = {
  CANNOT_START: "Orchestrator can only start from idle or stopped state",
  CANNOT_PAUSE: "Orchestrator can only pause from running state",
  CANNOT_RESUME: "Orchestrator can only resume from paused state",
  CANNOT_STOP: "Orchestrator can only stop from running or paused state",
  ALREADY_RUNNING: "Orchestrator is already running",
  FETCH_LEADS_FAILED: "Failed to fetch leads from spreadsheet",
  UPDATE_LEAD_FAILED: "Failed to update lead in spreadsheet",
  NO_PENDING_LEADS: "No pending leads found",
  OUTSIDE_BUSINESS_HOURS: "Current time is outside business hours",
  INVALID_ORCHESTRATOR_STATE: "Invalid orchestrator state",
  ORCHESTRATOR_NOT_CONFIGURED: "Orchestrator requires Google Sheets and ElevenLabs configuration",
} as const;
