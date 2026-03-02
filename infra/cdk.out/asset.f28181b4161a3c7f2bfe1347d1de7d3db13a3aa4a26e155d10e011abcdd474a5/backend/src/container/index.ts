import twilio from "twilio";
import OpenAI from "openai";
import { google } from "googleapis";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import nodemailer from "nodemailer";
import type { FastifyBaseLogger } from "fastify";

import { config } from "@/config/index.js";
import { TwilioCallRepository } from "@/infrastructure/repositories/call/twilio-call-repository.js";
import { ElevenLabsConversationRepository } from "@/infrastructure/external/elevenlabs/elevenlabs-signed-url-client.js";
import { OpenAICallAnalysisRepository } from "@/infrastructure/external/openai/openai-call-analysis-repository.js";
import { GoogleSheetsCallHistoryRepository } from "@/infrastructure/external/google/google-sheets-call-history-repository.js";
import { GoogleSheetsLeadRepository } from "@/infrastructure/external/google/google-sheets-lead-repository.js";
import { OpenAIEmailContentRepository } from "@/infrastructure/external/mail/openai-email-content-repository.js";
import { NodemailerEmailRepository } from "@/infrastructure/external/mail/nodemailer-email-repository.js";
import { MakeCallUseCase } from "@/application/usecases/call/make-call-usecase.js";
import { AnalyzeCallUseCase } from "@/application/usecases/analysis/analyze-call-usecase.js";
import { SaveCallHistoryUseCase } from "@/application/usecases/call-history/save-call-history-usecase.js";
import { PostCallProcessingUseCase } from "@/application/usecases/call-history/post-call-processing-usecase.js";
import { SendFollowUpEmailUseCase } from "@/application/usecases/follow-up-email/send-follow-up-email-usecase.js";
import { AutoCallOrchestratorUseCase } from "@/application/usecases/orchestrator/auto-call-orchestrator-usecase.js";
import { CallController } from "@/presentation/controllers/call/call-controller.js";
import { AnalysisController } from "@/presentation/controllers/analysis/analysis-controller.js";
import { CallHistoryController } from "@/presentation/controllers/call-history/call-history-controller.js";
import { FollowUpEmailController } from "@/presentation/controllers/follow-up-email/follow-up-email-controller.js";
import { OrchestratorController } from "@/presentation/controllers/orchestrator/orchestrator-controller.js";
import { DashboardUseCase } from "@/application/usecases/dashboard/dashboard-usecase.js";
import { DashboardController } from "@/presentation/controllers/dashboard/dashboard-controller.js";
import { MediaStreamHandler } from "@/presentation/handlers/media-stream/media-stream-handler.js";

export function createCallController(): CallController {
  const twilioClient = twilio(
    config.twilio.accountSid,
    config.twilio.authToken,
  );

  const callRepository = new TwilioCallRepository(twilioClient);

  const makeCallUseCase = new MakeCallUseCase(
    callRepository,
    config.twilio.phoneNumber,
    config.server.publicUrl,
  );

  return new CallController(makeCallUseCase, config.server.publicUrl);
}

let orchestratorInstance: AutoCallOrchestratorUseCase | null = null;

export function getOrchestratorInstance(): AutoCallOrchestratorUseCase | null {
  return orchestratorInstance;
}

export function createMediaStreamHandler(): MediaStreamHandler | null {
  if (!config.isElevenLabsConfigured()) {
    return null;
  }

  const elevenLabsClient = new ElevenLabsClient({
    apiKey: config.elevenlabs.apiKey,
  });

  const conversationRepository = new ElevenLabsConversationRepository(
    elevenLabsClient,
    config.elevenlabs.agentId,
  );

  const openaiClient = new OpenAI({
    apiKey: config.openai.apiKey,
  });
  const callAnalysisRepository = new OpenAICallAnalysisRepository(openaiClient);

  const callHistoryRepository = config.isGoogleConfigured()
    ? createGoogleSheetsRepository()
    : null;

  const sendFollowUpEmailUseCase = config.isMailConfigured()
    ? createSendFollowUpEmailUseCase(openaiClient)
    : null;

  const postCallProcessing = new PostCallProcessingUseCase(
    callAnalysisRepository,
    callHistoryRepository,
    sendFollowUpEmailUseCase,
  );

  const { companyName, contactName } = config.call;

  return new MediaStreamHandler(
    conversationRepository,
    { language: config.elevenlabs.language },
    (transcript, phoneNumber, logger) => {
      if (orchestratorInstance?.notifyCallComplete(phoneNumber, transcript)) {
        logger.info("[PostCall] Orchestrator handling completion");
        return;
      }

      postCallProcessing.execute({ transcript, phoneNumber, companyName, contactName, email: "" })
        .then(() => logger.info("[PostCall] Analysis and save completed"))
        .catch((error) => logger.error({ error }, "[PostCall] Failed"));
    },
  );
}

