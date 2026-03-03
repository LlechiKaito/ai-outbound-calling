import Fastify from "fastify";
import fastifyWebSocket from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import supertest from "supertest";
import { CallController } from "@/presentation/controllers/call/call-controller";
import { MakeCallUseCase } from "@/application/usecases/call/make-call-usecase";
import { MediaStreamHandler } from "@/presentation/handlers/media-stream/media-stream-handler";
import type { ConversationRepository } from "@/domain/repositories/conversation/conversation-repository";
import type { CallRepository } from "@/domain/repositories/call/call-repository";
import { Call } from "@/domain/entities/call/call";
import { CallSid } from "@/domain/value-objects/call/call-sid";
import { PhoneNumber } from "@/domain/value-objects/call/phone-number";
import { ok } from "@/domain/commons/result";
import { callRoutes } from "@/presentation/routes/call/call-routes";
import { errorHandler } from "@/presentation/errors/error-handler";
import { HTTP_STATUS } from "@/constants/http";
import { MEDIA_STREAM_PATH } from "@/constants/twiml";

const PUBLIC_URL = "https://example.ngrok-free.app";

describe("Call API", () => {
  let app: FastifyInstance;
  const mockCallRepository: jest.Mocked<CallRepository> = {
    initiateCall: jest.fn(),
  };
  const mockConversationRepository: jest.Mocked<ConversationRepository> = {
    getSignedUrl: jest.fn(),
  };

  beforeAll(async () => {
    const useCase = new MakeCallUseCase(
      mockCallRepository,
      "+14155551234",
      PUBLIC_URL,
    );
    const controller = new CallController(useCase, PUBLIC_URL);
    const mediaStreamHandler = new MediaStreamHandler(mockConversationRepository, {
      language: "ja",
    });

    app = Fastify();
    app.register(fastifyWebSocket);
    app.setErrorHandler(errorHandler);
    app.register(callRoutes(controller, mediaStreamHandler));
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/make-call", () => {
    it("should return 201 with call data when successful", async () => {
      const call = new Call(
        new CallSid("CA1234567890"),
        PhoneNumber.create("+819012345678"),
        PhoneNumber.create("+14155551234"),
        "queued",
      );
      mockCallRepository.initiateCall.mockResolvedValue(ok(call));

      const res = await supertest(app.server)
        .post("/api/make-call")
        .send({ to: "+819012345678" });

      expect(res.status).toBe(HTTP_STATUS.CREATED);
      expect(res.body.isSuccess).toBe(true);
      expect(res.body.data.callSid).toBe("CA1234567890");
      expect(res.body.data.to).toBe("+819012345678");
    });

    it("should return 500 when phone number is invalid", async () => {
      const res = await supertest(app.server)
        .post("/api/make-call")
        .send({ to: "invalid" });

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(res.body.isSuccess).toBe(false);
    });
  });

  describe("POST /api/twiml", () => {
    it("should return TwiML with Connect and Stream", async () => {
      const res = await supertest(app.server).post("/api/twiml");
      const expectedWsUrl =
        PUBLIC_URL.replace(/^http/, "ws") + MEDIA_STREAM_PATH;

      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.headers["content-type"]).toContain("application/xml");
      expect(res.text).toContain("<?xml");
      expect(res.text).toContain("<Response>");
      expect(res.text).toContain("<Connect>");
      expect(res.text).toContain("<Stream");
      expect(res.text).toContain(expectedWsUrl);
    });
  });
});
