export interface EnvironmentConfig {
  readonly envName: string;
  readonly backendPort: number;
  readonly backendCpu: number;
  readonly backendMemory: number;
  readonly desiredCount: number;
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
    backendCpu: 256,
    backendMemory: 512,
    desiredCount: 1,
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
    backendCpu: 512,
    backendMemory: 1024,
    desiredCount: 1,
    skipBusinessHoursCheck: false,
    enableGoogle: true,
    enableElevenLabs: true,
    enableMail: true,
    elevenLabsLanguage: "ja",
    mailHost: "smtp.gmail.com",
    mailPort: "587",
  },
} as const;
