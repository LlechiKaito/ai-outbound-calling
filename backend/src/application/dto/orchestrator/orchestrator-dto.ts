import type { OrchestratorStateValue } from "@/domain/value-objects/orchestrator/orchestrator-state.js";

export interface OrchestratorStatusResponseDto {
  readonly state: OrchestratorStateValue;
  readonly processedCount: number;
  readonly totalLeads: number;
  readonly currentLead: CurrentLeadDto | null;
}

export interface CurrentLeadDto {
  readonly companyName: string;
  readonly contactName: string;
  readonly phoneNumber: string;
}

export interface CallCompletionEvent {
  readonly answered: boolean;
  readonly transcript: string;
}
