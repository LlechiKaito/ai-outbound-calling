import { OrchestratorState } from "@/domain/value-objects/orchestrator/orchestrator-state";
import { DomainError } from "@/domain/errors/domain-error";

describe("OrchestratorState", () => {
  describe("create", () => {
    it("should create state with valid value", () => {
      const state = OrchestratorState.create("idle");
      expect(state.value).toBe("idle");
    });

    it("should throw DomainError for invalid value", () => {
      expect(() => OrchestratorState.create("invalid")).toThrow(DomainError);
    });
  });

  describe("idle", () => {
    it("should create idle state", () => {
      const state = OrchestratorState.idle();
      expect(state.value).toBe("idle");
    });
  });

  describe("canStart", () => {
    it("should return true from idle", () => {
      expect(OrchestratorState.create("idle").canStart()).toBe(true);
    });

    it("should return true from stopped", () => {
      expect(OrchestratorState.create("stopped").canStart()).toBe(true);
    });

    it("should return false from running", () => {
      expect(OrchestratorState.create("running").canStart()).toBe(false);
    });

    it("should return false from paused", () => {
      expect(OrchestratorState.create("paused").canStart()).toBe(false);
    });
  });

  describe("canPause", () => {
    it("should return true from running", () => {
      expect(OrchestratorState.create("running").canPause()).toBe(true);
    });

    it("should return false from idle", () => {
      expect(OrchestratorState.create("idle").canPause()).toBe(false);
    });
  });

  describe("canResume", () => {
    it("should return true from paused", () => {
      expect(OrchestratorState.create("paused").canResume()).toBe(true);
    });

    it("should return false from running", () => {
      expect(OrchestratorState.create("running").canResume()).toBe(false);
    });
  });

  describe("canStop", () => {
    it("should return true from running", () => {
      expect(OrchestratorState.create("running").canStop()).toBe(true);
    });

    it("should return true from paused", () => {
      expect(OrchestratorState.create("paused").canStop()).toBe(true);
    });

    it("should return false from idle", () => {
      expect(OrchestratorState.create("idle").canStop()).toBe(false);
    });
  });

  describe("toRunning", () => {
    it("should transition from idle to running", () => {
      const state = OrchestratorState.idle().toRunning();
      expect(state.value).toBe("running");
    });

    it("should transition from paused to running", () => {
      const running = OrchestratorState.idle().toRunning();
      const paused = running.toPaused();
      const resumed = paused.toRunning();
      expect(resumed.value).toBe("running");
    });

    it("should throw from running", () => {
      const running = OrchestratorState.idle().toRunning();
      expect(() => running.toRunning()).toThrow(DomainError);
    });
  });

  describe("toPaused", () => {
    it("should transition from running to paused", () => {
      const running = OrchestratorState.idle().toRunning();
      const paused = running.toPaused();
      expect(paused.value).toBe("paused");
    });

    it("should throw from idle", () => {
      expect(() => OrchestratorState.idle().toPaused()).toThrow(DomainError);
    });
  });

  describe("toStopped", () => {
    it("should transition from running to stopped", () => {
      const running = OrchestratorState.idle().toRunning();
      const stopped = running.toStopped();
      expect(stopped.value).toBe("stopped");
    });

    it("should transition from paused to stopped", () => {
      const running = OrchestratorState.idle().toRunning();
      const paused = running.toPaused();
      const stopped = paused.toStopped();
      expect(stopped.value).toBe("stopped");
    });

    it("should throw from idle", () => {
      expect(() => OrchestratorState.idle().toStopped()).toThrow(DomainError);
    });
  });

  describe("isRunning", () => {
    it("should return true for running state", () => {
      expect(OrchestratorState.create("running").isRunning()).toBe(true);
    });

    it("should return false for non-running state", () => {
      expect(OrchestratorState.idle().isRunning()).toBe(false);
    });
  });
});
