import { PostCallProcessingUseCase } from "@/application/usecases/call-history/post-call-processing-usecase";
import type { CallAnalysisRepository } from "@/domain/repositories/analysis/call-analysis-repository";
import type { CallHistoryRepository } from "@/domain/repositories/call-history/call-history-repository";
import type { SendFollowUpEmailUseCase } from "@/application/usecases/follow-up-email/send-follow-up-email-usecase";
import { CallAnalysis } from "@/domain/entities/analysis/call-analysis";
import { InterestLevel } from "@/domain/value-objects/analysis/interest-level";
import { ok, fail } from "@/domain/commons/result";

describe("PostCallProcessingUseCase", () => {
  let mockAnalysisRepo: jest.Mocked<CallAnalysisRepository>;
  let mockHistoryRepo: jest.Mocked<CallHistoryRepository>;
  let mockEmailUseCase: jest.Mocked<Pick<SendFollowUpEmailUseCase, "execute">>;

  const transcript = "営業: こんにちは\n顧客: はい";
  const phoneNumber = "+819012345678";
  const companyName = "テスト株式会社";
  const contactName = "山田太郎";
  const email = "yamada@example.com";

  beforeEach(() => {
    mockAnalysisRepo = { analyze: jest.fn() };
    mockHistoryRepo = { save: jest.fn() };
    mockEmailUseCase = { execute: jest.fn() };
  });

  it("should analyze transcript and save to sheets", async () => {
    const analysis = new CallAnalysis(
      InterestLevel.create(4),
      "前向きな反応",
      "デモを調整する",
    );
    mockAnalysisRepo.analyze.mockResolvedValue(ok(analysis));
    mockHistoryRepo.save.mockResolvedValue(ok(undefined));

    const useCase = new PostCallProcessingUseCase(mockAnalysisRepo, mockHistoryRepo, null);
    await useCase.execute({ transcript, phoneNumber, companyName, contactName, email: "" });

    expect(mockAnalysisRepo.analyze).toHaveBeenCalledWith(transcript);
    expect(mockHistoryRepo.save).toHaveBeenCalledTimes(1);

    const savedHistory = mockHistoryRepo.save.mock.calls[0][0];
    expect(savedHistory.companyName).toBe(companyName);
    expect(savedHistory.contactName).toBe(contactName);
    expect(savedHistory.phoneNumber).toBe(phoneNumber);
    expect(savedHistory.email).toBe("");
    expect(savedHistory.status).toBe("");
    expect(savedHistory.callResult.value).toBe("応答");
    expect(savedHistory.interestLevel.value).toBe(4);
    expect(savedHistory.nextAction).toBe("デモを調整する");
    expect(savedHistory.memo).toBe("前向きな反応");
    expect(savedHistory.retryCount).toBe("0");
  });

  it("should throw when analysis fails", async () => {
    mockAnalysisRepo.analyze.mockResolvedValue(
      fail(new Error("OpenAI error")),
    );

    const useCase = new PostCallProcessingUseCase(mockAnalysisRepo, mockHistoryRepo, null);

    await expect(
      useCase.execute({ transcript, phoneNumber, companyName, contactName, email: "" }),
    ).rejects.toThrow("OpenAI error");

    expect(mockHistoryRepo.save).not.toHaveBeenCalled();
  });

  it("should skip sheets save when repository is null", async () => {
    const analysis = new CallAnalysis(
      InterestLevel.create(3),
      "中立的な反応",
      "資料を送付する",
    );
    mockAnalysisRepo.analyze.mockResolvedValue(ok(analysis));

    const useCase = new PostCallProcessingUseCase(mockAnalysisRepo, null, null);
    await useCase.execute({ transcript, phoneNumber, companyName, contactName, email: "" });

    expect(mockAnalysisRepo.analyze).toHaveBeenCalledWith(transcript);
    expect(mockHistoryRepo.save).not.toHaveBeenCalled();
  });

  it("should throw when sheets save fails", async () => {
    const analysis = new CallAnalysis(
      InterestLevel.create(2),
      "消極的",
      "再連絡不要",
    );
    mockAnalysisRepo.analyze.mockResolvedValue(ok(analysis));
    mockHistoryRepo.save.mockResolvedValue(
      fail(new Error("Sheets API error")),
    );

    const useCase = new PostCallProcessingUseCase(mockAnalysisRepo, mockHistoryRepo, null);

    await expect(
      useCase.execute({ transcript, phoneNumber, companyName, contactName, email: "" }),
    ).rejects.toThrow("Sheets API error");
  });

  it("should send follow-up email when email is provided and use case is configured", async () => {
    const analysis = new CallAnalysis(
      InterestLevel.create(4),
      "前向きな反応",
      "デモを調整する",
    );
    mockAnalysisRepo.analyze.mockResolvedValue(ok(analysis));
    mockHistoryRepo.save.mockResolvedValue(ok(undefined));
    mockEmailUseCase.execute.mockResolvedValue(ok(undefined));

    const useCase = new PostCallProcessingUseCase(
      mockAnalysisRepo,
      mockHistoryRepo,
      mockEmailUseCase as unknown as SendFollowUpEmailUseCase,
    );
    await useCase.execute({ transcript, phoneNumber, companyName, contactName, email });

    expect(mockEmailUseCase.execute).toHaveBeenCalledWith({
      to: email,
      companyName,
      contactName,
      summary: "前向きな反応",
      interestLevel: 4,
    });
  });

  it("should skip email when email is empty", async () => {
    const analysis = new CallAnalysis(
      InterestLevel.create(3),
      "中立的な反応",
      "資料を送付する",
    );
    mockAnalysisRepo.analyze.mockResolvedValue(ok(analysis));
    mockHistoryRepo.save.mockResolvedValue(ok(undefined));

    const useCase = new PostCallProcessingUseCase(
      mockAnalysisRepo,
      mockHistoryRepo,
      mockEmailUseCase as unknown as SendFollowUpEmailUseCase,
    );
    await useCase.execute({ transcript, phoneNumber, companyName, contactName, email: "" });

    expect(mockEmailUseCase.execute).not.toHaveBeenCalled();
  });

  it("should skip email when use case is null", async () => {
    const analysis = new CallAnalysis(
      InterestLevel.create(4),
      "前向きな反応",
      "デモを調整する",
    );
    mockAnalysisRepo.analyze.mockResolvedValue(ok(analysis));
    mockHistoryRepo.save.mockResolvedValue(ok(undefined));

    const useCase = new PostCallProcessingUseCase(mockAnalysisRepo, mockHistoryRepo, null);
    await useCase.execute({ transcript, phoneNumber, companyName, contactName, email });

    expect(mockEmailUseCase.execute).not.toHaveBeenCalled();
  });

  it("should throw when email sending fails", async () => {
    const analysis = new CallAnalysis(
      InterestLevel.create(5),
      "非常に興味あり",
      "契約書を送付",
    );
    mockAnalysisRepo.analyze.mockResolvedValue(ok(analysis));
    mockHistoryRepo.save.mockResolvedValue(ok(undefined));
    mockEmailUseCase.execute.mockResolvedValue(
      fail(new Error("SMTP error")),
    );

    const useCase = new PostCallProcessingUseCase(
      mockAnalysisRepo,
      mockHistoryRepo,
      mockEmailUseCase as unknown as SendFollowUpEmailUseCase,
    );

    await expect(
      useCase.execute({ transcript, phoneNumber, companyName, contactName, email }),
    ).rejects.toThrow("SMTP error");
  });
});
