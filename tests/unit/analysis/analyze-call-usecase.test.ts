import { AnalyzeCallUseCase } from "@/application/usecases/analysis/analyze-call-usecase";
import type { CallAnalysisRepository } from "@/domain/repositories/analysis/call-analysis-repository";
import { CallAnalysis } from "@/domain/entities/analysis/call-analysis";
import { InterestLevel } from "@/domain/value-objects/analysis/interest-level";
import { ok, fail } from "@/domain/commons/result";

describe("AnalyzeCallUseCase", () => {
  let useCase: AnalyzeCallUseCase;
  let mockRepository: jest.Mocked<CallAnalysisRepository>;

  beforeEach(() => {
    mockRepository = {
      analyze: jest.fn(),
    };
    useCase = new AnalyzeCallUseCase(mockRepository);
  });

  it("should return analysis result when repository succeeds", async () => {
    const analysis = new CallAnalysis(
      InterestLevel.create(4),
      "顧客はサービスに前向き",
      "デモの日程を調整する",
    );
    mockRepository.analyze.mockResolvedValue(ok(analysis));

    const result = await useCase.execute({
      transcript: "テストのトランスクリプト",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interestLevel).toBe(4);
      expect(result.data.summary).toBe("顧客はサービスに前向き");
      expect(result.data.nextAction).toBe("デモの日程を調整する");
    }
    expect(mockRepository.analyze).toHaveBeenCalledWith(
      "テストのトランスクリプト",
    );
  });

  it("should return failure when repository fails", async () => {
    mockRepository.analyze.mockResolvedValue(
      fail(new Error("Analysis failed")),
    );

    const result = await useCase.execute({
      transcript: "テストのトランスクリプト",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Analysis failed");
    }
  });
});
