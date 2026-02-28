import type { Result } from "@/domain/commons/result.js";
import type { Lead } from "@/domain/entities/orchestrator/lead.js";

export interface LeadUpdateData {
  readonly status: string;
  readonly callResult: string;
  readonly interestLevel: number;
  readonly nextAction: string;
  readonly summary: string;
  readonly retryCount: number;
  readonly lastCalledAt: Date;
}

export interface NewLeadData {
  readonly companyName: string;
  readonly contactName: string;
  readonly phoneNumber: string;
  readonly email: string;
}

export interface LeadRepository {
  fetchAllLeads(): Promise<Result<Lead[], Error>>;
  updateLeadResult(rowIndex: number, data: LeadUpdateData): Promise<Result<void, Error>>;
  addLead(data: NewLeadData): Promise<Result<void, Error>>;
}
