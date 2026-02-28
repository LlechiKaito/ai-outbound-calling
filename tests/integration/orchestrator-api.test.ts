import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import supertest from "supertest";

import { AutoCallOrchestratorUseCase } from "@/application/usecases/orchestrator/auto-call-orchestrator-usecase";
import type { LeadRepository } from "@/domain/repositories/orchestrator/lead-repository";
import type { CallAnalysisRepository } from "@/domain/repositories/analysis/call-analysis-repository";
import type { MakeCallUseCase } from "@/application/usecases/call/make-call-usecase";
import { OrchestratorController } from "@/presentation/controllers/orchestrator/orchestrator-controller";
import { orchestratorRoutes } from "@/presentation/routes/orchestrator/orchestrator-routes";
import { errorHandler } from "@/presentation/errors/error-handler";
import { HTTP_STATUS } from "@/constants/http";
import { ok } from "@/domain/commons/result";
import { Lead } from "@/domain/entities/orchestrator/lead";

function createMocks() {
  const mockLeadRepo: jest.Mocked<LeadRepository> = {
    fetchAllLeads: jest.fn(),
    updateLeadResult: jest.fn(),
    addLead: jest.fn(),
    editLead: jest.fn(),
  };
  const mockMakeCallUseCase: jest.Mocked<Pick<MakeCallUseCase, "execute">> = {
    execute: jest.fn(),
  };
  const mockAnalysisRepo: jest.Mocked<CallAnalysisRepository> = {
    analyze: jest.fn(),
  };
  return { mockLeadRepo, mockMakeCallUseCase, mockAnalysisRepo };
}

