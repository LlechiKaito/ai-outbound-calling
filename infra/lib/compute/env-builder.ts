import * as cdk from "aws-cdk-lib";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

import { EnvironmentConfig } from "../../config/environments";

export function buildEnvVars(
  envConfig: EnvironmentConfig,
): Record<string, string> {
  const vars: Record<string, string> = {
    PORT: String(envConfig.backendPort),
    HOST: "0.0.0.0",
    SKIP_BUSINESS_HOURS_CHECK: String(envConfig.skipBusinessHoursCheck),
  };

  if (envConfig.enableElevenLabs && envConfig.elevenLabsLanguage) {
    vars.ELEVENLABS_LANGUAGE = envConfig.elevenLabsLanguage;
  }

  if (envConfig.enableMail) {
    if (envConfig.mailHost) {
      vars.MAIL_HOST = envConfig.mailHost;
    }
    if (envConfig.mailPort) {
      vars.MAIL_PORT = envConfig.mailPort;
    }
  }

  return vars;
}

export function buildSsmSecrets(
  scope: Construct,
  stack: cdk.Stack,
  ssmPrefix: string,
  envConfig: EnvironmentConfig,
): Record<string, ecs.Secret> {
  const fromSsm = (name: string): ecs.Secret =>
    ecs.Secret.fromSsmParameter(
      ssm.StringParameter.fromStringParameterName(
        scope,
        `Ssm${name}`,
        `${ssmPrefix}/${name}`,
      ),
    );

  const secrets: Record<string, ecs.Secret> = {
    PUBLIC_URL: fromSsm("PUBLIC_URL"),
    TWILIO_ACCOUNT_SID: fromSsm("TWILIO_ACCOUNT_SID"),
    TWILIO_AUTH_TOKEN: fromSsm("TWILIO_AUTH_TOKEN"),
    TWILIO_PHONE_NUMBER: fromSsm("TWILIO_PHONE_NUMBER"),
    OPENAI_API_KEY: fromSsm("OPENAI_API_KEY"),
    CALL_COMPANY_NAME: fromSsm("CALL_COMPANY_NAME"),
    CALL_CONTACT_NAME: fromSsm("CALL_CONTACT_NAME"),
  };

  if (envConfig.enableGoogle) {
    secrets.GOOGLE_SHEETS_ID = fromSsm("GOOGLE_SHEETS_ID");
    secrets.GOOGLE_CREDENTIALS_JSON = fromSsm("GOOGLE_CREDENTIALS_JSON");
  }

  if (envConfig.enableElevenLabs) {
    secrets.ELEVENLABS_API_KEY = fromSsm("ELEVENLABS_API_KEY");
    secrets.ELEVENLABS_AGENT_ID = fromSsm("ELEVENLABS_AGENT_ID");
  }

  if (envConfig.enableMail) {
    secrets.MAIL_PASSWORD = fromSsm("MAIL_PASSWORD");
    secrets.MAIL_USER = fromSsm("MAIL_USER");
    secrets.MAIL_FROM = fromSsm("MAIL_FROM");
  }

  return secrets;
}
