import type { FastifyReply, FastifyRequest } from "fastify";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse.js";
import type { MakeCallUseCase } from "@/application/usecases/call/make-call-usecase.js";
import type { MakeCallRequestDto } from "@/application/dto/call/make-call-dto.js";
import { HTTP_STATUS } from "@/constants/http.js";
import { TWIML_CONTENT_TYPE, MEDIA_STREAM_PATH } from "@/constants/twiml.js";
import { CALL_ERROR_MESSAGES } from "@/domain/errors/call-error-messages.js";

export class CallController {
  constructor(
    private readonly makeCallUseCase: MakeCallUseCase,
    private readonly publicUrl: string,
  ) {}

  async makeCall(
    request: FastifyRequest<{ Body: MakeCallRequestDto }>,
    reply: FastifyReply,
  ): Promise<void> {
    const result = await this.makeCallUseCase.execute(request.body);

    if (!result.success) {
      reply.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        isSuccess: false,
        message: result.error.message,
        code: CALL_ERROR_MESSAGES.CALL_INITIATION_FAILED_CODE,
      });
      return;
    }

    reply.status(HTTP_STATUS.CREATED).send({
      isSuccess: true,
      data: result.data,
    });
  }

  async twiml(
    request: FastifyRequest<{ Querystring: { to?: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    const response = new VoiceResponse();
    const connect = response.connect();
    const wsUrl =
      this.publicUrl.replace(/^http/, "ws") + MEDIA_STREAM_PATH;
    const stream = connect.stream({ url: wsUrl });

    const toNumber = request.query.to;
    if (toNumber) {
      stream.parameter({ name: "to", value: toNumber });
    }

    reply
      .status(HTTP_STATUS.OK)
      .header("Content-Type", TWIML_CONTENT_TYPE)
      .send(response.toString());
  }
}
