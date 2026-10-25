import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

export interface JobDraft {
  text: string;
  filename: string;
}

export const JOB_DRAFT_TTL_SECONDS = 15 * 60;

/**
 * Holds an uploaded job description between "upload" and "confirm". The text lives server-side,
 * so the client can only confirm the draft, never change what gets saved.
 */
@Injectable()
export class JobDraftService implements OnModuleDestroy {
  private readonly logger = new Logger(JobDraftService.name);
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis({
      host: config.get('REDIS_HOST', 'localhost'),
      port: Number(config.get('REDIS_PORT', 6379)),
      password: config.get('REDIS_PASSWORD') || undefined,
      maxRetriesPerRequest: 2,
    });
    this.redis.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
  }

  async save(userId: string, draft: JobDraft): Promise<string> {
    const id = randomUUID();
    try {
      await this.redis.set(this.key(userId, id), JSON.stringify(draft), 'EX', JOB_DRAFT_TTL_SECONDS);
    } catch (error: any) {
      this.logger.error(`Failed to store job draft: ${error.message}`);
      throw new ServiceUnavailableException('Job upload is temporarily unavailable. Please try again shortly.');
    }
    return id;
  }

  async get(userId: string, id: string): Promise<JobDraft | null> {
    let raw: string | null;
    try {
      raw = await this.redis.get(this.key(userId, id));
    } catch (error: any) {
      this.logger.error(`Failed to read job draft: ${error.message}`);
      throw new ServiceUnavailableException('Job upload is temporarily unavailable. Please try again shortly.');
    }
    return raw ? (JSON.parse(raw) as JobDraft) : null;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.redis.del(this.key(userId, id)).catch((e) => this.logger.warn(`Draft cleanup failed: ${e.message}`));
  }

  async onModuleDestroy() {
    await this.redis.quit().catch(() => undefined);
  }

  // Scoped by user so one user can never confirm another's draft
  private key(userId: string, id: string) {
    return `job-draft:${userId}:${id}`;
  }
}
