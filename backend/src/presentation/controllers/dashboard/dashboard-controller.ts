import type { FastifyReply, FastifyRequest } from "fastify";

import type { DashboardUseCase } from "@/application/usecases/dashboard/dashboard-usecase.js";
import type { AutoCallOrchestratorUseCase } from "@/application/usecases/orchestrator/auto-call-orchestrator-usecase.js";
import type { DashboardStatusDto } from "@/application/dto/dashboard/dashboard-dto.js";
import { HTTP_STATUS } from "@/constants/http.js";

interface LeadsQuerystring {
  status?: string;
}

interface AddLeadBody {
  companyName: string;
  contactName: string;
  phoneNumber: string;
  email?: string;
}

interface EditLeadParams {
  rowIndex: string;
}

interface EditLeadBody {
  companyName: string;
  contactName: string;
  phoneNumber: string;
  email?: string;
}

export class DashboardController {
  constructor(
    private readonly dashboardUseCase: DashboardUseCase,
    private readonly orchestrator: AutoCallOrchestratorUseCase | null,
    private readonly spreadsheetId: string,
  ) {}

  async getKpis(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const result = await this.dashboardUseCase.getKpis();

    if (!result.success) {
      throw result.error;
    }

    reply.status(HTTP_STATUS.OK).send({
      isSuccess: true,
      data: result.data,
    });
  }

  async getLeads(
    request: FastifyRequest<{ Querystring: LeadsQuerystring }>,
    reply: FastifyReply,
  ): Promise<void> {
    const result = await this.dashboardUseCase.getLeads(request.query.status);

    if (!result.success) {
      throw result.error;
    }

    reply.status(HTTP_STATUS.OK).send({
      isSuccess: true,
      data: result.data,
    });
  }

  async getCallHistory(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const result = await this.dashboardUseCase.getCallHistory();

    if (!result.success) {
      throw result.error;
    }

    reply.status(HTTP_STATUS.OK).send({
      isSuccess: true,
      data: result.data,
    });
  }

  async addLead(
    request: FastifyRequest<{ Body: AddLeadBody }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { companyName, contactName, phoneNumber, email } = request.body;

    const result = await this.dashboardUseCase.addLead({
      companyName,
      contactName,
      phoneNumber,
      email: email ?? "",
    });

    if (!result.success) {
      throw result.error;
    }

    reply.status(HTTP_STATUS.CREATED).send({
      isSuccess: true,
      data: null,
    });
  }

  async editLead(
    request: FastifyRequest<{ Params: EditLeadParams; Body: EditLeadBody }>,
    reply: FastifyReply,
  ): Promise<void> {
    const rowIndex = parseInt(request.params.rowIndex, 10);
    const { companyName, contactName, phoneNumber, email } = request.body;

    const result = await this.dashboardUseCase.editLead(rowIndex, {
      companyName,
      contactName,
      phoneNumber,
      email: email ?? "",
    });

    if (!result.success) {
      throw result.error;
    }

    reply.status(HTTP_STATUS.OK).send({
      isSuccess: true,
      data: null,
    });
  }

  async getStatus(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const status: DashboardStatusDto = this.orchestrator
      ? {
          orchestratorState: this.orchestrator.getStatus().state,
          processedCount: this.orchestrator.getStatus().processedCount,
          totalLeads: this.orchestrator.getStatus().totalLeads,
          currentLead: this.orchestrator.getStatus().currentLead,
        }
      : {
          orchestratorState: "idle",
          processedCount: 0,
          totalLeads: 0,
          currentLead: null,
        };

    reply.status(HTTP_STATUS.OK).send({
      isSuccess: true,
      data: {
        ...status,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`,
      },
    });
  }
}
