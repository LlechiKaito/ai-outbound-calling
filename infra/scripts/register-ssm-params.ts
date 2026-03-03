import * as fs from "node:fs";
import * as path from "node:path";

import { SSMClient, PutParameterCommand } from "@aws-sdk/client-ssm";

const SECURE_KEYS = new Set([
  "TWILIO_AUTH_TOKEN",
  "TWILIO_ACCOUNT_SID",
  "OPENAI_API_KEY",
  "GOOGLE_CREDENTIALS_JSON",
  "ELEVENLABS_API_KEY",
  "MAIL_PASSWORD",
]);

const SSM_PREFIX = "/ai-outbound-calling";
const FILE_PREFIX = "file://";

function resolveValue(value: string, baseDir: string): string {
  if (!value.startsWith(FILE_PREFIX)) {
    return value;
  }
  const filePath = path.resolve(baseDir, value.slice(FILE_PREFIX.length));
  return fs.readFileSync(filePath, "utf-8").trim();
}

async function main(): Promise<void> {
  const env = process.argv[2];
  const filePath = process.argv[3];

  if (!env || !filePath) {
    console.error("Usage: npx tsx scripts/register-ssm-params.ts <env> <params-json>");
    console.error("Example: npx tsx scripts/register-ssm-params.ts dev scripts/ssm-params.json");
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  const baseDir = path.dirname(absolutePath);
  const params: Record<string, string> = JSON.parse(
    fs.readFileSync(absolutePath, "utf-8"),
  );

  const client = new SSMClient({});
  const prefix = `${SSM_PREFIX}/${env}`;

  console.log(`Registering SSM parameters with prefix: ${prefix}`);
  console.log("---");

  const results = await Promise.allSettled(
    Object.entries(params).map(async ([key, rawValue]) => {
      const value = resolveValue(rawValue, baseDir);
      const type = SECURE_KEYS.has(key) ? "SecureString" : "String";

      await client.send(
        new PutParameterCommand({
          Name: `${prefix}/${key}`,
          Value: value,
          Type: type,
          Overwrite: true,
        }),
      );

      const source = rawValue.startsWith(FILE_PREFIX) ? `← ${rawValue}` : "";
      console.log(`  ${key} (${type}) ${source}`);
    }),
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    console.error("---");
    console.error(`${failed.length} parameter(s) failed:`);
    for (const f of failed) {
      console.error(`  ${(f as PromiseRejectedResult).reason}`);
    }
    process.exit(1);
  }

  console.log("---");
  console.log(`Done. ${results.length} parameters registered under ${prefix}/`);
}

main();
