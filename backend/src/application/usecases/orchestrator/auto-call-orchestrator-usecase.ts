import type { FastifyBaseLogger } from "fastify";

import type { LeadRepository, LeadUpdateData } from "@/domain/repositories/orchestrator/lead-repository.js";
import type { CallAnalysisRepository } from "@/domain/repositories/analysis/call-analysis-repository.js";
import type { MakeCallUseCase } from "@/application/usecases/call/make-call-usecase.js";
import type { SendFollowUpEmailUseCase } from "@/application/usecases/follow-up-email/send-follow-up-email-usecase.js";
import type { Lead } from "@/domain/entities/orchestrator/lead.js";
import { OrchestratorState } from "@/domain/value-objects/orchestrator/orchestrator-state.js";
import { BusinessHours } from "@/domain/value-objects/orchestrator/business-hours.js";
import { ORCHESTRATOR_ERROR_MESSAGES } from "@/domain/errors/orchestrator-error-messages.js";
import type {
  OrchestratorStatusResponseDto,
  CallCompletionEvent,
} from "@/application/dto/orchestrator/orchestrator-dto.js";
import {
  MAX_RETRY_COUNT,
  CALL_TIMEOUT_MS,
  INTER_CALL_DELAY_MS,
  BUSINESS_HOURS_CHECK_INTERVAL_MS,
  PAUSE_CHECK_INTERVAL_MS,
  LEAD_STATUS,
} from "@/constants/orchestrator.js";
import { config } from "@/config/index.js";

interface PendingCall {
  readonly resolve: (event: CallCompletionEvent) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
}

export class AutoCallOrchestratorUseCase {
  private state: OrchestratorState = OrchestratorState.idle();
  private processedCount = 0;
  private totalLeads = 0;
  private currentLead: Lead | null = null;
  private readonly pendingCalls = new Map<string, PendingCall>();
  private readonly businessHours = new BusinessHours();

  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly makeCallUseCase: MakeCallUseCase,
    private readonly callAnalysisRepository: CallAnalysisRepository,
    private readonly sendFollowUpEmailUseCase: SendFollowUpEmailUseCase | null,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async start(): Promise<void> {
    if (!this.state.canStart()) {
      throw new Error(ORCHESTRATOR_ERROR_MESSAGES.CANNOT_START);
    }

    this.state = this.state.toRunning();
    this.processedCount = 0;
    this.logger.info("[Orchestrator] Starting auto-call process");

    const leadsResult = await this.leadRepository.fetchAllLeads();

    if (!leadsResult.success) {
      this.logger.error({ error: leadsResult.error }, "[Orchestrator] Failed to fetch leads");
      this.state = OrchestratorState.create("stopped");
      return;
    }

    const callableLeads = leadsResult.data.filter(
      (lead) => lead.isCallable(MAX_RETRY_COUNT),
    );
    this.totalLeads = callableLeads.length;

    if (callableLeads.length === 0) {
      this.logger.info("[Orchestrator] No pending leads found");
      this.state = OrchestratorState.create("stopped");
      return;
    }

    this.logger.info(
      { totalLeads: this.totalLeads },
      "[Orchestrator] Found callable leads",
    );

    this.processLeads(callableLeads).catch((error) => {
      this.logger.error({ error }, "[Orchestrator] Unexpected error in processing loop");
      this.state = OrchestratorState.create("stopped");
    });
  }

  pause(): void {
    if (!this.state.canPause()) {
      throw new Error(ORCHESTRATOR_ERROR_MESSAGES.CANNOT_PAUSE);
    }
    this.state = this.state.toPaused();
    this.logger.info("[Orchestrator] Paused");
  }

  resume(): void {
    if (!this.state.canResume()) {
      throw new Error(ORCHESTRATOR_ERROR_MESSAGES.CANNOT_RESUME);
    }
    this.state = this.state.toRunning();
    this.logger.info("[Orchestrator] Resumed");
  }

