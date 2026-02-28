import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { AnalysisController } from "@/presentation/controllers/analysis/analysis-controller";
import { AnalyzeCallUseCase } from "@/application/usecases/analysis/analyze-call-usecase";
import type { CallAnalysisRepository } from "@/domain/repositories/analysis/call-analysis-repository";
import { CallAnalysis } from "@/domain/entities/analysis/call-analysis";
import { InterestLevel } from "@/domain/value-objects/analysis/interest-level";
import { ok, fail } from "@/domain/commons/result";
import { analysisRoutes } from "@/presentation/routes/analysis/analysis-routes";
import { errorHandler } from "@/presentation/errors/error-handler";
import { HTTP_STATUS } from "@/constants/http";

describe("Analysis API", () => {
  let app: FastifyInstance;
  const mockRepository: jest.Mocked<CallAnalysisRepository> = {
    analyze: jest.fn(),
  };

  beforeAll(async () => {
    const useCase = new AnalyzeCallUseCase(mockRepository);
    const controller = new AnalysisController(useCase);

    app = Fastify();
    app.setErrorHandler(errorHandler);
    app.register(analysisRoutes(controller));
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/analyze-call", () => {
    it("should return 200 with analysis data when successful", async () => {
      const analysis = new CallAnalysis(
        InterestLevel.create(4),
        "顧客はサービスに前向き",
        "デモの日程を調整する",
      );
      mockRepository.analyze.mockResolvedValue(ok(analysis));

      const res = await supertest(app.server)
        .post("/api/analyze-call")
        .send({ transcript: "テストのトランスクリプト" });

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.isSuccess).toBe(true);
      expect(res.body.data.interestLevel).toBe(4);
      expect(res.body.data.summary).toBe("顧客はサービスに前向き");
      expect(res.body.data.nextAction).toBe("デモの日程を調整する");
      expect(mockRepository.analyze).toHaveBeenCalledWith(
        "テストのトランスクリプト",
      );
    });

    it("should return 500 when analysis fails", async () => {
      mockRepository.analyze.mockResolvedValue(
        fail(new Error("OpenAI API error")),
      );

      const res = await supertest(app.server)
        .post("/api/analyze-call")
        .send({ transcript: "テストのトランスクリプト" });

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.body.isSuccess).toBe(false);
      expect(res.body.message).toBe("OpenAI API error");
      expect(res.body.code).toBe("ANALYSIS_FAILED");
    });
  });
});
