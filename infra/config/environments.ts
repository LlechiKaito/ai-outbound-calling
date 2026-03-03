export interface EnvironmentConfig {
  readonly envName: string;
  readonly backendPort: number;
  readonly backendCpu: string;
  readonly backendMemory: string;
  readonly skipBusinessHoursCheck: boolean;

  // Feature flags
  readonly enableGoogle: boolean;
  readonly enableElevenLabs: boolean;
  readonly enableMail: boolean;

  // ElevenLabs (required when enableElevenLabs: true)
  readonly elevenLabsLanguage?: string;

  // Mail (required when enableMail: true)
  readonly mailHost?: string;
  readonly mailPort?: string;
}

export const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  dev: {
    envName: "dev",
    backendPort: 3000,
    backendCpu: "0.25 vCPU",
    backendMemory: "0.5 GB",
    skipBusinessHoursCheck: true,
    enableGoogle: true,
    enableElevenLabs: true,
    enableMail: true,
    elevenLabsLanguage: "ja",
    mailHost: "smtp.gmail.com",
    mailPort: "587",
  },
  prod: {
    envName: "prod",
    backendPort: 3000,
    backendCpu: "0.5 vCPU",
    backendMemory: "1 GB",
    skipBusinessHoursCheck: false,
    enableGoogle: true,
    enableElevenLabs: true,
    enableMail: true,
    elevenLabsLanguage: "ja",
    mailHost: "smtp.gmail.com",
    mailPort: "587",
  },
} as const;
