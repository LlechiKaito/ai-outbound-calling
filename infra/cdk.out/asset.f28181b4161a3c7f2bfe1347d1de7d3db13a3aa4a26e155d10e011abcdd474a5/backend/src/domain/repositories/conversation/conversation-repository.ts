import type { Result } from "@/domain/commons/result.js";

export interface ConversationRepository {
  getSignedUrl(): Promise<Result<string, Error>>;
}
