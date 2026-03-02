import { DomainError } from "@/domain/errors/domain-error.js";
import { ORCHESTRATOR_ERROR_MESSAGES } from "@/domain/errors/orchestrator-error-messages.js";

const VALID_STATES = ["idle", "running", "paused", "stopped"] as const;

export type OrchestratorStateValue = (typeof VALID_STATES)[number];

export class OrchestratorState {
  private constructor(readonly value: OrchestratorStateValue) {}

  static create(state: string): OrchestratorState {
    if (!VALID_STATES.includes(state as OrchestratorStateValue)) {
      throw new DomainError(ORCHESTRATOR_ERROR_MESSAGES.INVALID_ORCHESTRATOR_STATE);
    }
    return new OrchestratorState(state as OrchestratorStateValue);
  }

  static idle(): OrchestratorState {
    return new OrchestratorState("idle");
  }

  canStart(): boolean {
    return this.value === "idle" || this.value === "stopped";
  }

  canPause(): boolean {
    return this.value === "running";
  }

  canResume(): boolean {
    return this.value === "paused";
  }

  canStop(): boolean {
    return this.value === "running" || this.value === "paused";
  }

  isRunning(): boolean {
    return this.value === "running";
  }

  toRunning(): OrchestratorState {
    if (!this.canStart() && !this.canResume()) {
      throw new DomainError(ORCHESTRATOR_ERROR_MESSAGES.CANNOT_START);
    }
    return new OrchestratorState("running");
  }

  toPaused(): OrchestratorState {
    if (!this.canPause()) {
      throw new DomainError(ORCHESTRATOR_ERROR_MESSAGES.CANNOT_PAUSE);
    }
    return new OrchestratorState("paused");
  }

  toStopped(): OrchestratorState {
    if (!this.canStop()) {
      throw new DomainError(ORCHESTRATOR_ERROR_MESSAGES.CANNOT_STOP);
    }
    return new OrchestratorState("stopped");
  }
}
