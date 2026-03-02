import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ApplicationError } from "@/application/errors/application-error.js";
import { HTTP_STATUS } from "@/constants/http.js";
import { ERROR_DEFINITIONS } from "@/constants/error-messages.js";

export interface ErrorResponse {
  isSuccess: false;
  message: string;
  code: string;
}

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  request.log.error(error, "Unhandled error");

  if (error instanceof ApplicationError) {
    reply.status(error.statusCode).send({
      isSuccess: false,
      message: error.message,
      code: error.code,
    } satisfies ErrorResponse);
    return;
  }

  reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
    isSuccess: false,
    message: ERROR_DEFINITIONS.INTERNAL_ERROR.message,
    code: ERROR_DEFINITIONS.INTERNAL_ERROR.code,
  } satisfies ErrorResponse);
}
