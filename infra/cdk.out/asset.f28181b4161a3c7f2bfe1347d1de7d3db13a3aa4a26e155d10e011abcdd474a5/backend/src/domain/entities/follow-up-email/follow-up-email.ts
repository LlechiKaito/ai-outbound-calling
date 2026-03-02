import type { InterestLevel } from "@/domain/value-objects/analysis/interest-level.js";

export class FollowUpEmail {
  constructor(
    readonly to: string,
    readonly companyName: string,
    readonly contactName: string,
    readonly subject: string,
    readonly body: string,
    readonly interestLevel: InterestLevel,
  ) {}
}