describe("Orchestrator API", () => {
  describe("GET /api/orchestrator/status", () => {
    it("should return current status", async () => {
      const { mockLeadRepo, mockMakeCallUseCase, mockAnalysisRepo } = createMocks();

      const app = Fastify();
      app.setErrorHandler(errorHandler);
      const orchestrator = new AutoCallOrchestratorUseCase(
        mockLeadRepo,
        mockMakeCallUseCase as unknown as MakeCallUseCase,
        mockAnalysisRepo,
        null,
        app.log,
      );
      const controller = new OrchestratorController(orchestrator);
      app.register(orchestratorRoutes(controller));
      await app.ready();

      const res = await supertest(app.server).get("/api/orchestrator/status");

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.isSuccess).toBe(true);
      expect(res.body.data.state).toBe("idle");
      expect(res.body.data.processedCount).toBe(0);
      expect(res.body.data.totalLeads).toBe(0);
      expect(res.body.data.currentLead).toBeNull();

      await app.close();
    });
  });

  describe("POST /api/orchestrator/start", () => {
    it("should return success when started", async () => {
      const { mockLeadRepo, mockMakeCallUseCase, mockAnalysisRepo } = createMocks();
      const lead = new Lead(2, "会社", "名前", "+819012345678", "", "", 0);

      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead]));
      mockMakeCallUseCase.execute.mockResolvedValue(
        ok({ callSid: "CA123", to: "+819012345678", from: "+14155551234", status: "queued" }),
      );
      mockLeadRepo.updateLeadResult.mockResolvedValue(ok(undefined));

      const app = Fastify();
      app.setErrorHandler(errorHandler);
      const orchestrator = new AutoCallOrchestratorUseCase(
        mockLeadRepo,
        mockMakeCallUseCase as unknown as MakeCallUseCase,
        mockAnalysisRepo,
        null,
        app.log,
      );
      const controller = new OrchestratorController(orchestrator);
      app.register(orchestratorRoutes(controller));
      await app.ready();

      const res = await supertest(app.server).post("/api/orchestrator/start");

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.isSuccess).toBe(true);

      orchestrator.stop();
      await app.close();
    });
  });

  describe("POST /api/orchestrator/pause", () => {
    it("should pause a running orchestrator", async () => {
      const { mockLeadRepo, mockMakeCallUseCase, mockAnalysisRepo } = createMocks();
      const lead = new Lead(2, "会社", "名前", "+819012345678", "", "", 0);

      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead]));
      mockMakeCallUseCase.execute.mockResolvedValue(
        ok({ callSid: "CA123", to: "+819012345678", from: "+14155551234", status: "queued" }),
      );

      const app = Fastify();
      app.setErrorHandler(errorHandler);
      const orchestrator = new AutoCallOrchestratorUseCase(
        mockLeadRepo,
        mockMakeCallUseCase as unknown as MakeCallUseCase,
        mockAnalysisRepo,
        null,
        app.log,
      );
      const controller = new OrchestratorController(orchestrator);
      app.register(orchestratorRoutes(controller));
      await app.ready();

      await supertest(app.server).post("/api/orchestrator/start");

      const res = await supertest(app.server).post("/api/orchestrator/pause");

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.isSuccess).toBe(true);
      expect(res.body.data.state).toBe("paused");

      orchestrator.stop();
      await app.close();
    });

    it("should return error when not running", async () => {
      const { mockLeadRepo, mockMakeCallUseCase, mockAnalysisRepo } = createMocks();

      const app = Fastify();
      app.setErrorHandler(errorHandler);
      const orchestrator = new AutoCallOrchestratorUseCase(
        mockLeadRepo,
        mockMakeCallUseCase as unknown as MakeCallUseCase,
        mockAnalysisRepo,
        null,
        app.log,
      );
      const controller = new OrchestratorController(orchestrator);
      app.register(orchestratorRoutes(controller));
      await app.ready();

      const res = await supertest(app.server).post("/api/orchestrator/pause");

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.body.isSuccess).toBe(false);

      await app.close();
    });
  });

  describe("POST /api/orchestrator/stop", () => {
    it("should stop a running orchestrator", async () => {
      const { mockLeadRepo, mockMakeCallUseCase, mockAnalysisRepo } = createMocks();
      const lead = new Lead(2, "会社", "名前", "+819012345678", "", "", 0);

      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead]));
      mockMakeCallUseCase.execute.mockResolvedValue(
        ok({ callSid: "CA123", to: "+819012345678", from: "+14155551234", status: "queued" }),
      );

      const app = Fastify();
      app.setErrorHandler(errorHandler);
      const orchestrator = new AutoCallOrchestratorUseCase(
        mockLeadRepo,
        mockMakeCallUseCase as unknown as MakeCallUseCase,
        mockAnalysisRepo,
        null,
        app.log,
      );
      const controller = new OrchestratorController(orchestrator);
      app.register(orchestratorRoutes(controller));
      await app.ready();

      await supertest(app.server).post("/api/orchestrator/start");

      const res = await supertest(app.server).post("/api/orchestrator/stop");

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.isSuccess).toBe(true);
      expect(res.body.data.state).toBe("stopped");

      await app.close();
    });
  });

  describe("POST /api/orchestrator/resume", () => {
    it("should resume a paused orchestrator", async () => {
      const { mockLeadRepo, mockMakeCallUseCase, mockAnalysisRepo } = createMocks();
      const lead = new Lead(2, "会社", "名前", "+819012345678", "", "", 0);

      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead]));
      mockMakeCallUseCase.execute.mockResolvedValue(
        ok({ callSid: "CA123", to: "+819012345678", from: "+14155551234", status: "queued" }),
      );

      const app = Fastify();
      app.setErrorHandler(errorHandler);
      const orchestrator = new AutoCallOrchestratorUseCase(
        mockLeadRepo,
        mockMakeCallUseCase as unknown as MakeCallUseCase,
        mockAnalysisRepo,
        null,
        app.log,
      );
      const controller = new OrchestratorController(orchestrator);
      app.register(orchestratorRoutes(controller));
      await app.ready();

      await supertest(app.server).post("/api/orchestrator/start");
      await supertest(app.server).post("/api/orchestrator/pause");

      const res = await supertest(app.server).post("/api/orchestrator/resume");

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.isSuccess).toBe(true);
      expect(res.body.data.state).toBe("running");

      orchestrator.stop();
      await app.close();
    });
  });
});
