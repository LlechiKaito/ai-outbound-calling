import { EventEmitter } from "events";

import { ELEVENLABS_SERVER_EVENT } from "@/constants/elevenlabs";

export class MockWebSocket extends EventEmitter {
  readyState = 1;
  send = jest.fn();
  close = jest.fn();
}

export const createMockLogger = () =>
  ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
    trace: jest.fn(),
    child: jest.fn().mockReturnThis(),
    level: "info",
    silent: jest.fn(),
  }) as never;

export function toBuffer(obj: Record<string, unknown>): Buffer {
  return Buffer.from(JSON.stringify(obj));
}

export function emitTwilioStart(ws: MockWebSocket, streamSid: string): void {
  ws.emit(
    "message",
    toBuffer({
      event: "start",
      start: {
        streamSid,
        callSid: "CA123",
        customParameters: { to: "+819012345678" },
      },
    }),
  );
}

export function emitElevenLabsAudio(ws: MockWebSocket, payload: string): void {
  ws.emit(
    "message",
    toBuffer({
      type: ELEVENLABS_SERVER_EVENT.AUDIO,
      audio_event: { audio_base_64: payload, event_id: "evt-1" },
    }),
  );
}

export function findSentMessage(
  ws: MockWebSocket,
  predicate: (msg: Record<string, unknown>) => boolean,
): Record<string, unknown> | undefined {
  const messages = ws.send.mock.calls.map(
    (call) => JSON.parse(call[0] as string) as Record<string, unknown>,
  );
  return messages.find(predicate);
}

export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
