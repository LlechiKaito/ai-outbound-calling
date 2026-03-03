import type { FastifyInstance } from "fastify";

import type { AnalysisController } from "@/presentation/controllers/analysis/analysis-controller.js";
import type { AnalyzeCallRequestDto } from "@/application/dto/analysis/analyze-call-dto.js";

export function analysisRoutes(controller: AnalysisController) {
  return async (fastify: FastifyInstance): Promise<void> => {
    fastify.post<{ Body: AnalyzeCallRequestDto }>(
      "/api/analyze-call",
      (req, reply) => controller.analyzeCall(req, reply),
    );
  };
}
