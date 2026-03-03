import type { FastifyInstance } from "fastify";
import type { CallController } from "@/presentation/controllers/call/call-controller.js";
import type { MediaStreamHandler } from "@/presentation/handlers/media-stream/media-stream-handler.js";
import type { MakeCallRequestDto } from "@/application/dto/call/make-call-dto.js";

export function callRoutes(
  controller: CallController,
  mediaStreamHandler: MediaStreamHandler | null,
) {
  return async (fastify: FastifyInstance): Promise<void> => {
    fastify.post<{ Body: MakeCallRequestDto }>(
      "/api/make-call",
      (req, reply) => controller.makeCall(req, reply),
    );
    fastify.post<{ Querystring: { to?: string } }>(
      "/api/twiml",
      (req, reply) => controller.twiml(req, reply),
    );
    if (mediaStreamHandler) {
      fastify.get(
        "/api/media-stream",
        { websocket: true },
        (socket, req) => {
          mediaStreamHandler.handle(socket, req.log);
        },
      );
    }
  };
}
