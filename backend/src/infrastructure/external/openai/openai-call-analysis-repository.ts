import type OpenAI from "openai";

import type { Result } from "@/domain/commons/result.js";
import { ok, fail } from "@/domain/commons/result.js";
import type { CallAnalysisRepository } from "@/domain/repositories/analysis/call-analysis-repository.js";
import { CallAnalysis } from "@/domain/entities/analysis/call-analysis.js";
import { InterestLevel } from "@/domain/value-objects/analysis/interest-level.js";
import { ANALYSIS_ERROR_MESSAGES } from "@/domain/errors/analysis-error-messages.js";
import {
  OPENAI_MODEL,
  CALL_ANALYSIS_SYSTEM_PROMPT,
} from "@/constants/openai.js";

interface AnalysisResponse {
  interestLevel: number;
  summary: string;
  nextAction: string;
}

export class OpenAICallAnalysisRepository implements CallAnalysisRepository {
  constructor(private readonly client: OpenAI) {}

  async analyze(transcript: string): Promise<Result<CallAnalysis, Error>> {
    const response = await this.client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: CALL_ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: transcript },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return fail(new Error(ANALYSIS_ERROR_MESSAGES.ANALYSIS_FAILED));
    }

    const parsed = this.parseResponse(content);
    if (!parsed) {
      return fail(new Error(ANALYSIS_ERROR_MESSAGES.INVALID_RESPONSE_FORMAT));
    }

    const callAnalysis = new CallAnalysis(
      InterestLevel.create(parsed.interestLevel),
      parsed.summary,
      parsed.nextAction,
    );

    return ok(callAnalysis);
  }

  private parseResponse(content: string): AnalysisResponse | null {
    const json = JSON.parse(content) as Record<string, unknown>;

    if (
      typeof json.interestLevel !== "number" ||
      typeof json.summary !== "string" ||
      typeof json.nextAction !== "string"
    ) {
      return null;
    }

    return {
      interestLevel: json.interestLevel,
      summary: json.summary,
      nextAction: json.nextAction,
    };
  }
}
