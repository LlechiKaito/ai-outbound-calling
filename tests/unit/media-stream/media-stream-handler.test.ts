jest.mock("ws", () => {
  const fn = jest.fn();
  Object.defineProperty(fn, "OPEN", { value: 1 });
  return { __esModule: true, default: fn };
});

import WebSocket from "ws";
import { MediaStreamHandler } from "@/presentation/handlers/media-stream/media-stream-handler";
import type { ConversationRepository } from "@/domain/repositories/conversation/conversation-repository";
import {
  ELEVENLABS_SERVER_EVENT,
  ELEVENLABS_CLIENT_EVENT,
} from "@/constants/elevenlabs";
import { TWILIO_STREAM_OUTBOUND_EVENT } from "@/constants/twilio-stream";
import { pcm16kToMulaw8k } from "@/utils/audio-converter";
import {
  MockWebSocket,
  createMockLogger,
  toBuffer,
  emitTwilioStart,
  emitElevenLabsAudio,
  findSentMessage,
  flushPromises,
} from "./helpers";

const MockedWebSocket = WebSocket as unknown as jest.Mock;

describe("MediaStreamHandler", () => {
  let handler: MediaStreamHandler;
  let mockConversationRepository: jest.Mocked<ConversationRepository>;
  let mockTwilioWs: MockWebSocket;
  let mockElevenLabsWs: MockWebSocket;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockConversationRepository = {
      getSignedUrl: jest
        .fn()
        .mockResolvedValue({ success: true, data: "wss://signed-url.test" }),
    };

    mockTwilioWs = new MockWebSocket();
    mockElevenLabsWs = new MockWebSocket();
    mockLogger = createMockLogger();

    MockedWebSocket.mockImplementation(() => mockElevenLabsWs);

    handler = new MediaStreamHandler(mockConversationRepository, {
      language: "ja",
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should forward audio from ElevenLabs to Twilio", async () => {
    const handlePromise = handler.handle(mockTwilioWs as never, mockLogger);
    await flushPromises();

    emitTwilioStart(mockTwilioWs, "MZ123");
    emitElevenLabsAudio(mockElevenLabsWs, "dGVzdC1hdWRpbw==");

    await handlePromise;

    const msg = findSentMessage(
      mockTwilioWs,
      (m) => m.event === TWILIO_STREAM_OUTBOUND_EVENT.MEDIA,
    );
    expect(msg).toBeDefined();
    const expectedPayload = pcm16kToMulaw8k("dGVzdC1hdWRpbw==");
    expect(msg?.media).toEqual({ payload: expectedPayload });
    expect(msg?.streamSid).toBe("MZ123");
  });

  it("should send clear to Twilio on interruption", async () => {
    const handlePromise = handler.handle(mockTwilioWs as never, mockLogger);
    await flushPromises();

    emitTwilioStart(mockTwilioWs, "MZ123");
    mockElevenLabsWs.emit(
      "message",
      toBuffer({
        type: ELEVENLABS_SERVER_EVENT.INTERRUPTION,
        interruption_event: { event_id: "evt-2" },
      }),
    );

    await handlePromise;

    const msg = findSentMessage(
      mockTwilioWs,
      (m) => m.event === TWILIO_STREAM_OUTBOUND_EVENT.CLEAR,
    );
    expect(msg).toBeDefined();
    expect(msg?.streamSid).toBe("MZ123");
  });

  it("should respond with pong to ping", async () => {
    const handlePromise = handler.handle(mockTwilioWs as never, mockLogger);
    await flushPromises();

    mockElevenLabsWs.emit(
      "message",
      toBuffer({
        type: ELEVENLABS_SERVER_EVENT.PING,
        ping_event: { event_id: "ping-1" },
      }),
    );

    await handlePromise;

    const msg = findSentMessage(
      mockElevenLabsWs,
      (m) => m.type === ELEVENLABS_CLIENT_EVENT.PONG,
    );
    expect(msg).toBeDefined();
    expect(msg?.event_id).toBe("ping-1");
  });

  it("should forward audio from Twilio to ElevenLabs", async () => {
    const handlePromise = handler.handle(mockTwilioWs as never, mockLogger);
    await flushPromises();

    mockTwilioWs.emit(
      "message",
      toBuffer({ event: "media", media: { payload: "dXNlci1hdWRpbw==" } }),
    );

    await handlePromise;

    const msg = findSentMessage(
      mockElevenLabsWs,
      (m) => m.user_audio_chunk !== undefined,
    );
    expect(msg).toBeDefined();
    expect(msg?.user_audio_chunk).toBe("dXNlci1hdWRpbw==");
  });

  it("should close ElevenLabs when Twilio disconnects", async () => {
    const handlePromise = handler.handle(mockTwilioWs as never, mockLogger);
    await flushPromises();

    mockTwilioWs.emit("close");
    await handlePromise;

    expect(mockElevenLabsWs.close).toHaveBeenCalled();
  });

  it("should close ElevenLabs when Twilio stream stops", async () => {
    const handlePromise = handler.handle(mockTwilioWs as never, mockLogger);
    await flushPromises();

    mockTwilioWs.emit("message", toBuffer({ event: "stop" }));
    await handlePromise;

    expect(mockElevenLabsWs.close).toHaveBeenCalled();
  });

  it("should collect transcripts and call onCallComplete on close", async () => {
    const onCallComplete = jest.fn();
    handler = new MediaStreamHandler(
      mockConversationRepository,
      { language: "ja" },
      onCallComplete,
    );

    const handlePromise = handler.handle(mockTwilioWs as never, mockLogger);
    await flushPromises();

    emitTwilioStart(mockTwilioWs, "MZ123");

    mockElevenLabsWs.emit(
      "message",
      toBuffer({
        type: ELEVENLABS_SERVER_EVENT.AGENT_RESPONSE,
        agent_response_event: { agent_response: "こんにちは" },
      }),
    );

    mockElevenLabsWs.emit(
      "message",
      toBuffer({
        type: ELEVENLABS_SERVER_EVENT.USER_TRANSCRIPT,
        user_transcription_event: { user_transcript: "はい、どうも" },
      }),
    );

    mockTwilioWs.emit("close");
    await handlePromise;

    expect(onCallComplete).toHaveBeenCalledTimes(1);
    const [transcript, phoneNumber, logger] = onCallComplete.mock.calls[0];
    expect(transcript).toBe("営業: こんにちは\n顧客: はい、どうも");
    expect(phoneNumber).toBe("+819012345678");
    expect(logger).toBeDefined();
  });

  it("should not call onCallComplete when no transcript", async () => {
    const onCallComplete = jest.fn();
    handler = new MediaStreamHandler(
      mockConversationRepository,
      { language: "ja" },
      onCallComplete,
    );

    const handlePromise = handler.handle(mockTwilioWs as never, mockLogger);
    await flushPromises();

    mockTwilioWs.emit("close");
    await handlePromise;

    expect(onCallComplete).not.toHaveBeenCalled();
  });

  it("should close Twilio when signed URL fetch fails", async () => {
    mockConversationRepository.getSignedUrl.mockResolvedValue({
      success: false,
      error: new Error("Auth failed"),
    });

    await handler.handle(mockTwilioWs as never, mockLogger);

    expect(mockTwilioWs.close).toHaveBeenCalled();
  });
});
