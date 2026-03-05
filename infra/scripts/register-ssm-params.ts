import * as fs from "node:fs";
import * as path from "node:path";

import {
  SSMClient,
  PutParameterCommand,
  GetParametersByPathCommand,
  DeleteParametersCommand,
} from "@aws-sdk/client-ssm";

// NOTE: All parameters use String type because ECS Fargate task definition
// references them via ecs.Secret.fromSsmParameter (StringParameter).
// SecureString is not supported by CloudFormation for ECS task secrets.

const SSM_PREFIX = "/ai-outbound-calling";
const FILE_PREFIX = "file://";
const DELETE_BATCH_SIZE = 10;

function resolveValue(value: string, baseDir: string): string {
  if (!value.startsWith(FILE_PREFIX)) {
    return value;
  }
  const filePath = path.resolve(baseDir, value.slice(FILE_PREFIX.length));
  return fs.readFileSync(filePath, "utf-8").trim();
}

async function getExistingParams(
  client: SSMClient,
  prefix: string,
): Promise<string[]> {
  const names: string[] = [];
  let nextToken: string | undefined;

  do {
    const res = await client.send(
      new GetParametersByPathCommand({
        Path: prefix,
        NextToken: nextToken,
      }),
    );
    for (const p of res.Parameters ?? []) {
      if (p.Name) names.push(p.Name);
    }
    nextToken = res.NextToken;
  } while (nextToken);

  return names;
}

async function deleteParams(
  client: SSMClient,
  names: string[],
): Promise<void> {
  for (let i = 0; i < names.length; i += DELETE_BATCH_SIZE) {
    const batch = names.slice(i, i + DELETE_BATCH_SIZE);
    await client.send(new DeleteParametersCommand({ Names: batch }));
  }
}

async function main(): Promise<void> {
  const env = process.argv[2];
  const filePath = process.argv[3];

  if (!env || !filePath) {
    console.error(
      "Usage: npx tsx scripts/register-ssm-params.ts <env> <params-json>",
    );
    console.error(
      "Example: npx tsx scripts/register-ssm-params.ts dev scripts/ssm-params.json",
    );
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

  // 既存パラメータを取得
  const existing = await getExistingParams(client, `${prefix}/`);
  const desiredNames = new Set(
    Object.keys(params).map((key) => `${prefix}/${key}`),
  );

  // 不要なパラメータを削除
  const toDelete = existing.filter((name) => !desiredNames.has(name));
  if (toDelete.length > 0) {
    console.log("Deleting obsolete parameters:");
    for (const name of toDelete) {
      console.log(`  - ${name}`);
    }
    await deleteParams(client, toDelete);
    console.log("---");
  }

  // パラメータを登録・更新
  console.log(`Registering SSM parameters with prefix: ${prefix}`);
  console.log("---");

  const results = await Promise.allSettled(
    Object.entries(params).map(async ([key, rawValue]) => {
      const value = resolveValue(rawValue, baseDir);
      const type = "String";

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
  if (toDelete.length > 0) {
    console.log(`Deleted: ${toDelete.length} obsolete parameter(s)`);
  }
  console.log(
    `Registered: ${results.length} parameter(s) under ${prefix}/`,
  );
}

main();
