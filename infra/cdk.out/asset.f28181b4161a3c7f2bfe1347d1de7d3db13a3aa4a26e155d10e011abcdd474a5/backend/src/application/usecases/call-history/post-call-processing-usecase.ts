import type { CallAnalysisRepository } from "@/domain/repositories/analysis/call-analysis-repository.js";
import type { CallHistoryRepository } from "@/domain/repositories/call-history/call-history-repository.js";
import { CallHistory } from "@/domain/entities/call-history/call-history.js";
import { CallResult } from "@/domain/value-objects/call-history/call-result.js";
import type { SendFollowUpEmailUseCase } from "@/application/usecases/follow-up-email/send-follow-up-email-usecase.js";
import type { PostCallProcessingDto } from "@/application/dto/call-history/post-call-processing-dto.js";

export class PostCallProcessingUseCase {
  constructor(
    private readonly callAnalysisRepository: CallAnalysisRepository,
    private readonly callHistoryRepository: CallHistoryRepository | null,
    private readonly sendFollowUpEmailUseCase: SendFollowUpEmailUseCase | null,
  ) {}

  async execute(dto: PostCallProcessingDto): Promise<void> {
    const analysisResult = await this.callAnalysisRepository.analyze(dto.transcript);

    if (!analysisResult.success) {
      throw new Error(analysisResult.error.message);
    }

    if (this.callHistoryRepository) {
      const callHistory = new CallHistory(
        dto.companyName,
        dto.contactName,
        dto.phoneNumber,
        dto.email,
        "",
        new Date(),
        CallResult.create("応答"),
        analysisResult.data.interestLevel,
        analysisResult.data.nextAction,
        analysisResult.data.summary,
        "0",
      );

      const saveResult = await this.callHistoryRepository.save(callHistory);

      if (!saveResult.success) {
        throw new Error(saveResult.error.message);
      }
    }

    if (this.sendFollowUpEmailUseCase && dto.email) {
      const emailResult = await this.sendFollowUpEmailUseCase.execute({
        to: dto.email,
        companyName: dto.companyName,
        contactName: dto.contactName,
        summary: analysisResult.data.summary,
        interestLevel: analysisResult.data.interestLevel.value,
      });

      if (!emailResult.success) {
        throw new Error(emailResult.error.message);
      }
    }
  }
}
