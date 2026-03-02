import { CallSid } from "@/domain/value-objects/call/call-sid.js";
import { PhoneNumber } from "@/domain/value-objects/call/phone-number.js";

export type CallStatus = "queued" | "ringing" | "in-progress" | "completed" | "failed";

export class Call {
  constructor(
    public readonly sid: CallSid,
    public readonly to: PhoneNumber,
    public readonly from: PhoneNumber,
    public readonly status: CallStatus,
  ) {}
}
