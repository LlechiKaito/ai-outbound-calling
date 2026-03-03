import * as path from "node:path";

import * as cdk from "aws-cdk-lib";
import * as apprunner from "aws-cdk-lib/aws-apprunner";
import * as ecr_assets from "aws-cdk-lib/aws-ecr-assets";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

import { EnvironmentConfig } from "../../config/environments";

type KeyValuePair = apprunner.CfnService.KeyValuePairProperty;

const HEALTH_CHECK_PATH = "/health";

interface ComputeConstructProps {
  readonly envConfig: EnvironmentConfig;
}

export class ComputeConstruct extends Construct {
  public readonly serviceUrl: string;

  constructor(scope: Construct, id: string, props: ComputeConstructProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);
    const { envConfig } = props;
    const ssmPrefix = `/ai-outbound-calling/${envConfig.envName}`;

    const image = new ecr_assets.DockerImageAsset(this, "BackendImage", {
      directory: path.join(__dirname, "..", "..", ".."),
      file: "Dockerfile",
      target: "prod",
      platform: ecr_assets.Platform.LINUX_AMD64,
    });

    const accessRole = new iam.Role(this, "AccessRole", {
      assumedBy: new iam.ServicePrincipal("build.apprunner.amazonaws.com"),
    });
    image.repository.grantPull(accessRole);

    const instanceRole = new iam.Role(this, "InstanceRole", {
      assumedBy: new iam.ServicePrincipal("tasks.apprunner.amazonaws.com"),
    });
    instanceRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameters"],
        resources: [
          `arn:aws:ssm:${stack.region}:${stack.account}:parameter${ssmPrefix}/*`,
        ],
      }),
    );

    const envVars: KeyValuePair[] = [
      { name: "PORT", value: String(envConfig.backendPort) },
      { name: "HOST", value: "0.0.0.0" },
      { name: "SKIP_BUSINESS_HOURS_CHECK", value: "false" },
    ];

    const ssmSecrets = this.buildSsmSecrets(stack, ssmPrefix, envConfig);

    // L1 (CfnService) を使用: App Runner L2 は alpha のため
    const service = new apprunner.CfnService(this, "Service", {
      serviceName: `ai-outbound-calling-${envConfig.envName}`,
      sourceConfiguration: {
        imageRepository: {
          imageIdentifier: image.imageUri,
          imageRepositoryType: "ECR",
          imageConfiguration: {
            port: String(envConfig.backendPort),
            runtimeEnvironmentVariables: envVars,
            runtimeEnvironmentSecrets: ssmSecrets,
          },
        },
        authenticationConfiguration: {
          accessRoleArn: accessRole.roleArn,
        },
        autoDeploymentsEnabled: false,
      },
      instanceConfiguration: {
        cpu: envConfig.backendCpu,
        memory: envConfig.backendMemory,
        instanceRoleArn: instanceRole.roleArn,
      },
      healthCheckConfiguration: {
        protocol: "HTTP",
        path: HEALTH_CHECK_PATH,
      },
    });

    this.serviceUrl = cdk.Fn.join("", ["https://", service.attrServiceUrl]);

    new cdk.CfnOutput(stack, "BackendUrl", {
      value: this.serviceUrl,
      description: "App Runner service URL",
    });
  }

  private buildSsmSecrets(
    stack: cdk.Stack,
    ssmPrefix: string,
    envConfig: EnvironmentConfig,
  ): KeyValuePair[] {
    const toArn = (name: string): string =>
      `arn:aws:ssm:${stack.region}:${stack.account}:parameter${ssmPrefix}/${name}`;

    const secrets: KeyValuePair[] = [
      "PUBLIC_URL",
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_PHONE_NUMBER",
      "OPENAI_API_KEY",
      "CALL_COMPANY_NAME",
      "CALL_CONTACT_NAME",
    ].map((name) => ({ name, value: toArn(name) }));

    if (envConfig.enableGoogle) {
      secrets.push(
        ...["GOOGLE_SHEETS_ID", "GOOGLE_CREDENTIALS_JSON"].map((name) => ({
          name,
          value: toArn(name),
        })),
      );
    }

    if (envConfig.enableElevenLabs) {
      secrets.push(
        ...["ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID", "ELEVENLABS_LANGUAGE"].map(
          (name) => ({ name, value: toArn(name) }),
        ),
      );
    }

    if (envConfig.enableMail) {
      secrets.push(
        ...["MAIL_HOST", "MAIL_PORT", "MAIL_USER", "MAIL_PASSWORD", "MAIL_FROM"].map(
          (name) => ({ name, value: toArn(name) }),
        ),
      );
    }

    return secrets;
  }
}
