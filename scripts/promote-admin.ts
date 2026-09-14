#!/usr/bin/env npx tsx
/**
 * Pingstack Explicit Admin Promotion CLI
 * 
 * Usage:
 *   npx tsx scripts/promote-admin.ts --email=user@example.com --role=admin
 *   npx tsx scripts/promote-admin.ts --email=user@example.com --role=user
 *   npx tsx scripts/promote-admin.ts --list
 */

import { dbAdmin as db } from '../src/lib/db';
import { isPlatformAdminEmail } from '../src/lib/server/admin-auth';

async function main() {
  const args = process.argv.slice(2);
  const isList = args.includes('--list');
  const emailArg = args.find(a => a.startsWith('--email='))?.split('=')[1];
  const roleArg = args.find(a => a.startsWith('--role='))?.split('=')[1] || 'admin';

  if (!db) {
    console.error('❌ Database client unavailable. Ensure environment variables (.env.local) are configured.');
    process.exit(1);
  }

  if (isList) {
    console.log('\n📋 Platform Users & Roles:');
    const { data: users, error } = await db
      .from('users')
      .select('id, name, email, role, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Failed to fetch users:', error);
      process.exit(1);
    }

    console.table(
      users.map(u => ({
        ID: u.id.substring(0, 8) + '...',
        Name: u.name,
        Email: u.email,
        Role: u.role || 'user',
        IsSuperAdminConfig: isPlatformAdminEmail(u.email) ? 'YES' : 'NO',
        CreatedAt: u.created_at
      }))
    );
    return;
  }

  if (!emailArg) {
    console.log(`
Pingstack Admin Promotion CLI
-----------------------------
Usage:
  npx tsx scripts/promote-admin.ts --email=<user-email> --role=<admin|user>
  npx tsx scripts/promote-admin.ts --list

Options:
  --email=<email>    Target user email address (required)
  --role=<role>      Role to assign: 'admin' or 'user' (default: 'admin')
  --list             List all existing users and their current roles
`);
    process.exit(1);
  }

  if (!['admin', 'user', 'superadmin'].includes(roleArg)) {
    console.error(`❌ Invalid role: "${roleArg}". Allowed: 'admin' or 'user'`);
    process.exit(1);
  }

  const cleanEmail = emailArg.trim().toLowerCase();

  // Find user
  const { data: user, error: findErr } = await db
    .from('users')
    .select('id, email, name, role')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (findErr || !user) {
    console.error(`❌ User with email "${cleanEmail}" not found in database.`);
    process.exit(1);
  }

  if (isPlatformAdminEmail(cleanEmail) && roleArg === 'user') {
    console.error(`❌ Cannot demote "${cleanEmail}": Email is configured in PLATFORM_ADMIN_EMAILS.`);
    process.exit(1);
  }

  const oldRole = user.role || 'user';

  if (oldRole === roleArg) {
    console.log(`ℹ️ User "${cleanEmail}" already has role "${roleArg}". No changes made.`);
    return;
  }

  const { error: updateErr } = await db
    .from('users')
    .update({ role: roleArg })
    .eq('id', user.id);

  if (updateErr) {
    console.error(`❌ Failed to update role:`, updateErr);
    process.exit(1);
  }

  // Record audit log
  try {
    await db.from('admin_audit_logs').insert({
      action: 'cli_admin_role_change',
      resource_type: 'user',
      resource_id: user.id,
      details: {
        targetEmail: cleanEmail,
        oldRole,
        newRole: roleArg,
        executedVia: 'CLI',
        timestamp: new Date().toISOString()
      }
    });
  } catch (auditErr) {
    // Non-fatal
  }

  console.log(`✅ Success: User "${cleanEmail}" (${user.id}) role updated from "${oldRole}" to "${roleArg}".`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
