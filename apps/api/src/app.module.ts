import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ResumesModule } from './modules/resumes/resumes.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AnalysesModule } from './modules/analyses/analyses.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { RoadmapsModule } from './modules/roadmaps/roadmaps.module';
import { CoachingModule } from './modules/coaching/coaching.module';
import { MarketModule } from './modules/market/market.module';
import { AiModule } from './modules/ai/ai.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { StorageModule } from './common/storage/storage.module';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { redisConfig } from './config/redis.config';
import { aiConfig } from './config/ai.config';
import { awsConfig } from './config/aws.config';
import { oauthConfig } from './config/oauth.config';
import { emailConfig } from './config/email.config';
import { AuditModule } from './common/audit/audit.module';
import { SkillsModule } from './modules/skills/skills.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, aiConfig, awsConfig, oauthConfig, emailConfig],
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.production' : ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          // env values are strings; the throttler needs numbers
          ttl: Number(config.get('THROTTLE_TTL', 60000)),
          limit: Number(config.get('THROTTLE_LIMIT', 100)),
        },
      ],
    }),

    // Email
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('email.host'),
          port: config.get('email.port'),
          secure: config.get('email.port') === 465,
          auth: {
            user: config.get('email.user'),
            pass: config.get('email.password'),
          },
        },
        defaults: {
          from: config.get('email.from'),
        },
      }),
    }),

    // Bull queue with Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
    }),

    // Core modules
    PrismaModule,
    AuditModule,
    SkillsModule,
    StorageModule,
    AiModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ResumesModule,
    JobsModule,
    AnalysesModule,
    RecommendationsModule,
    RoadmapsModule,
    CoachingModule,
    MarketModule,
    NotificationsModule,
  ],
  providers: [
    // Without this guard the ThrottlerModule config above is never enforced
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
