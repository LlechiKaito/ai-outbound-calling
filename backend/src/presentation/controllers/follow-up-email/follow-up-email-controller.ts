import type { FastifyReply, FastifyRequest } from "fastify";

import type { SendFollowUpEmailUseCase } from "@/application/usecases/follow-up-email/send-follow-up-email-usecase.js";
import type { SendFollowUpEmailDto } from "@/application/dto/follow-up-email/send-follow-up-email-dto.js";
import { HTTP_STATUS } from "@/constants/http.js";
import { FOLLOW_UP_EMAIL_ERROR_MESSAGES } from "@/domain/errors/follow-up-email-error-messages.js";

export class FollowUpEmailController {
  constructor(
    private readonly sendFollowUpEmailUseCase: SendFollowUpEmailUseCase,
  ) {}

  async sendFollowUpEmail(
    request: FastifyRequest<{ Body: SendFollowUpEmailDto }>,
    reply: FastifyReply,
  ): Promise<void> {
    const result = await this.sendFollowUpEmailUseCase.execute(request.body);

    if (!result.success) {
      reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        isSuccess: false,
        message: result.error.message,
        code: FOLLOW_UP_EMAIL_ERROR_MESSAGES.SEND_FAILED,
      });
      return;
    }

    reply.status(HTTP_STATUS.OK).send({
      isSuccess: true,
      data: null,
    });
  }
}
