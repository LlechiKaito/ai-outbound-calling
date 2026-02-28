import type { Result } from "@/domain/commons/result.js";
import { ok, fail } from "@/domain/commons/result.js";
import type { CallAnalysisRepository } from "@/domain/repositories/analysis/call-analysis-repository.js";
import type {
  AnalyzeCallRequestDto,
  AnalyzeCallResponseDto,
} from "@/application/dto/analysis/analyze-call-dto.js";

export class AnalyzeCallUseCase {
  constructor(
    private readonly callAnalysisRepository: CallAnalysisRepository,
  ) {}

  async execute(
    dto: AnalyzeCallRequestDto,
  ): Promise<Result<AnalyzeCallResponseDto, Error>> {
    const result = await this.callAnalysisRepository.analyze(dto.transcript);

    if (!result.success) {
      return fail(result.error);
    }

    return ok({
      interestLevel: result.data.interestLevel.value,
      summary: result.data.summary,
      nextAction: result.data.nextAction,
    });
  }
}
