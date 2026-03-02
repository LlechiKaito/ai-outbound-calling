import type { FastifyBaseLogger } from "fastify";

export interface TwilioStreamMessage {
  event: string;
  start?: {
    streamSid: string;
    callSid: string;
    customParameters?: Record<string, string>;
  };
  media?: {
    payload: string;
  };
}

export interface ElevenLabsMessage {
  type: string;
  audio_event?: {
    audio_base_64: string;
    event_id: string;
  };
  ping_event?: {
    event_id: string;
  };
  conversation_initiation_metadata_event?: {
    conversation_id: string;
    agent_output_audio_format: string;
  };
  user_transcription_event?: {
    user_transcript: string;
  };
  agent_response_event?: {
    agent_response: string;
  };
}

export type OnCallComplete = (
  transcript: string,
  phoneNumber: string,
  logger: FastifyBaseLogger,
) => void;

export interface ConversationOverrideConfig {
  readonly language: string;
}

export interface SessionState {
  streamSid: string | null;
  callSid: string | null;
  phoneNumber: string | null;
  elevenLabsWs: import("ws").default | null;
  transcriptLines: string[];
}
