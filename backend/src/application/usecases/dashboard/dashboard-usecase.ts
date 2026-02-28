import type { Result } from "@/domain/commons/result.js";
import { ok } from "@/domain/commons/result.js";
import type { LeadRepository, NewLeadData, EditLeadData } from "@/domain/repositories/orchestrator/lead-repository.js";
import type { Lead } from "@/domain/entities/orchestrator/lead.js";
import type {
  DashboardKpiDto,
  DashboardLeadDto,
  CallHistoryEntryDto,
} from "@/application/dto/dashboard/dashboard-dto.js";
import { LEAD_STATUS } from "@/constants/orchestrator.js";

export class DashboardUseCase {
  constructor(
    private readonly leadRepository: LeadRepository,
  ) {}

  async getKpis(): Promise<Result<DashboardKpiDto, Error>> {
    const leadsResult = await this.leadRepository.fetchAllLeads();

    if (!leadsResult.success) {
      return leadsResult;
    }

    const leads = leadsResult.data;
    return ok(this.computeKpis(leads));
  }

  async getLeads(statusFilter?: string): Promise<Result<DashboardLeadDto[], Error>> {
    const leadsResult = await this.leadRepository.fetchAllLeads();

    if (!leadsResult.success) {
      return leadsResult;
    }

    const filtered = statusFilter
      ? this.filterLeadsByStatus(leadsResult.data, statusFilter)
      : leadsResult.data;

    return ok(filtered.map(this.toLeadDto));
  }

  async getCallHistory(): Promise<Result<CallHistoryEntryDto[], Error>> {
    const leadsResult = await this.leadRepository.fetchAllLeads();

    if (!leadsResult.success) {
      return leadsResult;
    }

    const calledLeads = leadsResult.data
      .filter((lead) => lead.lastCalledAt !== "")
      .sort((a, b) => this.compareDates(b.lastCalledAt, a.lastCalledAt));

    return ok(calledLeads.map(this.toCallHistoryDto));
  }

  async addLead(data: NewLeadData): Promise<Result<void, Error>> {
    return this.leadRepository.addLead(data);
  }

  async editLead(rowIndex: number, data: EditLeadData): Promise<Result<void, Error>> {
    return this.leadRepository.editLead(rowIndex, data);
  }

  private computeKpis(leads: Lead[]): DashboardKpiDto {
    const totalLeads = leads.length;
    const calledLeads = leads.filter((l) => l.lastCalledAt !== "");
    const totalCalled = calledLeads.length;
    const successCount = leads.filter((l) => l.callResult === "応答").length;
    const successRate = totalCalled > 0 ? Math.round((successCount / totalCalled) * 100) : 0;

    const interestValues = leads
      .map((l) => parseInt(l.interestLevel, 10))
      .filter((v) => !isNaN(v) && v > 0);
    const avgInterestLevel = interestValues.length > 0
      ? Math.round((interestValues.reduce((sum, v) => sum + v, 0) / interestValues.length) * 10) / 10
      : 0;

    const pendingCount = leads.filter((l) => l.isPending()).length;
    const retryLimitCount = leads.filter((l) => l.status === LEAD_STATUS.RETRY_LIMIT).length;

    return {
      totalLeads,
      totalCalled,
      successCount,
      successRate,
      avgInterestLevel,
      pendingCount,
      retryLimitCount,
    };
  }

  private filterLeadsByStatus(leads: Lead[], status: string): Lead[] {
    switch (status) {
      case "pending":
        return leads.filter((l) => l.isPending());
      case "completed":
        return leads.filter((l) => l.status === LEAD_STATUS.COMPLETED);
      case "retry_limit":
        return leads.filter((l) => l.status === LEAD_STATUS.RETRY_LIMIT);
      default:
        return leads;
    }
  }

  private toLeadDto(lead: Lead): DashboardLeadDto {
    return {
      rowIndex: lead.rowIndex,
      companyName: lead.companyName,
      contactName: lead.contactName,
      phoneNumber: lead.phoneNumber,
      email: lead.email,
      status: lead.status,
      retryCount: lead.retryCount,
      lastCalledAt: lead.lastCalledAt,
      callResult: lead.callResult,
      interestLevel: lead.interestLevel,
      nextAction: lead.nextAction,
      memo: lead.memo,
    };
  }

  private toCallHistoryDto(lead: Lead): CallHistoryEntryDto {
    return {
      companyName: lead.companyName,
      contactName: lead.contactName,
      phoneNumber: lead.phoneNumber,
      callResult: lead.callResult,
      interestLevel: lead.interestLevel,
      lastCalledAt: lead.lastCalledAt,
      memo: lead.memo,
    };
  }

  private compareDates(a: string, b: string): number {
    const dateA = new Date(a);
    const dateB = new Date(b);

    if (isNaN(dateA.getTime())) return -1;
    if (isNaN(dateB.getTime())) return 1;
    return dateA.getTime() - dateB.getTime();
  }
}
