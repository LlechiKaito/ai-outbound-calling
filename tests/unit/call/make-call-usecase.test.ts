import { MakeCallUseCase } from "@/application/usecases/call/make-call-usecase";
import type { CallRepository } from "@/domain/repositories/call/call-repository";
import { Call } from "@/domain/entities/call/call";
import { CallSid } from "@/domain/value-objects/call/call-sid";
import { PhoneNumber } from "@/domain/value-objects/call/phone-number";
import { ok, fail } from "@/domain/commons/result";
import { DomainError } from "@/domain/errors/domain-error";
import { CALL_ERROR_MESSAGES } from "@/domain/errors/call-error-messages";

describe("MakeCallUseCase", () => {
  const mockCallRepository: jest.Mocked<CallRepository> = {
    initiateCall: jest.fn(),
  };

  const FROM_PHONE = "+14155551234";
  const WEBHOOK_BASE_URL = "https://example.ngrok-free.app";

  let useCase: MakeCallUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new MakeCallUseCase(
      mockCallRepository,
      FROM_PHONE,
      WEBHOOK_BASE_URL,
    );
  });

  it("should return call data when initiation succeeds", async () => {
    const call = new Call(
      new CallSid("CA1234567890"),
      PhoneNumber.create("+819012345678"),
      PhoneNumber.create(FROM_PHONE),
      "queued",
    );
    mockCallRepository.initiateCall.mockResolvedValue(ok(call));

    const result = await useCase.execute({ to: "+819012345678" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.callSid).toBe("CA1234567890");
      expect(result.data.to).toBe("+819012345678");
      expect(result.data.from).toBe(FROM_PHONE);
      expect(result.data.status).toBe("queued");
    }

    expect(mockCallRepository.initiateCall).toHaveBeenCalledWith(
      expect.objectContaining({ value: "+819012345678" }),
      expect.objectContaining({ value: FROM_PHONE }),
      `${WEBHOOK_BASE_URL}/api/twiml?to=%2B819012345678`,
    );
  });

  it("should return failure when repository fails", async () => {
    mockCallRepository.initiateCall.mockResolvedValue(
      fail(new Error(CALL_ERROR_MESSAGES.CALL_INITIATION_FAILED)),
    );

    const result = await useCase.execute({ to: "+819012345678" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe(
        CALL_ERROR_MESSAGES.CALL_INITIATION_FAILED,
      );
    }
  });

  it("should throw DomainError when phone number is invalid", async () => {
    await expect(useCase.execute({ to: "invalid" })).rejects.toThrow(
      DomainError,
    );
  });
});
