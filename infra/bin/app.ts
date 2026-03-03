#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";

import { AppStack } from "../lib/app-stack";
import { ENVIRONMENTS } from "../config/environments";

const app = new cdk.App();

const envName = app.node.tryGetContext("env") as string || "dev";
const envConfig = ENVIRONMENTS[envName];

if (!envConfig) {
  throw new Error(`Unknown environment: ${envName}`);
}

const stack = new AppStack(app, `AiOutboundCalling-${envConfig.envName}`, {
  envConfig,
});

cdk.Tags.of(stack).add("Project", "ai-outbound-calling");
cdk.Tags.of(stack).add("Environment", envConfig.envName);
