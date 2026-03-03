import type { InterestLevel } from "@/domain/value-objects/analysis/interest-level.js";

export class CallAnalysis {
  constructor(
    readonly interestLevel: InterestLevel,
    readonly summary: string,
    readonly nextAction: string,
  ) {}
}
