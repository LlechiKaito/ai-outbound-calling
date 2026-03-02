import type { FastifyInstance } from "fastify";

import type { CallHistoryController } from "@/presentation/controllers/call-history/call-history-controller.js";
import type { SaveCallHistoryRequestDto } from "@/application/dto/call-history/save-call-history-dto.js";

export function callHistoryRoutes(controller: CallHistoryController) {
  return async (fastify: FastifyInstance): Promise<void> => {
    fastify.post<{ Body: SaveCallHistoryRequestDto }>(
      "/api/call-history",
      (req, reply) => controller.saveCallHistory(req, reply),
    );
  };
}
