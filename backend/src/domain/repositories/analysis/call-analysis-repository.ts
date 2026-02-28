import type { Result } from "@/domain/commons/result.js";
import type { CallAnalysis } from "@/domain/entities/analysis/call-analysis.js";

export interface CallAnalysisRepository {
  analyze(transcript: string): Promise<Result<CallAnalysis, Error>>;
}
