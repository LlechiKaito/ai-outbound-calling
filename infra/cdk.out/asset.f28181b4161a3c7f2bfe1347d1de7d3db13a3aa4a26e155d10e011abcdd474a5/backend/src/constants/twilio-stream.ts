export const TWILIO_STREAM_EVENT = {
  CONNECTED: "connected",
  START: "start",
  MEDIA: "media",
  STOP: "stop",
} as const;

export const TWILIO_STREAM_OUTBOUND_EVENT = {
  MEDIA: "media",
  CLEAR: "clear",
} as const;
