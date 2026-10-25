import { App } from 'aws-cdk-lib';

/** Everything that differs between deployments. Passed as CDK context: `cdk deploy -c key=value`. */
export interface CareerGapConfig {
  /** Public HTTPS origin users reach the app on, e.g. https://app.example.com (no trailing slash). */
  publicUrl: string;
  /** ACM certificate (in the stack's region) for that host name. HTTPS is required: login cookies are Secure. */
  certificateArn: string;
  /** GitHub repository allowed to deploy, as owner/name. */
  githubRepo: string;
  /** Reuse the account's existing GitHub OIDC provider (an account can only have one). Created when omitted. */
  githubOidcProviderArn?: string;
  /** Larger, redundant database and cache with deletion protection. */
  production: boolean;
  /** NAT gateways for outbound traffic from private subnets (the AI providers are reached through them). */
  natGateways: number;
  /** First deploy only: create the services with zero tasks, because no image has been pushed yet. */
  initialDeploy: boolean;
  apiDesiredCount: number;
  webDesiredCount: number;
}

const text = (app: App, key: string): string | undefined => {
  const value = app.node.tryGetContext(key);
  return value === undefined || value === null || value === '' ? undefined : String(value);
};
const flag = (app: App, key: string, fallback: boolean) => {
  const value = text(app, key);
  return value === undefined ? fallback : value.toLowerCase() === 'true';
};
const int = (app: App, key: string, fallback: number) => {
  const value = text(app, key);
  if (value === undefined) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n < 0) throw new Error(`Context "${key}" must be a non-negative integer, got "${value}"`);
  return n;
};

export function readConfig(app: App): CareerGapConfig {
  const publicUrl = text(app, 'publicUrl')?.replace(/\/+$/, '');
  const certificateArn = text(app, 'certificateArn');

  const missing = [!publicUrl && 'publicUrl', !certificateArn && 'certificateArn'].filter(Boolean);
  if (missing.length) {
    throw new Error(
      `Missing required context: ${missing.join(', ')}.\n` +
        'Example: cdk deploy -c publicUrl=https://app.example.com -c certificateArn=arn:aws:acm:REGION:ACCOUNT:certificate/ID',
    );
  }
  if (!publicUrl!.startsWith('https://')) {
    // Auth cookies are marked Secure in production, so a plain-HTTP deployment could not log anyone in
    throw new Error(`publicUrl must start with https:// (got "${publicUrl}")`);
  }

  const production = flag(app, 'production', true);
  return {
    publicUrl: publicUrl!,
    certificateArn: certificateArn!,
    githubRepo: text(app, 'githubRepo') ?? 'Mayankagr2022/career-gap-ai',
    githubOidcProviderArn: text(app, 'githubOidcProviderArn'),
    production,
    natGateways: int(app, 'natGateways', production ? 2 : 1),
    initialDeploy: flag(app, 'initialDeploy', false),
    apiDesiredCount: int(app, 'apiDesiredCount', production ? 2 : 1),
    webDesiredCount: int(app, 'webDesiredCount', production ? 2 : 1),
  };
}
