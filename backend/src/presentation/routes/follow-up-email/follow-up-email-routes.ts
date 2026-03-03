import type { FastifyInstance } from "fastify";

import type { FollowUpEmailController } from "@/presentation/controllers/follow-up-email/follow-up-email-controller.js";
import type { SendFollowUpEmailDto } from "@/application/dto/follow-up-email/send-follow-up-email-dto.js";

export function followUpEmailRoutes(controller: FollowUpEmailController) {
  return async (fastify: FastifyInstance): Promise<void> => {
    fastify.post<{ Body: SendFollowUpEmailDto }>(
      "/api/follow-up-email",
      (req, reply) => controller.sendFollowUpEmail(req, reply),
    );
  };
}
