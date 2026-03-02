import { DomainError } from "@/domain/errors/domain-error.js";
import { CALL_ERROR_MESSAGES } from "@/domain/errors/call-error-messages.js";

const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

export class PhoneNumber {
  private constructor(public readonly value: string) {}

  static create(value: string): PhoneNumber {
    if (!E164_PATTERN.test(value)) {
      throw new DomainError(CALL_ERROR_MESSAGES.INVALID_PHONE_NUMBER);
    }
    return new PhoneNumber(value);
  }
}
