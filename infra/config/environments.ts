export interface EnvironmentConfig {
  readonly envName: string;
  readonly backendPort: number;
  readonly backendCpu: string;
  readonly backendMemory: string;
  readonly enableGoogle: boolean;
  readonly enableElevenLabs: boolean;
  readonly enableMail: boolean;
}

export const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  dev: {
    envName: "dev",
    backendPort: 3000,
    backendCpu: "0.25 vCPU",
    backendMemory: "0.5 GB",
    enableGoogle: true,
    enableElevenLabs: true,
    enableMail: true,
  },
  prod: {
    envName: "prod",
    backendPort: 3000,
    backendCpu: "0.5 vCPU",
    backendMemory: "1 GB",
    enableGoogle: true,
    enableElevenLabs: true,
    enableMail: true,
  },
} as const;
