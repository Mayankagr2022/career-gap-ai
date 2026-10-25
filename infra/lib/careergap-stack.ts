import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { CareerGapConfig } from './config';

export interface CareerGapStackProps extends cdk.StackProps {
  config: CareerGapConfig;
}

const API_PORT = 3001;
const WEB_PORT = 3000;
const DB_NAME = 'careergap';
const DB_USER = 'careergap';
/** Characters that would need URL-encoding if they ended up in the generated database password. */
const PASSWORD_EXCLUDED = ' %+~`#$&*()|[]{}:;<>?!\'/@"\\=,.-_^';

/** Keys of the secret that people fill in after the first deploy. Left empty, the matching feature is simply off. */
const PROVIDER_SECRET_KEYS = [
  'NVIDIA_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',
] as const;

export class CareerGapStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CareerGapStackProps) {
    super(scope, id, props);
    const { config } = props;
    const keep = config.production ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    // ------------------------------------------------------------------ network
    const vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.20.0.0/16'),
      maxAzs: 2,
      natGateways: config.natGateways,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'app', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
        { name: 'data', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });
    // Resume uploads go to S3 without passing through (and being billed by) the NAT gateway
    vpc.addGatewayEndpoint('S3Endpoint', { service: ec2.GatewayVpcEndpointAwsService.S3 });

    const albSg = new ec2.SecurityGroup(this, 'AlbSg', {
      vpc,
      description: 'Public load balancer',
    });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP, redirected to HTTPS');
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS');

    const apiSg = new ec2.SecurityGroup(this, 'ApiSg', { vpc, description: 'API tasks' });
    const webSg = new ec2.SecurityGroup(this, 'WebSg', { vpc, description: 'Web tasks' });
    apiSg.addIngressRule(albSg, ec2.Port.tcp(API_PORT), 'From the load balancer');
    webSg.addIngressRule(albSg, ec2.Port.tcp(WEB_PORT), 'From the load balancer');

    // ------------------------------------------------------------------ database (PostgreSQL with pgvector)
    const dbSg = new ec2.SecurityGroup(this, 'DbSg', { vpc, description: 'PostgreSQL', allowAllOutbound: false });
    dbSg.addIngressRule(apiSg, ec2.Port.tcp(5432), 'From the API tasks');

    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, config.production ? ec2.InstanceSize.SMALL : ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSg],
      databaseName: DB_NAME,
      credentials: rds.Credentials.fromGeneratedSecret(DB_USER, { excludeCharacters: PASSWORD_EXCLUDED }),
      allocatedStorage: 20,
      maxAllocatedStorage: 200,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      multiAz: config.production,
      backupRetention: cdk.Duration.days(config.production ? 14 : 3),
      deletionProtection: config.production,
      removalPolicy: config.production ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.SNAPSHOT,
      cloudwatchLogsExports: ['postgresql'],
      autoMinorVersionUpgrade: true,
      publiclyAccessible: false,
    });

    // ------------------------------------------------------------------ Redis (job queues)
    const redisSg = new ec2.SecurityGroup(this, 'RedisSg', { vpc, description: 'Redis', allowAllOutbound: false });
    redisSg.addIngressRule(apiSg, ec2.Port.tcp(6379), 'From the API tasks');

    const redisSubnets = new elasticache.CfnSubnetGroup(this, 'RedisSubnets', {
      description: 'Isolated subnets for the job queue',
      subnetIds: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }).subnetIds,
    });
    // Bull stores queue state in Redis, so keys must never be evicted to free memory
    const redisParams = new elasticache.CfnParameterGroup(this, 'RedisParams', {
      description: 'Queue settings for Bull',
      cacheParameterGroupFamily: 'redis7',
      properties: { 'maxmemory-policy': 'noeviction' },
    });
    const redis = new elasticache.CfnReplicationGroup(this, 'Redis', {
      replicationGroupDescription: 'Job queue for CareerGap AI',
      engine: 'redis',
      engineVersion: '7.1',
      cacheNodeType: config.production ? 'cache.t4g.small' : 'cache.t4g.micro',
      numCacheClusters: config.production ? 2 : 1,
      automaticFailoverEnabled: config.production,
      multiAzEnabled: config.production,
      cacheSubnetGroupName: redisSubnets.ref,
      cacheParameterGroupName: redisParams.ref,
      securityGroupIds: [redisSg.securityGroupId],
      atRestEncryptionEnabled: true,
      // The queue client does not use TLS; traffic stays inside private subnets and is limited by the security group
      transitEncryptionEnabled: false,
      port: 6379,
      autoMinorVersionUpgrade: true,
    });
    redis.addResourceDependency(redisSubnets);

    // ------------------------------------------------------------------ uploads
    const uploads = new s3.Bucket(this, 'Uploads', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: keep,
      autoDeleteObjects: !config.production,
      lifecycleRules: [{ abortIncompleteMultipartUploadAfter: cdk.Duration.days(7) }],
    });

    // ------------------------------------------------------------------ image registry and the deployed version
    const repoRules: ecr.LifecycleRule[] = [{ description: 'Keep the 30 newest images', maxImageCount: 30 }];
    const apiRepo = new ecr.Repository(this, 'ApiRepo', {
      repositoryName: 'careergap/api',
      imageScanOnPush: true,
      removalPolicy: keep,
      emptyOnDelete: !config.production,
      lifecycleRules: repoRules,
    });
    const webRepo = new ecr.Repository(this, 'WebRepo', {
      repositoryName: 'careergap/web',
      imageScanOnPush: true,
      removalPolicy: keep,
      emptyOnDelete: !config.production,
      lifecycleRules: repoRules,
    });

    // The pipeline records the tag it deployed here. Task definitions read it, so re-running `cdk deploy` later
    // keeps the running version instead of rolling the services back to the placeholder.
    const imageTagParam = new ssm.StringParameter(this, 'ImageTag', {
      parameterName: '/careergap/image-tag',
      description: 'Image tag currently deployed by the GitHub Actions pipeline',
      stringValue: 'initial',
    });
    const imageTag = imageTagParam.stringValue;

    // ------------------------------------------------------------------ secrets
    const jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
      secretName: 'careergap/jwt-secret',
      description: 'Signs access tokens',
      generateSecretString: { passwordLength: 64, excludePunctuation: true },
    });
    const jwtRefreshSecret = new secretsmanager.Secret(this, 'JwtRefreshSecret', {
      secretName: 'careergap/jwt-refresh-secret',
      description: 'Signs refresh tokens',
      generateSecretString: { passwordLength: 64, excludePunctuation: true },
    });
    // Created with empty keys. Fill them in (console or CLI) after the first deploy; CloudFormation never
    // rewrites them because this template does not change them.
    const providerSecrets = new secretsmanager.Secret(this, 'ProviderSecrets', {
      secretName: 'careergap/providers',
      description: 'AI provider keys, OAuth client credentials and SMTP settings. Empty values switch the feature off.',
      generateSecretString: {
        secretStringTemplate: JSON.stringify(Object.fromEntries(PROVIDER_SECRET_KEYS.map((key) => [key, '']))),
        generateStringKey: 'unused',
        passwordLength: 16,
        excludePunctuation: true,
      },
    });
    const providerSecret = (key: (typeof PROVIDER_SECRET_KEYS)[number]) => ecs.Secret.fromSecretsManager(providerSecrets, key);

    // ------------------------------------------------------------------ cluster, load balancer
    const cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: 'careergap',
      vpc,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc,
      internetFacing: true,
      securityGroup: albSg,
      // Coach replies and analyses can take a while; the default 60 seconds would cut them off
      idleTimeout: cdk.Duration.seconds(120),
      dropInvalidHeaderFields: true,
    });

    const logRetention = config.production ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK;
    const apiLogs = new logs.LogGroup(this, 'ApiLogs', { retention: logRetention, removalPolicy: keep });
    const webLogs = new logs.LogGroup(this, 'WebLogs', { retention: logRetention, removalPolicy: keep });

    // ------------------------------------------------------------------ API service
    const apiTask = new ecs.FargateTaskDefinition(this, 'ApiTask', {
      family: 'careergap-api',
      cpu: 1024,
      memoryLimitMiB: 2048,
      runtimePlatform: { cpuArchitecture: ecs.CpuArchitecture.X86_64, operatingSystemFamily: ecs.OperatingSystemFamily.LINUX },
    });
    uploads.grantReadWrite(apiTask.taskRole);

    const callbackBase = `${config.publicUrl}/api/v1/auth`;
    apiTask.addContainer('api', {
      containerName: 'api',
      image: ecs.ContainerImage.fromEcrRepository(apiRepo, imageTag),
      portMappings: [{ containerPort: API_PORT }],
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'api', logGroup: apiLogs }),
      environment: {
        NODE_ENV: 'production',
        PORT: String(API_PORT),
        API_PREFIX: 'api/v1',
        FRONTEND_URL: config.publicUrl,
        TRUST_PROXY_HOPS: '1',
        DB_HOST: database.instanceEndpoint.hostname,
        DB_PORT: database.instanceEndpoint.port.toString(),
        DB_NAME,
        REDIS_HOST: redis.attrPrimaryEndPointAddress,
        REDIS_PORT: redis.attrPrimaryEndPointPort,
        REDIS_URL: `redis://${redis.attrPrimaryEndPointAddress}:${redis.attrPrimaryEndPointPort}`,
        AWS_REGION: this.region,
        AWS_S3_BUCKET: uploads.bucketName,
        AI_PROVIDER_ORDER: 'nvidia,gemini',
        AI_EMBEDDING_PROVIDER_ORDER: 'nvidia,gemini',
        NVIDIA_MODEL: 'nvidia/nemotron-3-ultra-550b-a55b',
        NVIDIA_EMBEDDING_MODEL: 'nvidia/nemotron-3.5-embed-1b',
        GEMINI_MODEL: 'gemini-3.5-flash',
        GEMINI_EMBEDDING_MODEL: 'gemini-embedding-001',
        GOOGLE_CALLBACK_URL: `${callbackBase}/google/callback`,
        LINKEDIN_CALLBACK_URL: `${callbackBase}/linkedin/callback`,
      },
      secrets: {
        DB_USER: ecs.Secret.fromSecretsManager(database.secret!, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(database.secret!, 'password'),
        JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
        JWT_REFRESH_SECRET: ecs.Secret.fromSecretsManager(jwtRefreshSecret),
        ...Object.fromEntries(PROVIDER_SECRET_KEYS.map((key) => [key, providerSecret(key)])),
      },
    });

    const apiService = new ecs.FargateService(this, 'ApiService', {
      serviceName: 'careergap-api',
      cluster,
      taskDefinition: apiTask,
      desiredCount: config.initialDeploy ? 0 : config.apiDesiredCount,
      securityGroups: [apiSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      assignPublicIp: false,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      healthCheckGracePeriod: cdk.Duration.seconds(90),
      circuitBreaker: { rollback: true },
    });

    // ------------------------------------------------------------------ web service
    const webTask = new ecs.FargateTaskDefinition(this, 'WebTask', {
      family: 'careergap-web',
      cpu: 512,
      memoryLimitMiB: 1024,
      runtimePlatform: { cpuArchitecture: ecs.CpuArchitecture.X86_64, operatingSystemFamily: ecs.OperatingSystemFamily.LINUX },
    });
    webTask.addContainer('web', {
      containerName: 'web',
      image: ecs.ContainerImage.fromEcrRepository(webRepo, imageTag),
      portMappings: [{ containerPort: WEB_PORT }],
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'web', logGroup: webLogs }),
      environment: { NODE_ENV: 'production', PORT: String(WEB_PORT), HOSTNAME: '0.0.0.0' },
    });

    const webService = new ecs.FargateService(this, 'WebService', {
      serviceName: 'careergap-web',
      cluster,
      taskDefinition: webTask,
      desiredCount: config.initialDeploy ? 0 : config.webDesiredCount,
      securityGroups: [webSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      assignPublicIp: false,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      circuitBreaker: { rollback: true },
    });

    // ------------------------------------------------------------------ routing: /api/* to the API, the rest to the web app
    alb.addListener('Http', {
      port: 80,
      defaultAction: elbv2.ListenerAction.redirect({ protocol: 'HTTPS', port: '443', permanent: true }),
    });
    const https = alb.addListener('Https', {
      port: 443,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificates: [elbv2.ListenerCertificate.fromArn(config.certificateArn)],
      sslPolicy: elbv2.SslPolicy.RECOMMENDED_TLS,
    });
    https.addTargets('Web', {
      port: WEB_PORT,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [webService],
      healthCheck: { path: '/', healthyHttpCodes: '200-399', interval: cdk.Duration.seconds(30) },
      deregistrationDelay: cdk.Duration.seconds(30),
    });
    https.addTargets('Api', {
      priority: 10,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/api/*'])],
      port: API_PORT,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [apiService],
      healthCheck: { path: '/api/v1/health', healthyHttpCodes: '200', interval: cdk.Duration.seconds(30) },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // ------------------------------------------------------------------ GitHub Actions access (OIDC, no stored keys)
    const oidc = config.githubOidcProviderArn
      ? iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, 'GithubOidc', config.githubOidcProviderArn)
      : new iam.OpenIdConnectProvider(this, 'GithubOidc', {
          url: 'https://token.actions.githubusercontent.com',
          clientIds: ['sts.amazonaws.com'],
        });

    const deployRole = new iam.Role(this, 'GithubDeployRole', {
      roleName: 'careergap-github-deploy',
      description: 'Assumed by GitHub Actions to push images, run migrations and deploy CareerGap AI',
      maxSessionDuration: cdk.Duration.hours(1),
      assumedBy: new iam.WebIdentityPrincipal(oidc.openIdConnectProviderArn, {
        StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com' },
        // Only jobs that run in the "production" environment of this repository (protect it with required reviewers)
        StringLike: { 'token.actions.githubusercontent.com:sub': `repo:${config.githubRepo}:environment:production` },
      }),
    });

    apiRepo.grantPullPush(deployRole);
    webRepo.grantPullPush(deployRole);
    imageTagParam.grantWrite(deployRole);
    imageTagParam.grantRead(deployRole);
    apiLogs.grantRead(deployRole);
    apiTask.taskRole.grantPassRole(deployRole);
    apiTask.obtainExecutionRole().grantPassRole(deployRole);
    webTask.taskRole.grantPassRole(deployRole);
    webTask.obtainExecutionRole().grantPassRole(deployRole);

    // Task definition revisions are account-wide resources; the actions below are limited to this app's families and cluster
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'TaskDefinitions',
        actions: ['ecs:RegisterTaskDefinition', 'ecs:DescribeTaskDefinition'],
        resources: ['*'],
      }),
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'DeployServices',
        actions: ['ecs:UpdateService', 'ecs:DescribeServices'],
        resources: [apiService.serviceArn, webService.serviceArn],
      }),
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'RunMigrations',
        actions: ['ecs:RunTask'],
        resources: [`arn:${this.partition}:ecs:${this.region}:${this.account}:task-definition/careergap-api:*`],
        conditions: { ArnEquals: { 'ecs:cluster': cluster.clusterArn } },
      }),
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'ObserveMigrations',
        actions: ['ecs:DescribeTasks', 'ecs:StopTask'],
        resources: [`arn:${this.partition}:ecs:${this.region}:${this.account}:task/${cluster.clusterName}/*`],
      }),
    );

    // ------------------------------------------------------------------ outputs for the workflow and the runbook
    const out = (id: string, value: string, description: string) => new cdk.CfnOutput(this, id, { value, description });
    out('AlbDnsName', alb.loadBalancerDnsName, 'Point the public host name at this address (CNAME or alias)');
    out('ClusterName', cluster.clusterName, 'ECS cluster');
    out('ApiServiceName', apiService.serviceName, 'API service');
    out('WebServiceName', webService.serviceName, 'Web service');
    out('ApiRepositoryUri', apiRepo.repositoryUri, 'API image repository');
    out('WebRepositoryUri', webRepo.repositoryUri, 'Web image repository');
    out('DeployRoleArn', deployRole.roleArn, 'Role for GitHub Actions (variable AWS_DEPLOY_ROLE_ARN)');
    out('ProviderSecretName', providerSecrets.secretName, 'Fill in the AI keys, OAuth and SMTP values here');
    out('UploadsBucketName', uploads.bucketName, 'Resume uploads');
    out('ImageTagParameter', imageTagParam.parameterName, 'Version currently deployed');
  }
}
