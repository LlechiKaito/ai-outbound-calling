import dotenv from "dotenv";

import { CONFIG_ERROR_MESSAGES } from "@/constants/config.js";

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(CONFIG_ERROR_MESSAGES.ENV_NOT_SET(key));
  }
  return value;
}

function hasEnv(key: string): boolean {
  return !!process.env[key];
}

function lazy<T>(factory: () => T): () => T {
  let cached: T | undefined;
  return () => {
    if (cached === undefined) {
      cached = factory();
    }
    return cached;
  };
}

export const config = {
  server: {
    port: Number(requireEnv("PORT")),
    host: requireEnv("HOST"),
    publicUrl: requireEnv("PUBLIC_URL"),
  },
  get twilio() {
    return lazy(() => ({
      accountSid: requireEnv("TWILIO_ACCOUNT_SID"),
      authToken: requireEnv("TWILIO_AUTH_TOKEN"),
      phoneNumber: requireEnv("TWILIO_PHONE_NUMBER"),
    }))();
  },
  get google() {
    return lazy(() => ({
      credentialsPath: process.env["GOOGLE_CREDENTIALS_PATH"],
      credentialsJson: process.env["GOOGLE_CREDENTIALS_JSON"],
      sheetsId: requireEnv("GOOGLE_SHEETS_ID"),
    }))();
  },
  get openai() {
    return lazy(() => ({
      apiKey: requireEnv("OPENAI_API_KEY"),
    }))();
  },
  get call() {
    return lazy(() => ({
      companyName: requireEnv("CALL_COMPANY_NAME"),
      contactName: requireEnv("CALL_CONTACT_NAME"),
    }))();
  },
  get elevenlabs() {
    return lazy(() => ({
      apiKey: requireEnv("ELEVENLABS_API_KEY"),
      agentId: requireEnv("ELEVENLABS_AGENT_ID"),
      language: requireEnv("ELEVENLABS_LANGUAGE"),
    }))();
  },
  isElevenLabsConfigured(): boolean {
    return hasEnv("ELEVENLABS_API_KEY") && hasEnv("ELEVENLABS_AGENT_ID");
  },
  isGoogleConfigured(): boolean {
    return (hasEnv("GOOGLE_CREDENTIALS_PATH") || hasEnv("GOOGLE_CREDENTIALS_JSON")) && hasEnv("GOOGLE_SHEETS_ID");
  },
  isMailConfigured(): boolean {
    return hasEnv("MAIL_HOST") && hasEnv("MAIL_USER") && hasEnv("MAIL_PASSWORD");
  },
  isBusinessHoursCheckSkipped(): boolean {
    return process.env["SKIP_BUSINESS_HOURS_CHECK"] === "true";
  },
  get mail() {
    return lazy(() => ({
      host: requireEnv("MAIL_HOST"),
      port: Number(requireEnv("MAIL_PORT")),
      user: requireEnv("MAIL_USER"),
      password: requireEnv("MAIL_PASSWORD"),
      from: requireEnv("MAIL_FROM"),
    }))();
  },
};
