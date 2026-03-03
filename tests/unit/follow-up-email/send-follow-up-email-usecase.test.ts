import { SendFollowUpEmailUseCase } from "@/application/usecases/follow-up-email/send-follow-up-email-usecase";
import type { EmailRepository } from "@/domain/repositories/follow-up-email/email-repository";
import type { EmailContentRepository } from "@/domain/repositories/follow-up-email/email-content-repository";
import { ok, fail } from "@/domain/commons/result";

describe("SendFollowUpEmailUseCase", () => {
  let mockEmailContentRepo: jest.Mocked<EmailContentRepository>;
  let mockEmailRepo: jest.Mocked<EmailRepository>;

  const dto = {
    to: "tanaka@example.com",
    companyName: "株式会社ABC",
    contactName: "田中太郎",
    summary: "サービスに前向きな反応。デモを希望。",
    interestLevel: 4,
  };

  beforeEach(() => {
    mockEmailContentRepo = { generate: jest.fn() };
    mockEmailRepo = { send: jest.fn() };
  });

  it("should generate content and send email", async () => {
    mockEmailContentRepo.generate.mockResolvedValue(ok({
      subject: "本日のお電話ありがとうございました",
      body: "田中太郎様\n\n本日はお時間をいただきありがとうございました。",
    }));
    mockEmailRepo.send.mockResolvedValue(ok(undefined));

    const useCase = new SendFollowUpEmailUseCase(mockEmailContentRepo, mockEmailRepo);
    const result = await useCase.execute(dto);

    expect(result.success).toBe(true);
    expect(mockEmailContentRepo.generate).toHaveBeenCalledWith({
      companyName: dto.companyName,
      contactName: dto.contactName,
      summary: dto.summary,
      interestLevel: dto.interestLevel,
    });
    expect(mockEmailRepo.send).toHaveBeenCalledTimes(1);

    const sentEmail = mockEmailRepo.send.mock.calls[0][0];
    expect(sentEmail.to).toBe("tanaka@example.com");
    expect(sentEmail.companyName).toBe("株式会社ABC");
    expect(sentEmail.contactName).toBe("田中太郎");
    expect(sentEmail.subject).toBe("本日のお電話ありがとうございました");
    expect(sentEmail.interestLevel.value).toBe(4);
  });

  it("should return failure when content generation fails", async () => {
    mockEmailContentRepo.generate.mockResolvedValue(
      fail(new Error("OpenAI error")),
    );

    const useCase = new SendFollowUpEmailUseCase(mockEmailContentRepo, mockEmailRepo);
    const result = await useCase.execute(dto);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("OpenAI error");
    }
    expect(mockEmailRepo.send).not.toHaveBeenCalled();
  });

  it("should return failure when email sending fails", async () => {
    mockEmailContentRepo.generate.mockResolvedValue(ok({
      subject: "件名",
      body: "本文",
    }));
    mockEmailRepo.send.mockResolvedValue(
      fail(new Error("SMTP connection failed")),
    );

    const useCase = new SendFollowUpEmailUseCase(mockEmailContentRepo, mockEmailRepo);
    const result = await useCase.execute(dto);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("SMTP connection failed");
    }
  });

  it("should throw when interest level is invalid", async () => {
    mockEmailContentRepo.generate.mockResolvedValue(ok({
      subject: "件名",
      body: "本文",
    }));

    const useCase = new SendFollowUpEmailUseCase(mockEmailContentRepo, mockEmailRepo);
    const invalidDto = { ...dto, interestLevel: 6 };

    await expect(useCase.execute(invalidDto)).rejects.toThrow(
      "Interest level must be an integer between 1 and 5",
    );
  });
});
