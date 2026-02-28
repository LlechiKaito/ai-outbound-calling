import type { FastifyReply, FastifyRequest } from "fastify";
import { validateRequest } from "twilio";
import { config } from "@/config/index.js";
import { HTTP_STATUS } from "@/constants/http.js";
import { ERROR_DEFINITIONS } from "@/constants/error-messages.js";

export async function twilioSignatureMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const signature = request.headers["x-twilio-signature"] as string | undefined;

  if (!signature) {
    reply.status(HTTP_STATUS.FORBIDDEN).send({
      isSuccess: false,
      message: ERROR_DEFINITIONS.TWILIO_SIGNATURE_MISSING.message,
      code: ERROR_DEFINITIONS.TWILIO_SIGNATURE_MISSING.code,
    });
    return;
  }

  const url = `${request.protocol}://${request.hostname}${request.url}`;
  const params = (request.body as Record<string, string>) ?? {};

  const isValid = validateRequest(
    config.twilio.authToken,
    signature,
    url,
    params,
  );

  if (!isValid) {
    reply.status(HTTP_STATUS.FORBIDDEN).send({
      isSuccess: false,
      message: ERROR_DEFINITIONS.TWILIO_SIGNATURE_INVALID.message,
      code: ERROR_DEFINITIONS.TWILIO_SIGNATURE_INVALID.code,
    });
    return;
  }
}
