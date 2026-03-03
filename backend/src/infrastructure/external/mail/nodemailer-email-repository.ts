import type { Transporter } from "nodemailer";

import type { Result } from "@/domain/commons/result.js";
import { ok, fail } from "@/domain/commons/result.js";
import type { EmailRepository } from "@/domain/repositories/follow-up-email/email-repository.js";
import type { FollowUpEmail } from "@/domain/entities/follow-up-email/follow-up-email.js";
import { FOLLOW_UP_EMAIL_ERROR_MESSAGES } from "@/domain/errors/follow-up-email-error-messages.js";

export class NodemailerEmailRepository implements EmailRepository {
  constructor(
    private readonly transporter: Transporter,
    private readonly from: string,
  ) {}

  async send(email: FollowUpEmail): Promise<Result<void, Error>> {
    const result = await this.transporter.sendMail({
      from: this.from,
      to: email.to,
      subject: email.subject,
      text: email.body,
    });

    if (!result.accepted.length) {
      return fail(new Error(FOLLOW_UP_EMAIL_ERROR_MESSAGES.SEND_FAILED));
    }

    return ok(undefined);
  }
}
