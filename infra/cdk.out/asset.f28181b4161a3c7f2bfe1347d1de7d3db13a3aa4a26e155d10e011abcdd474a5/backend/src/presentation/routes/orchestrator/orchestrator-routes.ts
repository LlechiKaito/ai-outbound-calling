import type { FastifyInstance } from "fastify";

import type { OrchestratorController } from "@/presentation/controllers/orchestrator/orchestrator-controller.js";

export function orchestratorRoutes(controller: OrchestratorController) {
  return async (fastify: FastifyInstance): Promise<void> => {
    fastify.post(
      "/api/orchestrator/start",
      (req, reply) => controller.start(req, reply),
    );

    fastify.post(
      "/api/orchestrator/pause",
      (req, reply) => controller.pause(req, reply),
    );

    fastify.post(
      "/api/orchestrator/resume",
      (req, reply) => controller.resume(req, reply),
    );

    fastify.post(
      "/api/orchestrator/stop",
      (req, reply) => controller.stop(req, reply),
    );

    fastify.get(
      "/api/orchestrator/status",
      (req, reply) => controller.getStatus(req, reply),
    );
  };
}
