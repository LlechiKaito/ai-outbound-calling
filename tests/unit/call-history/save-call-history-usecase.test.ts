import { SaveCallHistoryUseCase } from "@/application/usecases/call-history/save-call-history-usecase";
import type { CallHistoryRepository } from "@/domain/repositories/call-history/call-history-repository";
import { ok, fail } from "@/domain/commons/result";

describe("SaveCallHistoryUseCase", () => {
  let useCase: SaveCallHistoryUseCase;
  let mockRepository: jest.Mocked<CallHistoryRepository>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
    };
    useCase = new SaveCallHistoryUseCase(mockRepository);
  });

  const validDto = {
    companyName: "株式会社ABC",
    contactName: "田中太郎",
    phoneNumber: "+819012345678",
    email: "tanaka@example.com",
    status: "新規",
    callResult: "応答",
    interestLevel: 4,
    nextAction: "デモの日程を調整する",
    memo: "サービスに前向き",
    retryCount: "0",
  };

  it("should save call history when repository succeeds", async () => {
    mockRepository.save.mockResolvedValue(ok(undefined));

    const result = await useCase.execute(validDto);

    expect(result.success).toBe(true);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);

    const savedHistory = mockRepository.save.mock.calls[0][0];
    expect(savedHistory.companyName).toBe("株式会社ABC");
    expect(savedHistory.contactName).toBe("田中太郎");
    expect(savedHistory.phoneNumber).toBe("+819012345678");
    expect(savedHistory.email).toBe("tanaka@example.com");
    expect(savedHistory.status).toBe("新規");
    expect(savedHistory.callResult.value).toBe("応答");
    expect(savedHistory.interestLevel.value).toBe(4);
    expect(savedHistory.nextAction).toBe("デモの日程を調整する");
    expect(savedHistory.memo).toBe("サービスに前向き");
    expect(savedHistory.retryCount).toBe("0");
  });

  it("should return failure when repository fails", async () => {
    mockRepository.save.mockResolvedValue(
      fail(new Error("Sheets API error")),
    );

    const result = await useCase.execute(validDto);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Sheets API error");
    }
  });

  it("should throw when interest level is invalid", async () => {
    const invalidDto = { ...validDto, interestLevel: 6 };

    await expect(useCase.execute(invalidDto)).rejects.toThrow(
      "Interest level must be an integer between 1 and 5",
    );
  });

  it("should throw when call result is invalid", async () => {
    const invalidDto = { ...validDto, callResult: "成功" };

    await expect(useCase.execute(invalidDto)).rejects.toThrow(
      "Call result must be one of: 応答, 不在, 拒否, 留守電, その他",
    );
  });
});
