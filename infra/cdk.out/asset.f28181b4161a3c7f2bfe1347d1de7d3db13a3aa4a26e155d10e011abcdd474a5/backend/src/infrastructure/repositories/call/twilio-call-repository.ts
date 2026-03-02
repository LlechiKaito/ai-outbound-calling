import type { Twilio } from "twilio";
import type { Result } from "@/domain/commons/result.js";
import { ok, fail } from "@/domain/commons/result.js";
import type { Call } from "@/domain/entities/call/call.js";
import type { CallRepository } from "@/domain/repositories/call/call-repository.js";
import type { PhoneNumber } from "@/domain/value-objects/call/phone-number.js";
import { CALL_ERROR_MESSAGES } from "@/domain/errors/call-error-messages.js";
import { CallMapper } from "@/infrastructure/mappers/call/call-mapper.js";

export class TwilioCallRepository implements CallRepository {
  constructor(private readonly client: Twilio) {}

  async initiateCall(
    to: PhoneNumber,
    from: PhoneNumber,
    webhookUrl: string,
  ): Promise<Result<Call, Error>> {
    const callInstance = await this.client.calls.create({
      to: to.value,
      from: from.value,
      url: webhookUrl,
    });

    if (!callInstance.sid) {
      return fail(new Error(CALL_ERROR_MESSAGES.CALL_INITIATION_FAILED));
    }

    return ok(CallMapper.toDomain(callInstance));
  }
}
