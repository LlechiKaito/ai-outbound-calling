import type { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

import type { ConversationRepository } from "@/domain/repositories/conversation/conversation-repository.js";
import type { Result } from "@/domain/commons/result.js";
import { ok, fail } from "@/domain/commons/result.js";
import { CONVERSATION_ERROR_MESSAGES } from "@/domain/errors/conversation-error-messages.js";

export class ElevenLabsConversationRepository
  implements ConversationRepository
{
  constructor(
    private readonly client: ElevenLabsClient,
    private readonly agentId: string,
  ) {}

  async getSignedUrl(): Promise<Result<string, Error>> {
    const response =
      await this.client.conversationalAi.conversations.getSignedUrl({
        agentId: this.agentId,
      });

    if (!response.signedUrl) {
      return fail(new Error(CONVERSATION_ERROR_MESSAGES.SIGNED_URL_RETRIEVAL_FAILED));
    }

    return ok(response.signedUrl);
  }
}
