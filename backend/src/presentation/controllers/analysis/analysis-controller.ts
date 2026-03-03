import type { FastifyReply, FastifyRequest } from "fastify";

import type { AnalyzeCallUseCase } from "@/application/usecases/analysis/analyze-call-usecase.js";
import type { AnalyzeCallRequestDto } from "@/application/dto/analysis/analyze-call-dto.js";
import { HTTP_STATUS } from "@/constants/http.js";
import { ANALYSIS_ERROR_MESSAGES } from "@/domain/errors/analysis-error-messages.js";

export class AnalysisController {
  constructor(private readonly analyzeCallUseCase: AnalyzeCallUseCase) {}

  async analyzeCall(
    request: FastifyRequest<{ Body: AnalyzeCallRequestDto }>,
    reply: FastifyReply,
  ): Promise<void> {
    const result = await this.analyzeCallUseCase.execute(request.body);

    if (!result.success) {
      reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        isSuccess: false,
        message: result.error.message,
        code: ANALYSIS_ERROR_MESSAGES.ANALYSIS_FAILED_CODE,
      });
      return;
    }

    reply.status(HTTP_STATUS.OK).send({
      isSuccess: true,
      data: result.data,
    });
  }
}
