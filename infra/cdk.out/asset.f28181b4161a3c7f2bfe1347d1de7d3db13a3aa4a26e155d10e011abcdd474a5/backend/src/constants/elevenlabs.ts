export const ELEVENLABS_AUDIO_FORMAT = {
  ULAW_8000: "ulaw_8000",
} as const;

export const ELEVENLABS_SERVER_EVENT = {
  CONVERSATION_INITIATION_METADATA: "conversation_initiation_metadata",
  AUDIO: "audio",
  AGENT_RESPONSE: "agent_response",
  USER_TRANSCRIPT: "user_transcript",
  INTERRUPTION: "interruption",
  PING: "ping",
} as const;

export const ELEVENLABS_CLIENT_EVENT = {
  CONVERSATION_INITIATION_CLIENT_DATA: "conversation_initiation_client_data",
  PONG: "pong",
} as const;
