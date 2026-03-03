import type { OrchestratorStateValue } from "@/domain/value-objects/orchestrator/orchestrator-state.js";

export interface DashboardKpiDto {
  readonly totalCalled: number;
  readonly successRate: number;
  readonly avgInterestLevel: number;
  readonly emailSentCount: number;
}

export interface DashboardLeadDto {
  readonly rowIndex: number;
  readonly companyName: string;
  readonly contactName: string;
  readonly phoneNumber: string;
  readonly email: string;
  readonly status: string;
  readonly retryCount: number;
  readonly lastCalledAt: string;
  readonly callResult: string;
  readonly interestLevel: string;
  readonly nextAction: string;
  readonly memo: string;
}

export interface CallHistoryEntryDto {
  readonly companyName: string;
  readonly contactName: string;
  readonly phoneNumber: string;
  readonly callResult: string;
  readonly interestLevel: string;
  readonly lastCalledAt: string;
  readonly memo: string;
}

export interface DashboardStatusDto {
  readonly orchestratorState: OrchestratorStateValue;
  readonly processedCount: number;
  readonly totalLeads: number;
  readonly currentLead: {
    readonly companyName: string;
    readonly contactName: string;
    readonly phoneNumber: string;
  } | null;
  readonly currentPhase: string;
  readonly activityLog: readonly {
    readonly timestamp: string;
    readonly companyName: string;
    readonly callResult: string;
    readonly detail: string;
  }[];
}
