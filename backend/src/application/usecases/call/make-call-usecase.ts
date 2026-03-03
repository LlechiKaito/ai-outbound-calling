import type { Result } from "@/domain/commons/result.js";
import { ok, fail } from "@/domain/commons/result.js";
import type { CallRepository } from "@/domain/repositories/call/call-repository.js";
import { PhoneNumber } from "@/domain/value-objects/call/phone-number.js";
import type { MakeCallRequestDto, MakeCallResponseDto } from "@/application/dto/call/make-call-dto.js";

export class MakeCallUseCase {
  constructor(
    private readonly callRepository: CallRepository,
    private readonly fromPhoneNumber: string,
    private readonly webhookBaseUrl: string,
  ) {}

  async execute(dto: MakeCallRequestDto): Promise<Result<MakeCallResponseDto, Error>> {
    const to = PhoneNumber.create(dto.to);
    const from = PhoneNumber.create(this.fromPhoneNumber);
    const webhookUrl = `${this.webhookBaseUrl}/api/twiml?to=${encodeURIComponent(to.value)}`;

    const result = await this.callRepository.initiateCall(to, from, webhookUrl);

    if (!result.success) {
      return fail(result.error);
    }

    return ok({
      callSid: result.data.sid.value,
      to: result.data.to.value,
      from: result.data.from.value,
      status: result.data.status,
    });
  }
}
