import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import { EnvironmentConfig } from "../config/environments";
import { ComputeConstruct } from "./compute/compute";
import { FrontendConstruct } from "./frontend/frontend";

interface AppStackProps extends cdk.StackProps {
  readonly envConfig: EnvironmentConfig;
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const compute = new ComputeConstruct(this, "Compute", {
      envConfig: props.envConfig,
    });

    new FrontendConstruct(this, "Frontend", {
      envConfig: props.envConfig,
      backendUrl: compute.serviceUrl,
      alb: compute.alb,
    });
  }
}
