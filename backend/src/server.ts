import Fastify from "fastify";
import fastifyWebSocket from "@fastify/websocket";

import { config } from "@/config/index.js";
import { errorHandler } from "@/presentation/errors/error-handler.js";
import { CONTENT_TYPE } from "@/constants/http.js";
import { healthRoutes } from "@/presentation/routes/health-routes.js";
import { createCallController, createMediaStreamHandler, createAnalysisController, createCallHistoryController, createFollowUpEmailController, createOrchestratorController } from "@/container/index.js";
import { callRoutes } from "@/presentation/routes/call/call-routes.js";
import { analysisRoutes } from "@/presentation/routes/analysis/analysis-routes.js";
import { callHistoryRoutes } from "@/presentation/routes/call-history/call-history-routes.js";
import { followUpEmailRoutes } from "@/presentation/routes/follow-up-email/follow-up-email-routes.js";
import { orchestratorRoutes } from "@/presentation/routes/orchestrator/orchestrator-routes.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(fastifyWebSocket);

  app.addContentTypeParser(
    CONTENT_TYPE.FORM_URLENCODED,
    (_request, _payload, done) => { done(null); },
  );

  app.setErrorHandler(errorHandler);

  app.register(healthRoutes);

  const callController = createCallController();
  const mediaStreamHandler = createMediaStreamHandler();
  app.register(callRoutes(callController, mediaStreamHandler));

  const analysisController = createAnalysisController();
  app.register(analysisRoutes(analysisController));

  const callHistoryController = createCallHistoryController();
  if (callHistoryController) {
    app.register(callHistoryRoutes(callHistoryController));
  }

  const followUpEmailController = createFollowUpEmailController();
  if (followUpEmailController) {
    app.register(followUpEmailRoutes(followUpEmailController));
  }

  const orchestratorController = createOrchestratorController(app.log);
  if (orchestratorController) {
    app.register(orchestratorRoutes(orchestratorController));
  }

  return app;
}

async function start(): Promise<void> {
  const app = buildApp();

  await app.listen({
    port: config.server.port,
    host: config.server.host,
  });
}

start();
