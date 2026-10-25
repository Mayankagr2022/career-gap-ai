#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CareerGapStack } from '../lib/careergap-stack';
import { readConfig } from '../lib/config';

const app = new cdk.App();

new CareerGapStack(app, 'CareerGap', {
  config: readConfig(app),
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  description: 'CareerGap AI: web and API on ECS Fargate with PostgreSQL, Redis and S3',
  // The database, uploads and registry live in this stack
  terminationProtection: true,
});
