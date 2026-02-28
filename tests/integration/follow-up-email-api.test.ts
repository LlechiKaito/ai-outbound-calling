import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import supertest from "supertest";

import { FollowUpEmailController } from "@/presentation/controllers/follow-up-email/follow-up-email-controller";
import { SendFollowUpEmailUseCase } from "@/application/usecases/follow-up-email/send-follow-up-email-usecase";
import type { EmailRepository } from "@/domain/repositories/follow-up-email/email-repository";
import type { EmailContentRepository } from "@/domain/repositories/follow-up-email/email-content-repository";
import { ok, fail } from "@/domain/commons/result";
import { followUpEmailRoutes } from "@/presentation/routes/follow-up-email/follow-up-email-routes";
import { errorHandler } from "@/presentation/errors/error-handler";
import { HTTP_STATUS } from "@/constants/http";

describe("Follow-up Email API", () => {
  let app: FastifyInstance;
  const mockEmailContentRepo: jest.Mocked<EmailContentRepository> = {
    generate: jest.fn(),
  };
  const mockEmailRepo: jest.Mocked<EmailRepository> = {
    send: jest.fn(),
  };

  beforeAll(async () => {
    const useCase = new SendFollowUpEmailUseCase(mockEmailContentRepo, mockEmailRepo);
    const controller = new FollowUpEmailController(useCase);

    app = Fastify();
    app.setErrorHandler(errorHandler);
    app.register(followUpEmailRoutes(controller));
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validBody = {
    to: "tanaka@example.com",
    companyName: "株式会社ABC",
    contactName: "田中太郎",
    summary: "サービスに前向きな反応",
    interestLevel: 4,
  };

  describe("POST /api/follow-up-email", () => {
    it("should return 200 when email is sent successfully", async () => {
      mockEmailContentRepo.generate.mockResolvedValue(ok({
        subject: "本日のお電話ありがとうございました",
        body: "田中太郎様\n\nお時間をいただきありがとうございました。",
      }));
      mockEmailRepo.send.mockResolvedValue(ok(undefined));

      const res = await supertest(app.server)
        .post("/api/follow-up-email")
        .send(validBody);

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body.isSuccess).toBe(true);
      expect(mockEmailContentRepo.generate).toHaveBeenCalledTimes(1);
      expect(mockEmailRepo.send).toHaveBeenCalledTimes(1);
    });

    it("should return 500 when content generation fails", async () => {
      mockEmailContentRepo.generate.mockResolvedValue(
        fail(new Error("OpenAI API error")),
      );

      const res = await supertest(app.server)
        .post("/api/follow-up-email")
        .send(validBody);

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.body.isSuccess).toBe(false);
      expect(mockEmailRepo.send).not.toHaveBeenCalled();
    });

    it("should return 500 when email sending fails", async () => {
      mockEmailContentRepo.generate.mockResolvedValue(ok({
        subject: "件名",
        body: "本文",
      }));
      mockEmailRepo.send.mockResolvedValue(
        fail(new Error("SMTP error")),
      );

      const res = await supertest(app.server)
        .post("/api/follow-up-email")
        .send(validBody);

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.body.isSuccess).toBe(false);
    });

    it("should return 500 when interest level is invalid", async () => {
      const res = await supertest(app.server)
        .post("/api/follow-up-email")
        .send({ ...validBody, interestLevel: 0 });

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.body.isSuccess).toBe(false);
    });
  });
});
