import { DomainError } from "@/domain/errors/domain-error.js";
import { ANALYSIS_ERROR_MESSAGES } from "@/domain/errors/analysis-error-messages.js";

const MIN_LEVEL = 1;
const MAX_LEVEL = 5;

export class InterestLevel {
  private constructor(readonly value: number) {}

  static create(level: number): InterestLevel {
    if (!Number.isInteger(level) || level < MIN_LEVEL || level > MAX_LEVEL) {
      throw new DomainError(ANALYSIS_ERROR_MESSAGES.INVALID_INTEREST_LEVEL);
    }
    return new InterestLevel(level);
  }
}
