import type OpenAI from "openai";

import type { Result } from "@/domain/commons/result.js";
import { ok, fail } from "@/domain/commons/result.js";
import type {
  EmailContentRepository,
  EmailContentGenerateParams,
  GeneratedEmailContent,
} from "@/domain/repositories/follow-up-email/email-content-repository.js";
import { FOLLOW_UP_EMAIL_ERROR_MESSAGES } from "@/domain/errors/follow-up-email-error-messages.js";
import { OPENAI_MODEL } from "@/constants/openai.js";
import { FOLLOW_UP_EMAIL_SYSTEM_PROMPT } from "@/constants/follow-up-email.js";

interface EmailContentResponse {
  subject: string;
  body: string;
}

export class OpenAIEmailContentRepository implements EmailContentRepository {
  constructor(private readonly client: OpenAI) {}

  async generate(params: EmailContentGenerateParams): Promise<Result<GeneratedEmailContent, Error>> {
    const userMessage = this.buildUserMessage(params);

    const response = await this.client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: FOLLOW_UP_EMAIL_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return fail(new Error(FOLLOW_UP_EMAIL_ERROR_MESSAGES.CONTENT_GENERATION_FAILED));
    }

    const parsed = this.parseResponse(content);
    if (!parsed) {
      return fail(new Error(FOLLOW_UP_EMAIL_ERROR_MESSAGES.INVALID_RESPONSE_FORMAT));
    }

    return ok(parsed);
  }

  private buildUserMessage(params: EmailContentGenerateParams): string {
    return [
      `会社名: ${params.companyName}`,
      `担当者名: ${params.contactName}`,
      `通話の要約: ${params.summary}`,
      `興味度: ${params.interestLevel}`,
    ].join("\n");
  }

  private parseResponse(content: string): EmailContentResponse | null {
    const json = JSON.parse(content) as Record<string, unknown>;

    if (typeof json.subject !== "string" || typeof json.body !== "string") {
      return null;
    }

    return {
      subject: json.subject,
      body: json.body,
    };
  }
}
