import { dbAdmin as db } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface AdminAuditPayload {
  adminUserId: string;
  adminEmail: string;
  action: string;
  targetTenantId?: string | null;
  targetTenantName?: string | null;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
}

/**
 * Records an administrative action in the admin_audit_logs table.
 * If the table does not exist, logs safely to application logger without breaking execution.
 */
export async function logAdminAudit(entry: AdminAuditPayload): Promise<void> {
  const timestamp = new Date().toISOString();
  
  // 1. Structured logger entry
  logger.info(`[ADMIN_AUDIT] action=${entry.action} admin=${entry.adminEmail} target=${entry.targetTenantName || entry.targetTenantId || 'N/A'}`, {
    adminUserId: entry.adminUserId,
    adminEmail: entry.adminEmail,
    action: entry.action,
    targetTenantId: entry.targetTenantId,
    targetTenantName: entry.targetTenantName,
    metadata: entry.metadata,
    ipAddress: entry.ipAddress,
    timestamp,
  });

  // 2. Persist to Supabase admin_audit_logs
  if (!db) return;

  try {
    const { error } = await db.from('admin_audit_logs').insert([
      {
        admin_user_id: entry.adminUserId || null,
        admin_email: entry.adminEmail,
        action: entry.action,
        target_tenant_id: entry.targetTenantId || null,
        target_tenant_name: entry.targetTenantName || null,
        metadata: entry.metadata || {},
        ip_address: entry.ipAddress || null,
        created_at: timestamp,
      },
    ]);

    if (error) {
      console.warn('[logAdminAudit] Note: DB insert warning (table might need migration):', error.message);
    }
  } catch (err: any) {
    console.warn('[logAdminAudit] Failed to insert audit record to DB:', err?.message || err);
  }
}
