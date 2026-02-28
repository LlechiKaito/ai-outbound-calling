import type { Result } from "@/domain/commons/result.js";
import type { Call } from "@/domain/entities/call/call.js";
import type { PhoneNumber } from "@/domain/value-objects/call/phone-number.js";

export interface CallRepository {
  initiateCall(to: PhoneNumber, from: PhoneNumber, webhookUrl: string): Promise<Result<Call, Error>>;
}
