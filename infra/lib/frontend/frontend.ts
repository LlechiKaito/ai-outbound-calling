import * as path from "node:path";

import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

import { EnvironmentConfig } from "../../config/environments";

interface FrontendConstructProps {
  readonly envConfig: EnvironmentConfig;
  readonly backendUrl: string;
  readonly alb: elbv2.ApplicationLoadBalancer;
}

export class FrontendConstruct extends Construct {
  constructor(scope: Construct, id: string, props: FrontendConstructProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);
    const { envConfig, backendUrl, alb } = props;

    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy:
        envConfig.envName === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: envConfig.envName !== "prod",
    });

    const albOrigin = new origins.HttpOrigin(alb.loadBalancerDnsName, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        "/api/*": {
          origin: albOrigin,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
      },
      defaultRootObject: "dashboard.html",
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/dashboard.html",
        },
      ],
    });

    new s3deploy.BucketDeployment(this, "DeploySite", {
      sources: [
        s3deploy.Source.asset(
          path.join(__dirname, "..", "..", "..", "frontend", "public"),
          { exclude: ["js/config.js"] },
        ),
        s3deploy.Source.data(
          "js/config.js",
          "window.API_BASE_URL = '';",
        ),
      ],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
    });

    new cdk.CfnOutput(stack, "FrontendUrl", {
      value: `https://${distribution.distributionDomainName}`,
      description: "CloudFront distribution URL",
    });

    new cdk.CfnOutput(stack, "BucketName", {
      value: siteBucket.bucketName,
      description: "S3 bucket name",
    });
  }
}
