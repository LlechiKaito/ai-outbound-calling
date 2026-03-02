import type { FastifyBaseLogger } from "fastify";
import WebSocket from "ws";

import type { ConversationRepository } from "@/domain/repositories/conversation/conversation-repository.js";
import {
  ELEVENLABS_AUDIO_FORMAT,
  ELEVENLABS_SERVER_EVENT,
  ELEVENLABS_CLIENT_EVENT,
} from "@/constants/elevenlabs.js";
import {
  TWILIO_STREAM_EVENT,
  TWILIO_STREAM_OUTBOUND_EVENT,
} from "@/constants/twilio-stream.js";
import { pcm16kToMulaw8k } from "@/utils/audio-converter.js";
import type {
  TwilioStreamMessage,
  ElevenLabsMessage,
  SessionState,
} from "@/presentation/handlers/media-stream/media-stream-types.js";

export type { OnCallComplete, ConversationOverrideConfig } from "@/presentation/handlers/media-stream/media-stream-types.js";

export class MediaStreamHandler {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly overrideConfig: { readonly language: string },
    private readonly onCallComplete?: (
      transcript: string,
      phoneNumber: string,
      logger: FastifyBaseLogger,
    ) => void,
  ) {}

  async handle(
    twilioWs: WebSocket,
    logger: FastifyBaseLogger,
  ): Promise<void> {
    const state = this.createSessionState();
    this.setupTwilioListeners(twilioWs, state, logger);

    try {
      await this.connectElevenLabs(twilioWs, state, logger);
    } catch (error) {
      logger.error({ error }, "[MediaStream] Failed");
      twilioWs.close();
    }
  }

  private createSessionState(): SessionState {
    return {
      streamSid: null,
      callSid: null,
      phoneNumber: null,
      elevenLabsWs: null,
      transcriptLines: [],
    };
  }

  private setupTwilioListeners(
    twilioWs: WebSocket,
    state: SessionState,
    logger: FastifyBaseLogger,
  ): void {
    const closeElevenLabs = (): void => {
      if (state.elevenLabsWs?.readyState === WebSocket.OPEN) {
        state.elevenLabsWs.close();
      }
    };

    twilioWs.on("close", () => {
      logger.info("[Twilio] Client disconnected");
      closeElevenLabs();
      this.processCallComplete(state, logger);
    });

    twilioWs.on("error", (error: Error) => {
      logger.error({ error }, "[Twilio] WebSocket error");
      closeElevenLabs();
    });

    twilioWs.on("message", (data: WebSocket.RawData) => {
      const message: TwilioStreamMessage = JSON.parse(data.toString());
      this.handleTwilioMessage(message, state, logger);
    });
  }

  private async connectElevenLabs(
    twilioWs: WebSocket,
    state: SessionState,
    logger: FastifyBaseLogger,
  ): Promise<void> {
    const result = await this.conversationRepository.getSignedUrl();

    if (!result.success) {
      logger.error({ error: result.error }, "[MediaStream] Failed to get signed URL");
      twilioWs.close();
      return;
    }

    if (twilioWs.readyState !== WebSocket.OPEN) {
      return;
    }

    state.elevenLabsWs = new WebSocket(result.data);
    this.setupElevenLabsListeners(twilioWs, state, logger);
  }

  private setupElevenLabsListeners(
    twilioWs: WebSocket,
    state: SessionState,
    logger: FastifyBaseLogger,
  ): void {
    state.elevenLabsWs!.on("open", () => {
      logger.info("[ElevenLabs] Connected to Conversational AI");
      this.sendInitiationConfig(state);
    });

    state.elevenLabsWs!.on("message", (data: WebSocket.RawData) => {
      const message: ElevenLabsMessage = JSON.parse(data.toString());
      this.handleElevenLabsMessage(message, twilioWs, state, logger);
    });

    state.elevenLabsWs!.on("error", (error: Error) => {
      logger.error({ error }, "[ElevenLabs] WebSocket error");
    });

    state.elevenLabsWs!.on("close", (code: number, reason: Buffer) => {
      logger.info({ code, reason: reason.toString() }, "[ElevenLabs] Disconnected");
    });
  }

  private sendInitiationConfig(state: SessionState): void {
    state.elevenLabsWs!.send(
      JSON.stringify({
        type: ELEVENLABS_CLIENT_EVENT.CONVERSATION_INITIATION_CLIENT_DATA,
        conversation_config_override: {
          agent: { language: this.overrideConfig.language },
          tts: { agent_output_audio_format: ELEVENLABS_AUDIO_FORMAT.ULAW_8000 },
          asr: { user_input_audio_format: ELEVENLABS_AUDIO_FORMAT.ULAW_8000 },
        },
      }),
    );
  }

  private handleTwilioMessage(
    message: TwilioStreamMessage,
    state: SessionState,
    logger: FastifyBaseLogger,
  ): void {
    switch (message.event) {
      case TWILIO_STREAM_EVENT.START:
        state.streamSid = message.start?.streamSid ?? null;
        state.callSid = message.start?.callSid ?? null;
        state.phoneNumber = message.start?.customParameters?.to ?? null;
        logger.info(
          { streamSid: state.streamSid, callSid: state.callSid, phoneNumber: state.phoneNumber },
          "[Twilio] Stream started",
        );
        break;
      case TWILIO_STREAM_EVENT.MEDIA:
        this.forwardAudioToElevenLabs(message, state);
        break;
      case TWILIO_STREAM_EVENT.STOP:
        logger.info({ streamSid: state.streamSid }, "[Twilio] Stream stopped");
        if (state.elevenLabsWs?.readyState === WebSocket.OPEN) {
          state.elevenLabsWs.close();
        }
        break;
    }
  }

  private forwardAudioToElevenLabs(
    message: TwilioStreamMessage,
    state: SessionState,
  ): void {
    if (state.elevenLabsWs?.readyState === WebSocket.OPEN && message.media?.payload) {
      state.elevenLabsWs.send(
        JSON.stringify({ user_audio_chunk: message.media.payload }),
      );
    }
  }

  private handleElevenLabsMessage(
    message: ElevenLabsMessage,
    twilioWs: WebSocket,
    state: SessionState,
    logger: FastifyBaseLogger,
  ): void {
    switch (message.type) {
      case ELEVENLABS_SERVER_EVENT.CONVERSATION_INITIATION_METADATA:
        logger.info(
          {
            conversationId: message.conversation_initiation_metadata_event?.conversation_id,
            outputFormat: message.conversation_initiation_metadata_event?.agent_output_audio_format,
          },
          "[ElevenLabs] Conversation initiated",
        );
        break;
      case ELEVENLABS_SERVER_EVENT.AUDIO:
        this.forwardAudioToTwilio(message, twilioWs, state);
        break;
      case ELEVENLABS_SERVER_EVENT.INTERRUPTION:
        this.sendClearToTwilio(twilioWs, state);
        break;
      case ELEVENLABS_SERVER_EVENT.USER_TRANSCRIPT:
        this.collectUserTranscript(message, state, logger);
        break;
      case ELEVENLABS_SERVER_EVENT.AGENT_RESPONSE:
        this.collectAgentResponse(message, state, logger);
        break;
      case ELEVENLABS_SERVER_EVENT.PING:
        this.respondPong(message, state);
        break;
      default:
        logger.info({ messageType: message.type, message }, "[ElevenLabs] Unhandled message");
        break;
    }
  }

  private forwardAudioToTwilio(
    message: ElevenLabsMessage,
    twilioWs: WebSocket,
    state: SessionState,
  ): void {
    if (state.streamSid && message.audio_event?.audio_base_64) {
      const mulawPayload = pcm16kToMulaw8k(message.audio_event.audio_base_64);
      twilioWs.send(
        JSON.stringify({
          event: TWILIO_STREAM_OUTBOUND_EVENT.MEDIA,
          streamSid: state.streamSid,
          media: { payload: mulawPayload },
        }),
      );
    }
  }

  private sendClearToTwilio(twilioWs: WebSocket, state: SessionState): void {
    if (state.streamSid) {
      twilioWs.send(
        JSON.stringify({
          event: TWILIO_STREAM_OUTBOUND_EVENT.CLEAR,
          streamSid: state.streamSid,
        }),
      );
    }
  }

  private collectUserTranscript(
    message: ElevenLabsMessage,
    state: SessionState,
    logger: FastifyBaseLogger,
  ): void {
    if (message.user_transcription_event?.user_transcript) {
      state.transcriptLines.push(`顧客: ${message.user_transcription_event.user_transcript}`);
      logger.info({ text: message.user_transcription_event.user_transcript }, "[ElevenLabs] User transcript");
    }
  }

  private collectAgentResponse(
    message: ElevenLabsMessage,
    state: SessionState,
    logger: FastifyBaseLogger,
  ): void {
    if (message.agent_response_event?.agent_response) {
      state.transcriptLines.push(`営業: ${message.agent_response_event.agent_response}`);
      logger.info({ text: message.agent_response_event.agent_response }, "[ElevenLabs] Agent response");
    }
  }

  private respondPong(message: ElevenLabsMessage, state: SessionState): void {
    if (message.ping_event?.event_id && state.elevenLabsWs?.readyState === WebSocket.OPEN) {
      state.elevenLabsWs.send(
        JSON.stringify({
          type: ELEVENLABS_CLIENT_EVENT.PONG,
          event_id: message.ping_event.event_id,
        }),
      );
    }
  }

  private processCallComplete(
    state: SessionState,
    logger: FastifyBaseLogger,
  ): void {
    if (state.transcriptLines.length === 0 || !this.onCallComplete) {
      logger.info("[MediaStream] No transcript to process");
      return;
    }

    const transcript = state.transcriptLines.join("\n");
    logger.info(
      { lineCount: state.transcriptLines.length, transcript },
      "[MediaStream] Processing call transcript",
    );

    this.onCallComplete(transcript, state.phoneNumber ?? "", logger);
  }
}
