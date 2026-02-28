import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import supertest from "supertest";

import { DashboardUseCase } from "@/application/usecases/dashboard/dashboard-usecase";
import type { LeadRepository } from "@/domain/repositories/orchestrator/lead-repository";
import { DashboardController } from "@/presentation/controllers/dashboard/dashboard-controller";
import { dashboardRoutes } from "@/presentation/routes/dashboard/dashboard-routes";
import { errorHandler } from "@/presentation/errors/error-handler";
import { HTTP_STATUS } from "@/constants/http";
import { ok } from "@/domain/commons/result";
import { Lead } from "@/domain/entities/orchestrator/lead";

function createMockLeadRepo(): jest.Mocked<LeadRepository> {
  return {
    fetchAllLeads: jest.fn(),
    updateLeadResult: jest.fn(),
    addLead: jest.fn(),
  };
}

function buildApp(mockLeadRepo: jest.Mocked<LeadRepository>): FastifyInstance {
  const app = Fastify();
  app.setErrorHandler(errorHandler);
  const useCase = new DashboardUseCase(mockLeadRepo);
  const controller = new DashboardController(useCase, null, "test-sheet-id");
  app.register(dashboardRoutes(controller));
  return app;
}

const lead1 = new Lead(2, "会社A", "名前A", "+819012345678", "a@test.com", "完了", 0, "2026-02-28 10:00", "応答", "7", "フォロー", "要約テスト");
const lead2 = new Lead(3, "会社B", "名前B", "+819087654321", "", "", 0, "", "", "", "", "");

describe("Dashboard API", () => {
  describe("GET /api/dashboard/kpis", () => {
    it("should return KPI data", async () => {
      const repo = createMockLeadRepo();
      repo.fetchAllLeads.mockResolvedValue(ok([lead1, lead2]));
      const app = buildApp(repo);
      await app.ready();

      const res = await supertest(app.server).get("/api/dashboard/kpis");

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.isSuccess).toBe(true);
      expect(res.body.data.totalLeads).toBe(2);
      expect(res.body.data.totalCalled).toBe(1);

      await app.close();
    });
  });

  describe("GET /api/dashboard/leads", () => {
    it("should return all leads", async () => {
      const repo = createMockLeadRepo();
      repo.fetchAllLeads.mockResolvedValue(ok([lead1, lead2]));
      const app = buildApp(repo);
      await app.ready();

      const res = await supertest(app.server).get("/api/dashboard/leads");

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.isSuccess).toBe(true);
      expect(res.body.data).toHaveLength(2);

      await app.close();
    });

    it("should filter by pending status", async () => {
      const repo = createMockLeadRepo();
      repo.fetchAllLeads.mockResolvedValue(ok([lead1, lead2]));
      const app = buildApp(repo);
      await app.ready();

      const res = await supertest(app.server).get("/api/dashboard/leads?status=pending");

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].companyName).toBe("会社B");

      await app.close();
    });
  });

  describe("GET /api/dashboard/call-history", () => {
    it("should return call history", async () => {
      const repo = createMockLeadRepo();
      repo.fetchAllLeads.mockResolvedValue(ok([lead1, lead2]));
      const app = buildApp(repo);
      await app.ready();

      const res = await supertest(app.server).get("/api/dashboard/call-history");

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].companyName).toBe("会社A");

      await app.close();
    });
  });

  describe("POST /api/dashboard/leads", () => {
    it("should add a new lead", async () => {
      const repo = createMockLeadRepo();
      repo.addLead.mockResolvedValue(ok(undefined));
      const app = buildApp(repo);
      await app.ready();

      const res = await supertest(app.server)
        .post("/api/dashboard/leads")
        .send({ companyName: "新会社", contactName: "新名前", phoneNumber: "09012345678", email: "new@test.com" });

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.isSuccess).toBe(true);
      expect(repo.addLead).toHaveBeenCalledWith({
        companyName: "新会社",
        contactName: "新名前",
        phoneNumber: "09012345678",
        email: "new@test.com",
      });

      await app.close();
    });
  });

  describe("GET /api/dashboard/status", () => {
    it("should return orchestrator status with spreadsheet URL", async () => {
      const repo = createMockLeadRepo();
      const app = buildApp(repo);
      await app.ready();

      const res = await supertest(app.server).get("/api/dashboard/status");

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.data.orchestratorState).toBe("idle");
      expect(res.body.data.spreadsheetUrl).toBe("https://docs.google.com/spreadsheets/d/test-sheet-id");

      await app.close();
    });
  });
});
