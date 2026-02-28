import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { CallHistoryController } from "@/presentation/controllers/call-history/call-history-controller";
import { SaveCallHistoryUseCase } from "@/application/usecases/call-history/save-call-history-usecase";
import type { CallHistoryRepository } from "@/domain/repositories/call-history/call-history-repository";
import { ok, fail } from "@/domain/commons/result";
import { callHistoryRoutes } from "@/presentation/routes/call-history/call-history-routes";
import { errorHandler } from "@/presentation/errors/error-handler";
import { HTTP_STATUS } from "@/constants/http";

describe("Call History API", () => {
  let app: FastifyInstance;
  const mockRepository: jest.Mocked<CallHistoryRepository> = {
    save: jest.fn(),
  };

  beforeAll(async () => {
    const useCase = new SaveCallHistoryUseCase(mockRepository);
    const controller = new CallHistoryController(useCase);

    app = Fastify();
    app.setErrorHandler(errorHandler);
    app.register(callHistoryRoutes(controller));
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validBody = {
    companyName: "株式会社ABC",
    contactName: "田中太郎",
    phoneNumber: "+819012345678",
    email: "tanaka@example.com",
    status: "新規",
    callResult: "応答",
    interestLevel: 4,
    nextAction: "デモの日程を調整する",
    memo: "サービスに前向き",
    retryCount: "0",
  };

  describe("POST /api/call-history", () => {
    it("should return 201 when save succeeds", async () => {
      mockRepository.save.mockResolvedValue(ok(undefined));

      const res = await supertest(app.server)
        .post("/api/call-history")
        .send(validBody);

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.isSuccess).toBe(true);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it("should return 500 when repository fails", async () => {
      mockRepository.save.mockResolvedValue(
        fail(new Error("Sheets API error")),
      );

      const res = await supertest(app.server)
        .post("/api/call-history")
        .send(validBody);

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.body.isSuccess).toBe(false);
      expect(res.body.message).toBe("Sheets API error");
    });

    it("should return 500 when interest level is invalid", async () => {
      const res = await supertest(app.server)
        .post("/api/call-history")
        .send({ ...validBody, interestLevel: 6 });

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.body.isSuccess).toBe(false);
    });
  });
});
