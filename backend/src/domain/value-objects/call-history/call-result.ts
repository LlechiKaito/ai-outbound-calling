import { DomainError } from "@/domain/errors/domain-error.js";
import { CALL_HISTORY_ERROR_MESSAGES } from "@/domain/errors/call-history-error-messages.js";

const VALID_RESULTS = ["応答", "不在", "拒否", "留守電", "その他"] as const;

export type CallResultValue = (typeof VALID_RESULTS)[number];

export class CallResult {
  private constructor(readonly value: CallResultValue) {}

  static create(result: string): CallResult {
    if (!VALID_RESULTS.includes(result as CallResultValue)) {
      throw new DomainError(CALL_HISTORY_ERROR_MESSAGES.INVALID_CALL_RESULT);
    }
    return new CallResult(result as CallResultValue);
  }
}
