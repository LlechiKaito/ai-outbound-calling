import { PhoneNumber } from "@/domain/value-objects/call/phone-number";
import { DomainError } from "@/domain/errors/domain-error";
import { CALL_ERROR_MESSAGES } from "@/domain/errors/call-error-messages";

describe("PhoneNumber", () => {
  it("should create a valid E.164 phone number", () => {
    const phone = PhoneNumber.create("+819012345678");
    expect(phone.value).toBe("+819012345678");
  });

  it("should create a valid US phone number", () => {
    const phone = PhoneNumber.create("+14155551234");
    expect(phone.value).toBe("+14155551234");
  });

  it("should throw DomainError when number has no plus prefix", () => {
    expect(() => PhoneNumber.create("819012345678")).toThrow(DomainError);
    expect(() => PhoneNumber.create("819012345678")).toThrow(
      CALL_ERROR_MESSAGES.INVALID_PHONE_NUMBER,
    );
  });

  it("should throw DomainError when number is empty", () => {
    expect(() => PhoneNumber.create("")).toThrow(DomainError);
  });

  it("should throw DomainError when number starts with +0", () => {
    expect(() => PhoneNumber.create("+0123456789")).toThrow(DomainError);
  });

  it("should throw DomainError when number contains non-digits", () => {
    expect(() => PhoneNumber.create("+81-90-1234-5678")).toThrow(DomainError);
  });

  it("should throw DomainError when number is too long", () => {
    expect(() => PhoneNumber.create("+1234567890123456")).toThrow(DomainError);
  });
});