  stop(): void {
    if (!this.state.canStop()) {
      throw new Error(ORCHESTRATOR_ERROR_MESSAGES.CANNOT_STOP);
    }
    this.state = this.state.toStopped();
    this.clearPendingCalls();
    this.currentLead = null;
    this.logger.info("[Orchestrator] Stopped");
  }

  getStatus(): OrchestratorStatusResponseDto {
    return {
      state: this.state.value,
      processedCount: this.processedCount,
      totalLeads: this.totalLeads,
      currentLead: this.currentLead
        ? {
            companyName: this.currentLead.companyName,
            contactName: this.currentLead.contactName,
            phoneNumber: this.currentLead.phoneNumber,
          }
        : null,
    };
  }

  notifyCallComplete(phoneNumber: string, transcript: string): boolean {
    const pending = this.pendingCalls.get(phoneNumber);
    if (!pending) {
      return false;
    }

    clearTimeout(pending.timeout);
    this.pendingCalls.delete(phoneNumber);
    pending.resolve({ answered: true, transcript });
    return true;
  }

  private async processLeads(callableLeads: Lead[]): Promise<void> {
    for (const lead of callableLeads) {
      if (!this.state.isRunning()) {
        const shouldContinue = await this.handleNonRunningState();
        if (!shouldContinue) {
          break;
        }
      }

      await this.waitForBusinessHours();

      if (!this.state.isRunning()) {
        const shouldContinue = await this.handleNonRunningState();
        if (!shouldContinue) {
          break;
        }
      }

      await this.processLead(lead);
      this.processedCount++;

      if (this.state.isRunning()) {
        await this.delay(INTER_CALL_DELAY_MS);
      }
    }

    this.currentLead = null;
    if (this.state.isRunning()) {
      this.state = OrchestratorState.create("stopped");
      this.logger.info(
        { processedCount: this.processedCount },
        "[Orchestrator] All leads processed",
      );
    }
  }

  private async processLead(lead: Lead): Promise<void> {
    this.currentLead = lead;
    this.logger.info(
      {
        companyName: lead.companyName,
        contactName: lead.contactName,
        phoneNumber: lead.phoneNumber,
        retryCount: lead.retryCount,
      },
      "[Orchestrator] Processing lead",
    );

    const callResult = await this.makeCallUseCase.execute({
      to: lead.phoneNumber,
    });

    if (!callResult.success) {
      this.logger.error(
        { error: callResult.error, phoneNumber: lead.phoneNumber },
        "[Orchestrator] Failed to initiate call",
      );
      await this.updateLeadAsNoAnswer(lead);
      return;
    }

    this.logger.info(
      { callSid: callResult.data.callSid, phoneNumber: lead.phoneNumber },
      "[Orchestrator] Call initiated, waiting for completion",
    );

    const completionEvent = await this.waitForCallComplete(lead.phoneNumber);
    await this.handleCallCompletion(lead, completionEvent);
  }

  private async handleCallCompletion(
    lead: Lead,
    event: CallCompletionEvent,
  ): Promise<void> {
    if (event.answered) {
      await this.handleAnsweredCall(lead, event.transcript);
    } else {
      await this.updateLeadAsNoAnswer(lead);
    }
  }

  private async handleAnsweredCall(
    lead: Lead,
    transcript: string,
  ): Promise<void> {
    const analysisResult = await this.callAnalysisRepository.analyze(transcript);

    if (!analysisResult.success) {
      this.logger.error(
        { error: analysisResult.error, phoneNumber: lead.phoneNumber },
        "[Orchestrator] Analysis failed",
      );
      return;
    }

    const updateData: LeadUpdateData = {
      status: LEAD_STATUS.COMPLETED,
      callResult: "応答",
      interestLevel: analysisResult.data.interestLevel.value,
      nextAction: analysisResult.data.nextAction,
      summary: analysisResult.data.summary,
      retryCount: lead.retryCount,
      lastCalledAt: new Date(),
    };

    const updateResult = await this.leadRepository.updateLeadResult(
      lead.rowIndex,
      updateData,
    );

    if (!updateResult.success) {
      this.logger.error(
        { error: updateResult.error, phoneNumber: lead.phoneNumber },
        "[Orchestrator] Failed to update lead",
      );
      return;
    }

    this.logger.info(
      {
        phoneNumber: lead.phoneNumber,
        interestLevel: analysisResult.data.interestLevel.value,
      },
      "[Orchestrator] Lead updated with analysis",
    );

    await this.sendFollowUpEmailIfNeeded(lead, analysisResult.data);
  }

