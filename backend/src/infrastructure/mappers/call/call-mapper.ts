import { Call } from "@/domain/entities/call/call.js";
import type { CallStatus } from "@/domain/entities/call/call.js";
import { CallSid } from "@/domain/value-objects/call/call-sid.js";
import { PhoneNumber } from "@/domain/value-objects/call/phone-number.js";

interface TwilioCallInstance {
  sid: string;
  to: string;
  from: string;
  status: string;
}

export class CallMapper {
  static toDomain(raw: TwilioCallInstance): Call {
    return new Call(
      new CallSid(raw.sid),
      PhoneNumber.create(raw.to),
      PhoneNumber.create(raw.from),
      raw.status as CallStatus,
    );
  }
}
