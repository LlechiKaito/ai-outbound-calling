import * as path from "node:path";

import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr_assets from "aws-cdk-lib/aws-ecr-assets";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

import { EnvironmentConfig } from "../../config/environments";
import { buildEnvVars, buildSsmSecrets } from "./env-builder";
import {
  ALB_PORT,
  CONTAINER_NAME,
  HEALTHY_THRESHOLD_COUNT,
  HEALTH_CHECK_INTERVAL_SECONDS,
  HEALTH_CHECK_PATH,
  HEALTH_CHECK_RETRIES,
  HEALTH_CHECK_START_PERIOD_SECONDS,
  HEALTH_CHECK_TIMEOUT_SECONDS,
  MAX_AZS,
  MAX_HEALTHY_PERCENT,
  MIN_HEALTHY_PERCENT,
  SUBNET_CIDR_MASK,
  UNHEALTHY_THRESHOLD_COUNT,
} from "./constants";

interface ComputeConstructProps {
  readonly envConfig: EnvironmentConfig;
}

export class ComputeConstruct extends Construct {
  public readonly serviceUrl: string;
  public readonly alb: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: ComputeConstructProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);
    const { envConfig } = props;
    const ssmPrefix = `/ai-outbound-calling/${envConfig.envName}`;

    const vpc = this.createVpc();
    const cluster = this.createCluster(envConfig, vpc);
    const image = this.createDockerImage();
    const taskDefinition = this.createTaskDefinition(
      stack,
      envConfig,
      ssmPrefix,
      image,
    );
    const { service, alb } = this.createService(
      envConfig,
      cluster,
      taskDefinition,
      vpc,
    );

    const albUrl = `http://${alb.loadBalancerDnsName}`;
    this.serviceUrl = albUrl;
    this.alb = alb;

    taskDefinition
      .findContainer(CONTAINER_NAME)
      ?.addEnvironment("PUBLIC_URL", albUrl);

    new cdk.CfnOutput(stack, "BackendUrl", {
      value: albUrl,
      description: "ALB URL for backend service",
    });
  }

  private createVpc(): ec2.Vpc {
    return new ec2.Vpc(this, "Vpc", {
      maxAzs: MAX_AZS,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: SUBNET_CIDR_MASK,
        },
      ],
    });
  }

  private createCluster(
    envConfig: EnvironmentConfig,
    vpc: ec2.Vpc,
  ): ecs.Cluster {
    return new ecs.Cluster(this, "Cluster", {
      clusterName: `ai-outbound-calling-${envConfig.envName}`,
      vpc,
      containerInsightsV2:
        envConfig.envName === "prod"
          ? ecs.ContainerInsights.ENABLED
          : ecs.ContainerInsights.DISABLED,
    });
  }

  private createDockerImage(): ecr_assets.DockerImageAsset {
    return new ecr_assets.DockerImageAsset(this, "BackendImage", {
      directory: path.join(__dirname, "..", "..", ".."),
      file: "Dockerfile",
      target: "prod",
      platform: ecr_assets.Platform.LINUX_AMD64,
    });
  }

  private createTaskDefinition(
    stack: cdk.Stack,
    envConfig: EnvironmentConfig,
    ssmPrefix: string,
    image: ecr_assets.DockerImageAsset,
  ): ecs.FargateTaskDefinition {
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "TaskDefinition",
      {
        cpu: envConfig.backendCpu,
        memoryLimitMiB: envConfig.backendMemory,
      },
    );

    this.grantSsmAccess(taskDefinition, stack, ssmPrefix);

    const logGroup = this.createLogGroup(envConfig);
    const envVars = buildEnvVars(envConfig);
    const ssmSecrets = buildSsmSecrets(this, stack, ssmPrefix, envConfig);

    this.addContainer(taskDefinition, envConfig, image, logGroup, envVars, ssmSecrets);

    return taskDefinition;
  }

  private grantSsmAccess(
    taskDefinition: ecs.FargateTaskDefinition,
    stack: cdk.Stack,
    ssmPrefix: string,
  ): void {
    taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameters"],
        resources: [
          `arn:aws:ssm:${stack.region}:${stack.account}:parameter${ssmPrefix}/*`,
        ],
      }),
    );
  }

  private createLogGroup(envConfig: EnvironmentConfig): logs.LogGroup {
    return new logs.LogGroup(this, "LogGroup", {
      logGroupName: `/ecs/ai-outbound-calling-${envConfig.envName}`,
      retention:
        envConfig.envName === "prod"
          ? logs.RetentionDays.ONE_MONTH
          : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }

  private addContainer(
    taskDefinition: ecs.FargateTaskDefinition,
    envConfig: EnvironmentConfig,
    image: ecr_assets.DockerImageAsset,
    logGroup: logs.LogGroup,
    envVars: Record<string, string>,
    ssmSecrets: Record<string, ecs.Secret>,
  ): void {
    taskDefinition.addContainer(CONTAINER_NAME, {
      image: ecs.ContainerImage.fromDockerImageAsset(image),
      portMappings: [
        {
          containerPort: envConfig.backendPort,
          protocol: ecs.Protocol.TCP,
        },
      ],
      environment: envVars,
      secrets: ssmSecrets,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "backend",
        logGroup,
      }),
      healthCheck: {
        command: [
          "CMD-SHELL",
          `node -e "const http = require('http'); const req = http.get('http://localhost:${envConfig.backendPort}${HEALTH_CHECK_PATH}', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1));"`,
        ],
        interval: cdk.Duration.seconds(HEALTH_CHECK_INTERVAL_SECONDS),
        timeout: cdk.Duration.seconds(HEALTH_CHECK_TIMEOUT_SECONDS),
        retries: HEALTH_CHECK_RETRIES,
        startPeriod: cdk.Duration.seconds(HEALTH_CHECK_START_PERIOD_SECONDS),
      },
    });
  }

  private createSecurityGroups(
    vpc: ec2.Vpc,
    backendPort: number,
  ): { albSg: ec2.SecurityGroup; serviceSg: ec2.SecurityGroup } {
    const albSg = new ec2.SecurityGroup(this, "AlbSg", {
      vpc,
      description: "Security group for ALB",
      allowAllOutbound: true,
    });
    albSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(ALB_PORT),
      "Allow HTTP from internet",
    );

    const serviceSg = new ec2.SecurityGroup(this, "ServiceSg", {
      vpc,
      description: "Security group for ECS Fargate service",
      allowAllOutbound: true,
    });
    serviceSg.addIngressRule(
      albSg,
      ec2.Port.tcp(backendPort),
      "Allow traffic from ALB only",
    );

    return { albSg, serviceSg };
  }

  private createAlb(
    vpc: ec2.Vpc,
    albSg: ec2.SecurityGroup,
    backendPort: number,
  ): { alb: elbv2.ApplicationLoadBalancer; targetGroup: elbv2.ApplicationTargetGroup } {
    const alb = new elbv2.ApplicationLoadBalancer(this, "Alb", {
      vpc,
      internetFacing: true,
      securityGroup: albSg,
    });

    const targetGroup = new elbv2.ApplicationTargetGroup(this, "TargetGroup", {
      vpc,
      port: backendPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: HEALTH_CHECK_PATH,
        interval: cdk.Duration.seconds(HEALTH_CHECK_INTERVAL_SECONDS),
        timeout: cdk.Duration.seconds(HEALTH_CHECK_TIMEOUT_SECONDS),
        healthyThresholdCount: HEALTHY_THRESHOLD_COUNT,
        unhealthyThresholdCount: UNHEALTHY_THRESHOLD_COUNT,
      },
    });

    alb.addListener("HttpListener", {
      port: ALB_PORT,
      defaultTargetGroups: [targetGroup],
    });

    return { alb, targetGroup };
  }

  private createService(
    envConfig: EnvironmentConfig,
    cluster: ecs.Cluster,
    taskDefinition: ecs.FargateTaskDefinition,
    vpc: ec2.Vpc,
  ): { service: ecs.FargateService; alb: elbv2.ApplicationLoadBalancer } {
    const { albSg, serviceSg } = this.createSecurityGroups(
      vpc,
      envConfig.backendPort,
    );

    const { alb, targetGroup } = this.createAlb(
      vpc,
      albSg,
      envConfig.backendPort,
    );

    const service = new ecs.FargateService(this, "Service", {
      serviceName: `ai-outbound-calling-${envConfig.envName}`,
      cluster,
      taskDefinition,
      desiredCount: envConfig.desiredCount,
      minHealthyPercent: MIN_HEALTHY_PERCENT,
      maxHealthyPercent: MAX_HEALTHY_PERCENT,
      securityGroups: [serviceSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      assignPublicIp: true,
    });

    service.attachToApplicationTargetGroup(targetGroup);

    return { service, alb };
  }

}
