import * as path from "node:path";

import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

import { EnvironmentConfig } from "../../config/environments";

interface FrontendConstructProps {
  readonly envConfig: EnvironmentConfig;
  readonly backendDistributionUrl: string;
}

export class FrontendConstruct extends Construct {
  public readonly distributionUrl: string;

  constructor(scope: Construct, id: string, props: FrontendConstructProps) {
    super(scope, id);

    const stack = cdk.Stack.of(this);
    const { envConfig, backendDistributionUrl } = props;

    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy:
        envConfig.envName === "prod"
          ? cdk.RemovalPolicy.RETAIN
          : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: envConfig.envName !== "prod",
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
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
          `window.API_BASE_URL = '${backendDistributionUrl}';`,
        ),
      ],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ["/*"],
    });

    this.distributionUrl = `https://${distribution.distributionDomainName}`;

    new cdk.CfnOutput(stack, "FrontendUrl", {
      value: this.distributionUrl,
      description: "CloudFront distribution URL",
    });

    new cdk.CfnOutput(stack, "BucketName", {
      value: siteBucket.bucketName,
      description: "S3 bucket name",
    });
  }
}
