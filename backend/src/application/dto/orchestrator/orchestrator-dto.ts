import type { OrchestratorStateValue } from "@/domain/value-objects/orchestrator/orchestrator-state.js";
import type { OrchestratorPhaseValue } from "@/constants/orchestrator.js";

export interface OrchestratorStatusResponseDto {
  readonly state: OrchestratorStateValue;
  readonly processedCount: number;
  readonly totalLeads: number;
  readonly currentLead: CurrentLeadDto | null;
  readonly currentPhase: OrchestratorPhaseValue;
  readonly activityLog: readonly ActivityLogEntry[];
}

export interface CurrentLeadDto {
  readonly companyName: string;
  readonly contactName: string;
  readonly phoneNumber: string;
}

export interface ActivityLogEntry {
  readonly timestamp: string;
  readonly companyName: string;
  readonly callResult: string;
  readonly detail: string;
}

export interface CallCompletionEvent {
  readonly answered: boolean;
  readonly transcript: string;
}
