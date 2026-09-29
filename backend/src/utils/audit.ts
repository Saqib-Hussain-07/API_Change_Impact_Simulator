import { query } from '../db/client';
import { logger } from './logger';

interface AuditEntry {
  userId?: string;
  actionType: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_log(user_id, action_type, entity_type, entity_id, metadata)
       VALUES($1, $2, $3, $4, $5)`,
      [
        entry.userId ?? null,
        entry.actionType,
        entry.entityType ?? null,
        entry.entityId ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
      ],
    );
  } catch (err) {
    // Never let audit failures propagate — just log the error
    logger.error({ err, entry }, 'Failed to write audit log entry');
  }
}
