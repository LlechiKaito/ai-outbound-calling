import { AutoCallOrchestratorUseCase } from "@/application/usecases/orchestrator/auto-call-orchestrator-usecase";
import type { LeadRepository } from "@/domain/repositories/orchestrator/lead-repository";
import type { CallAnalysisRepository } from "@/domain/repositories/analysis/call-analysis-repository";
import type { MakeCallUseCase } from "@/application/usecases/call/make-call-usecase";
import type { SendFollowUpEmailUseCase } from "@/application/usecases/follow-up-email/send-follow-up-email-usecase";
import { Lead } from "@/domain/entities/orchestrator/lead";
import { CallAnalysis } from "@/domain/entities/analysis/call-analysis";
import { InterestLevel } from "@/domain/value-objects/analysis/interest-level";
import { ok, fail } from "@/domain/commons/result";
import { ORCHESTRATOR_ERROR_MESSAGES } from "@/domain/errors/orchestrator-error-messages";
import { JST_OFFSET_MS } from "@/constants/orchestrator";
import type { FastifyBaseLogger } from "fastify";

const createMockLogger = (): jest.Mocked<FastifyBaseLogger> => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  fatal: jest.fn(),
  trace: jest.fn(),
  child: jest.fn().mockReturnThis(),
  silent: jest.fn(),
  level: "info",
}) as unknown as jest.Mocked<FastifyBaseLogger>;

function businessHoursDate(): Date {
  const utcMs = Date.UTC(2026, 2, 2, 10, 0) - JST_OFFSET_MS;
  return new Date(utcMs);
}

async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await jest.advanceTimersByTimeAsync(0);
  }
}

