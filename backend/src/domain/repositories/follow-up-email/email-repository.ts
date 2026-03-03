import type { Result } from "@/domain/commons/result.js";
import type { FollowUpEmail } from "@/domain/entities/follow-up-email/follow-up-email.js";

export interface EmailRepository {
  send(email: FollowUpEmail): Promise<Result<void, Error>>;
}
