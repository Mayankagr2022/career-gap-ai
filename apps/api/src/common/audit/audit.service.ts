import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Best-effort: an audit failure must never break the request. */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data: entry });
    } catch (error: any) {
      this.logger.warn(`Audit log failed (${entry.action}): ${error.message}`);
    }
  }
}
