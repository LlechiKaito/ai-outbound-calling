import type { InterestLevel } from "@/domain/value-objects/analysis/interest-level.js";
import type { CallResult } from "@/domain/value-objects/call-history/call-result.js";
import { formatDateTimeJST, formatPhoneNumberDomestic } from "@/utils/formatters.js";

export class CallHistory {
  constructor(
    readonly companyName: string,
    readonly contactName: string,
    readonly phoneNumber: string,
    readonly email: string,
    readonly status: string,
    readonly lastCalledAt: Date,
    readonly callResult: CallResult,
    readonly interestLevel: InterestLevel,
    readonly nextAction: string,
    readonly memo: string,
    readonly retryCount: string,
  ) {}

  toRow(): string[] {
    return [
      this.companyName,
      this.contactName,
      formatPhoneNumberDomestic(this.phoneNumber),
      this.email,
      this.status,
      formatDateTimeJST(this.lastCalledAt),
      this.callResult.value,
      String(this.interestLevel.value),
      this.nextAction,
      this.memo,
      this.retryCount,
    ];
  }
}