  private async sendFollowUpEmailIfNeeded(
    lead: Lead,
    analysis: { summary: string; interestLevel: { value: number } },
  ): Promise<void> {
    if (!this.sendFollowUpEmailUseCase || !lead.email) {
      return;
    }

    const emailResult = await this.sendFollowUpEmailUseCase.execute({
      to: lead.email,
      companyName: lead.companyName,
      contactName: lead.contactName,
      summary: analysis.summary,
      interestLevel: analysis.interestLevel.value,
    });

    if (!emailResult.success) {
      this.logger.error(
        { error: emailResult.error, email: lead.email },
        "[Orchestrator] Failed to send follow-up email",
      );
    }
  }

  private async updateLeadAsNoAnswer(lead: Lead): Promise<void> {
    const newRetryCount = lead.retryCount + 1;

    const reachedLimit = newRetryCount >= MAX_RETRY_COUNT;

    const updateData: LeadUpdateData = {
      status: reachedLimit ? LEAD_STATUS.RETRY_LIMIT : LEAD_STATUS.PENDING,
      callResult: "不在",
      interestLevel: 0,
      nextAction: reachedLimit ? "リトライ上限到達" : "再架電",
      summary: "",
      retryCount: newRetryCount,
      lastCalledAt: new Date(),
    };

    const updateResult = await this.leadRepository.updateLeadResult(
      lead.rowIndex,
      updateData,
    );

    if (!updateResult.success) {
      this.logger.error(
        { error: updateResult.error, phoneNumber: lead.phoneNumber },
        "[Orchestrator] Failed to update lead as no-answer",
      );
      return;
    }

    this.logger.info(
      {
        phoneNumber: lead.phoneNumber,
        retryCount: newRetryCount,
        maxRetries: MAX_RETRY_COUNT,
      },
      "[Orchestrator] Lead marked as no-answer",
    );
  }

  private waitForCallComplete(phoneNumber: string): Promise<CallCompletionEvent> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingCalls.delete(phoneNumber);
        resolve({ answered: false, transcript: "" });
      }, CALL_TIMEOUT_MS);

      this.pendingCalls.set(phoneNumber, { resolve, timeout });
    });
  }

  private async handleNonRunningState(): Promise<boolean> {
    while (this.state.value === "paused") {
      await this.delay(PAUSE_CHECK_INTERVAL_MS);
    }
    return this.state.isRunning();
  }

  private async waitForBusinessHours(): Promise<void> {
    if (config.isBusinessHoursCheckSkipped()) {
      return;
    }

    while (!this.businessHours.isWithinBusinessHours() && this.state.isRunning()) {
      const waitMs = this.businessHours.getNextBusinessTimeMs();
      const cappedWaitMs = Math.min(waitMs, BUSINESS_HOURS_CHECK_INTERVAL_MS);
      this.logger.info(
        { waitMs: cappedWaitMs },
        "[Orchestrator] Waiting for business hours",
      );
      await this.delay(cappedWaitMs);
    }
  }

  private clearPendingCalls(): void {
    for (const [phoneNumber, pending] of this.pendingCalls) {
      clearTimeout(pending.timeout);
      pending.resolve({ answered: false, transcript: "" });
      this.pendingCalls.delete(phoneNumber);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
