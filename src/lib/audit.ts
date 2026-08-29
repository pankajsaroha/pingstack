/**
 * Audit Trail & Security Activity Logging Module
 * Logs security-relevant actions (auth, data mutation, campaign sends, configuration changes).
 */

import { logger } from './logger';
import { redactPII } from './pii';

export type AuditAction =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_REGISTER'
  | 'CAMPAIGN_SEND'
  | 'CAMPAIGN_DELETE'
  | 'CONTACT_CREATE'
  | 'CONTACT_UPDATE'
  | 'CONTACT_DELETE'
  | 'CONTACT_BULK_IMPORT'
  | 'TEMPLATE_CREATE'
  | 'TEMPLATE_DELETE'
  | 'GROUP_CREATE'
  | 'GROUP_DELETE'
  | 'SETTINGS_UPDATE';

export interface AuditLogEntry {
  tenantId?: string | null;
  userId?: string | null;
  action: AuditAction;
  resource?: string;
  ip?: string | null;
  details?: Record<string, any>;
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const sanitizedDetails = entry.details ? redactPII(entry.details) : undefined;

  // Log structured audit trail to stdout/syslog
  logger.info(`[AUDIT_TRAIL] action=${entry.action} resource=${entry.resource || 'N/A'}`, {
    tenantId: entry.tenantId || undefined,
    userId: entry.userId || undefined,
    auditAction: entry.action,
    resource: entry.resource,
    ip: entry.ip || undefined,
    details: sanitizedDetails,
  });
}