describe("AutoCallOrchestratorUseCase", () => {
  let mockLeadRepo: jest.Mocked<LeadRepository>;
  let mockMakeCallUseCase: jest.Mocked<Pick<MakeCallUseCase, "execute">>;
  let mockAnalysisRepo: jest.Mocked<CallAnalysisRepository>;
  let mockEmailUseCase: jest.Mocked<Pick<SendFollowUpEmailUseCase, "execute">>;
  let logger: jest.Mocked<FastifyBaseLogger>;

  const lead1 = new Lead(2, "テスト株式会社", "山田太郎", "+819012345678", "yamada@example.com", "", 0);
  const lead2 = new Lead(3, "サンプル株式会社", "佐藤花子", "+819087654321", "", "未対応", 0);

  beforeEach(() => {
    jest.useFakeTimers({ now: businessHoursDate() });
    mockLeadRepo = {
      fetchAllLeads: jest.fn(),
      updateLeadResult: jest.fn(),
      addLead: jest.fn(),
    editLead: jest.fn(),
    };
    mockMakeCallUseCase = { execute: jest.fn() };
    mockAnalysisRepo = { analyze: jest.fn() };
    mockEmailUseCase = { execute: jest.fn() };
    logger = createMockLogger();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createOrchestrator(
    withEmail: boolean = false,
  ): AutoCallOrchestratorUseCase {
    return new AutoCallOrchestratorUseCase(
      mockLeadRepo,
      mockMakeCallUseCase as unknown as MakeCallUseCase,
      mockAnalysisRepo,
      withEmail ? (mockEmailUseCase as unknown as SendFollowUpEmailUseCase) : null,
      logger,
    );
  }

  describe("getStatus", () => {
    it("should return idle state initially", () => {
      const orchestrator = createOrchestrator();
      const status = orchestrator.getStatus();

      expect(status.state).toBe("idle");
      expect(status.processedCount).toBe(0);
      expect(status.totalLeads).toBe(0);
      expect(status.currentLead).toBeNull();
    });
  });

  describe("start", () => {
    it("should throw when already running", async () => {
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead1]));
      mockMakeCallUseCase.execute.mockResolvedValue(
        ok({ callSid: "CA123", to: "+819012345678", from: "+14155551234", status: "queued" }),
      );

      const orchestrator = createOrchestrator();
      await orchestrator.start();

      await expect(orchestrator.start()).rejects.toThrow(
        ORCHESTRATOR_ERROR_MESSAGES.CANNOT_START,
      );

      orchestrator.stop();
    });

    it("should stop when no pending leads found", async () => {
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([]));

      const orchestrator = createOrchestrator();
      await orchestrator.start();

      await flush();

      expect(orchestrator.getStatus().state).toBe("stopped");
    });

    it("should stop when fetch leads fails", async () => {
      mockLeadRepo.fetchAllLeads.mockResolvedValue(
        fail(new Error("Sheets API error")),
      );

      const orchestrator = createOrchestrator();
      await orchestrator.start();

      await flush();

      expect(orchestrator.getStatus().state).toBe("stopped");
    });

    it("should filter out non-callable leads", async () => {
      const completedLead = new Lead(4, "完了会社", "名前", "+819011111111", "", "完了", 0);
      const maxRetryLead = new Lead(5, "リトライ上限", "名前", "+819022222222", "", "", 3);

      mockLeadRepo.fetchAllLeads.mockResolvedValue(
        ok([completedLead, maxRetryLead]),
      );

      const orchestrator = createOrchestrator();
      await orchestrator.start();

      await flush();

      expect(orchestrator.getStatus().state).toBe("stopped");
      expect(orchestrator.getStatus().totalLeads).toBe(0);
    });

    it("should set totalLeads before returning from start", async () => {
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead1, lead2]));
      mockMakeCallUseCase.execute.mockResolvedValue(
        ok({ callSid: "CA123", to: "+819012345678", from: "+14155551234", status: "queued" }),
      );

      const orchestrator = createOrchestrator();
      await orchestrator.start();

      const status = orchestrator.getStatus();
      expect(status.totalLeads).toBe(2);
      expect(status.state).toBe("running");

      orchestrator.stop();
    });
  });

  describe("pause", () => {
    it("should throw when not running", () => {
      const orchestrator = createOrchestrator();

      expect(() => orchestrator.pause()).toThrow(
        ORCHESTRATOR_ERROR_MESSAGES.CANNOT_PAUSE,
      );
    });

    it("should pause when running", async () => {
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead1]));
      mockMakeCallUseCase.execute.mockResolvedValue(
        ok({ callSid: "CA123", to: "+819012345678", from: "+14155551234", status: "queued" }),
      );

      const orchestrator = createOrchestrator();
      await orchestrator.start();

      orchestrator.pause();
      expect(orchestrator.getStatus().state).toBe("paused");

      orchestrator.stop();
    });
  });

  describe("resume", () => {
    it("should throw when not paused", () => {
      const orchestrator = createOrchestrator();

      expect(() => orchestrator.resume()).toThrow(
        ORCHESTRATOR_ERROR_MESSAGES.CANNOT_RESUME,
      );
    });

    it("should resume when paused", async () => {
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead1]));
      mockMakeCallUseCase.execute.mockResolvedValue(
        ok({ callSid: "CA123", to: "+819012345678", from: "+14155551234", status: "queued" }),
      );

      const orchestrator = createOrchestrator();
      await orchestrator.start();

      orchestrator.pause();
      orchestrator.resume();
      expect(orchestrator.getStatus().state).toBe("running");

      orchestrator.stop();
    });
  });

  describe("stop", () => {
    it("should throw when idle", () => {
      const orchestrator = createOrchestrator();

      expect(() => orchestrator.stop()).toThrow(
        ORCHESTRATOR_ERROR_MESSAGES.CANNOT_STOP,
      );
    });
  });

  describe("notifyCallComplete", () => {
    it("should return false when no pending call for phone number", () => {
      const orchestrator = createOrchestrator();
      const result = orchestrator.notifyCallComplete("+819012345678", "transcript");
      expect(result).toBe(false);
    });

    it("should return true and resolve pending call", async () => {
      const analysis = new CallAnalysis(
        InterestLevel.create(4),
        "前向きな反応",
        "デモを調整する",
      );
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead1]));
      mockMakeCallUseCase.execute.mockResolvedValue(
        ok({ callSid: "CA123", to: "+819012345678", from: "+14155551234", status: "queued" }),
      );
      mockAnalysisRepo.analyze.mockResolvedValue(ok(analysis));
      mockLeadRepo.updateLeadResult.mockResolvedValue(ok(undefined));

      const orchestrator = createOrchestrator();
      await orchestrator.start();

      await flush();

      const result = orchestrator.notifyCallComplete("+819012345678", "transcript text");
      expect(result).toBe(true);

      await flush();

      expect(mockAnalysisRepo.analyze).toHaveBeenCalledWith("transcript text");
    });
  });

  describe("call processing", () => {
    it("should update lead as no-answer on call timeout", async () => {
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead1]));
      mockMakeCallUseCase.execute.mockResolvedValue(
        ok({ callSid: "CA123", to: "+819012345678", from: "+14155551234", status: "queued" }),
      );
      mockLeadRepo.updateLeadResult.mockResolvedValue(ok(undefined));

      const orchestrator = createOrchestrator();
      await orchestrator.start();

      await flush();

      await jest.advanceTimersByTimeAsync(120_000);

      await flush();

      expect(mockLeadRepo.updateLeadResult).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          status: "未対応",
          callResult: "不在",
          retryCount: 1,
        }),
      );
    }, 15000);

    it("should update lead as no-answer when call initiation fails", async () => {
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead1]));
      mockMakeCallUseCase.execute.mockResolvedValue(
        fail(new Error("Twilio error")),
      );
      mockLeadRepo.updateLeadResult.mockResolvedValue(ok(undefined));

      const orchestrator = createOrchestrator();
      await orchestrator.start();

      await flush();

      expect(mockLeadRepo.updateLeadResult).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          status: "未対応",
          callResult: "不在",
          retryCount: 1,
        }),
      );
    });

    it("should send follow-up email when email is configured and lead has email", async () => {
      const analysis = new CallAnalysis(
        InterestLevel.create(4),
        "前向きな反応",
        "デモを調整する",
      );
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead1]));
      mockMakeCallUseCase.execute.mockResolvedValue(
        ok({ callSid: "CA123", to: "+819012345678", from: "+14155551234", status: "queued" }),
      );
      mockAnalysisRepo.analyze.mockResolvedValue(ok(analysis));
      mockLeadRepo.updateLeadResult.mockResolvedValue(ok(undefined));
      mockEmailUseCase.execute.mockResolvedValue(ok(undefined));

      const orchestrator = createOrchestrator(true);
      await orchestrator.start();

      await flush();

      orchestrator.notifyCallComplete("+819012345678", "transcript");

      await flush();

      expect(mockEmailUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "yamada@example.com",
          companyName: "テスト株式会社",
          contactName: "山田太郎",
        }),
      );
    });

    it("should skip follow-up email when lead has no email", async () => {
      const analysis = new CallAnalysis(
        InterestLevel.create(3),
        "中立的",
        "資料送付",
      );
      mockLeadRepo.fetchAllLeads.mockResolvedValue(ok([lead2]));
      mockMakeCallUseCase.execute.mockResolvedValue(
        ok({ callSid: "CA456", to: "+819087654321", from: "+14155551234", status: "queued" }),
      );
      mockAnalysisRepo.analyze.mockResolvedValue(ok(analysis));
      mockLeadRepo.updateLeadResult.mockResolvedValue(ok(undefined));

      const orchestrator = createOrchestrator(true);
      await orchestrator.start();

      await flush();

      orchestrator.notifyCallComplete("+819087654321", "transcript");

      await flush();

      expect(mockEmailUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
