import type { Result } from "@/domain/commons/result.js";

export interface GeneratedEmailContent {
  readonly subject: string;
  readonly body: string;
}

export interface EmailContentGenerateParams {
  readonly companyName: string;
  readonly contactName: string;
  readonly summary: string;
  readonly interestLevel: number;
}

export interface EmailContentRepository {
  generate(params: EmailContentGenerateParams): Promise<Result<GeneratedEmailContent, Error>>;
}
