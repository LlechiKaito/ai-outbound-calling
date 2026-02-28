import type { FastifyReply, FastifyRequest } from "fastify";

import type { SaveCallHistoryUseCase } from "@/application/usecases/call-history/save-call-history-usecase.js";
import type { SaveCallHistoryRequestDto } from "@/application/dto/call-history/save-call-history-dto.js";
import { HTTP_STATUS } from "@/constants/http.js";
import { CALL_HISTORY_ERROR_MESSAGES } from "@/domain/errors/call-history-error-messages.js";

export class CallHistoryController {
  constructor(
    private readonly saveCallHistoryUseCase: SaveCallHistoryUseCase,
  ) {}

  async saveCallHistory(
    request: FastifyRequest<{ Body: SaveCallHistoryRequestDto }>,
    reply: FastifyReply,
  ): Promise<void> {
    const result = await this.saveCallHistoryUseCase.execute(request.body);

    if (!result.success) {
      reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        isSuccess: false,
        message: result.error.message,
        code: CALL_HISTORY_ERROR_MESSAGES.SAVE_CALL_HISTORY_FAILED,
      });
      return;
    }

    reply.status(HTTP_STATUS.CREATED).send({
      isSuccess: true,
      data: null,
    });
  }
}
