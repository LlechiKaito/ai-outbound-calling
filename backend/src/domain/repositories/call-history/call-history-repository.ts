import type { Result } from "@/domain/commons/result.js";
import type { CallHistory } from "@/domain/entities/call-history/call-history.js";

export interface CallHistoryRepository {
  save(callHistory: CallHistory): Promise<Result<void, Error>>;
}
