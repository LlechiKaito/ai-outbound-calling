import type { Result } from "@/domain/commons/result.js";
import { ok, fail } from "@/domain/commons/result.js";
import type { CallHistoryRepository } from "@/domain/repositories/call-history/call-history-repository.js";
import { CallHistory } from "@/domain/entities/call-history/call-history.js";
import { InterestLevel } from "@/domain/value-objects/analysis/interest-level.js";
import { CallResult } from "@/domain/value-objects/call-history/call-result.js";
import type { SaveCallHistoryRequestDto } from "@/application/dto/call-history/save-call-history-dto.js";

export class SaveCallHistoryUseCase {
  constructor(
    private readonly callHistoryRepository: CallHistoryRepository,
  ) {}

  async execute(dto: SaveCallHistoryRequestDto): Promise<Result<void, Error>> {
    const callHistory = new CallHistory(
      dto.companyName,
      dto.contactName,
      dto.phoneNumber,
      dto.email,
      dto.status,
      new Date(),
      CallResult.create(dto.callResult),
      InterestLevel.create(dto.interestLevel),
      dto.nextAction,
      dto.memo,
      dto.retryCount,
    );

    const result = await this.callHistoryRepository.save(callHistory);

    if (!result.success) {
      return fail(result.error);
    }

    return ok(undefined);
  }
}
