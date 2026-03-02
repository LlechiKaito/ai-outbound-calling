import type { FastifyReply, FastifyRequest } from "fastify";

import type { AutoCallOrchestratorUseCase } from "@/application/usecases/orchestrator/auto-call-orchestrator-usecase.js";
import { HTTP_STATUS } from "@/constants/http.js";

export class OrchestratorController {
  constructor(
    private readonly orchestrator: AutoCallOrchestratorUseCase,
  ) {}

  async start(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    await this.orchestrator.start();

    reply.status(HTTP_STATUS.OK).send({
      isSuccess: true,
      data: this.orchestrator.getStatus(),
    });
  }

  async pause(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    this.orchestrator.pause();

    reply.status(HTTP_STATUS.OK).send({
      isSuccess: true,
      data: this.orchestrator.getStatus(),
    });
  }

  async resume(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    this.orchestrator.resume();

    reply.status(HTTP_STATUS.OK).send({
      isSuccess: true,
      data: this.orchestrator.getStatus(),
    });
  }

  async stop(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    this.orchestrator.stop();

    reply.status(HTTP_STATUS.OK).send({
      isSuccess: true,
      data: this.orchestrator.getStatus(),
    });
  }

  async getStatus(
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    reply.status(HTTP_STATUS.OK).send({
      isSuccess: true,
      data: this.orchestrator.getStatus(),
    });
  }
}