function createGoogleSheetsRepository(): GoogleSheetsCallHistoryRepository {
  const auth = new google.auth.GoogleAuth({
    keyFile: config.google.credentialsPath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  return new GoogleSheetsCallHistoryRepository(
    sheets,
    config.google.sheetsId,
  );
}

function createSendFollowUpEmailUseCase(openaiClient: OpenAI): SendFollowUpEmailUseCase {
  const emailContentRepository = new OpenAIEmailContentRepository(openaiClient);

  const transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: false,
    auth: {
      user: config.mail.user,
      pass: config.mail.password,
    },
  });

  const emailRepository = new NodemailerEmailRepository(transporter, config.mail.from);

  return new SendFollowUpEmailUseCase(emailContentRepository, emailRepository);
}

export function createAnalysisController(): AnalysisController {
  const openaiClient = new OpenAI({
    apiKey: config.openai.apiKey,
  });

  const callAnalysisRepository = new OpenAICallAnalysisRepository(openaiClient);
  const analyzeCallUseCase = new AnalyzeCallUseCase(callAnalysisRepository);

  return new AnalysisController(analyzeCallUseCase);
}

export function createCallHistoryController(): CallHistoryController | null {
  if (!config.isGoogleConfigured()) {
    return null;
  }

  const callHistoryRepository = createGoogleSheetsRepository();
  const saveCallHistoryUseCase = new SaveCallHistoryUseCase(callHistoryRepository);

  return new CallHistoryController(saveCallHistoryUseCase);
}

export function createFollowUpEmailController(): FollowUpEmailController | null {
  if (!config.isMailConfigured()) {
    return null;
  }

  const openaiClient = new OpenAI({
    apiKey: config.openai.apiKey,
  });

  const sendFollowUpEmailUseCase = createSendFollowUpEmailUseCase(openaiClient);

  return new FollowUpEmailController(sendFollowUpEmailUseCase);
}

export function createOrchestratorController(
  logger: FastifyBaseLogger,
): OrchestratorController | null {
  if (!config.isGoogleConfigured() || !config.isElevenLabsConfigured()) {
    return null;
  }

  const leadRepository = createGoogleSheetsLeadRepository();

  const twilioClient = twilio(
    config.twilio.accountSid,
    config.twilio.authToken,
  );
  const callRepository = new TwilioCallRepository(twilioClient);
  const makeCallUseCase = new MakeCallUseCase(
    callRepository,
    config.twilio.phoneNumber,
    config.server.publicUrl,
  );

  const openaiClient = new OpenAI({
    apiKey: config.openai.apiKey,
  });
  const callAnalysisRepository = new OpenAICallAnalysisRepository(openaiClient);

  const sendFollowUpEmailUseCase = config.isMailConfigured()
    ? createSendFollowUpEmailUseCase(openaiClient)
    : null;

  orchestratorInstance = new AutoCallOrchestratorUseCase(
    leadRepository,
    makeCallUseCase,
    callAnalysisRepository,
    sendFollowUpEmailUseCase,
    logger,
  );

  return new OrchestratorController(orchestratorInstance);
}

export function createDashboardController(): DashboardController | null {
  if (!config.isGoogleConfigured()) {
    return null;
  }

  const leadRepository = createGoogleSheetsLeadRepository();
  const dashboardUseCase = new DashboardUseCase(leadRepository);

  return new DashboardController(dashboardUseCase, orchestratorInstance, config.google.sheetsId);
}

function createGoogleSheetsLeadRepository(): GoogleSheetsLeadRepository {
  const auth = new google.auth.GoogleAuth({
    keyFile: config.google.credentialsPath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  return new GoogleSheetsLeadRepository(
    sheets,
    config.google.sheetsId,
  );
}
