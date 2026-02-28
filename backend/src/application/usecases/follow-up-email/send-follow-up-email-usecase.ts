import type { Result } from "@/domain/commons/result.js";
import { ok, fail } from "@/domain/commons/result.js";
import type { EmailRepository } from "@/domain/repositories/follow-up-email/email-repository.js";
import type { EmailContentRepository } from "@/domain/repositories/follow-up-email/email-content-repository.js";
import { FollowUpEmail } from "@/domain/entities/follow-up-email/follow-up-email.js";
import { InterestLevel } from "@/domain/value-objects/analysis/interest-level.js";
import type { SendFollowUpEmailDto } from "@/application/dto/follow-up-email/send-follow-up-email-dto.js";

export class SendFollowUpEmailUseCase {
  constructor(
    private readonly emailContentRepository: EmailContentRepository,
    private readonly emailRepository: EmailRepository,
  ) {}

  async execute(dto: SendFollowUpEmailDto): Promise<Result<void, Error>> {
    const contentResult = await this.emailContentRepository.generate({
      companyName: dto.companyName,
      contactName: dto.contactName,
      summary: dto.summary,
      interestLevel: dto.interestLevel,
    });

    if (!contentResult.success) {
      return fail(contentResult.error);
    }

    const interestLevel = InterestLevel.create(dto.interestLevel);

    const followUpEmail = new FollowUpEmail(
      dto.to,
      dto.companyName,
      dto.contactName,
      contentResult.data.subject,
      contentResult.data.body,
      interestLevel,
    );

    const sendResult = await this.emailRepository.send(followUpEmail);

    if (!sendResult.success) {
      return fail(sendResult.error);
    }

    return ok(undefined);
  }
}
