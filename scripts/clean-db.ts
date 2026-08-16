import '../src/lib/load-env';
import { dbAdmin } from '../src/lib/db';
import { connection } from '../src/lib/queue';

async function main() {
  console.log('🧹 Starting PingStack Database & Redis Cache Cleanup...\n');

  if (!dbAdmin) {
    console.error('❌ Database client (dbAdmin) is unavailable.');
    process.exit(1);
  }

  // Usage: npm run db:clean -- user@example.com
  const args = process.argv.slice(2);
  const keepEmailArg = args.find((a) => a.startsWith('--keep-email='))?.split('=')[1] || args[0];
  const keepEmail = (keepEmailArg || process.env.KEEP_EMAIL || '').trim().toLowerCase();

  let keepUserId: string | null = null;
  let keepTenantId: string | null = null;

  if (keepEmail) {
    console.log(`🔍 Looking up user & tenant to preserve: "${keepEmail}"...`);
    const { data: user, error: uErr } = await dbAdmin
      .from('users')
      .select('id, tenant_id, email')
      .eq('email', keepEmail)
      .maybeSingle();

    if (uErr || !user) {
      console.error(`❌ User with email "${keepEmail}" not found in DB. Aborting cleanup.`);
      process.exit(1);
    }

    keepUserId = user.id;
    keepTenantId = user.tenant_id;
    console.log(`✅ Preserving User ID: ${keepUserId} (Tenant ID: ${keepTenantId})`);
    console.log(`ℹ️  All messages, contacts, campaigns, templates, groups, and credentials for this tenant WILL BE KEPT.\n`);
  } else {
    console.log('⚠️  No email specified. Wiping ALL database tables across ALL tenants.\n');
  }

  // Tenant-scoped tables that contain user operational data
  const tenantTables = [
    'messages',
    'group_contacts',
    'campaigns',
    'templates',
    'contacts',
    'groups',
    'whatsapp_accounts',
    'billing_transactions',
    'support_tickets',
    'developer_apps',
  ];

  for (const table of tenantTables) {
    try {
      let query = dbAdmin.from(table).delete();
      if (keepTenantId) {
        // Delete only data belonging to OTHER tenants
        query = query.neq('tenant_id', keepTenantId);
      } else {
        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { error } = await query;
      if (error) {
        console.warn(`⚠️ Note on ${table}:`, error.message);
      } else {
        console.log(`✅ Cleared ${table} ${keepTenantId ? '(preserved target tenant data)' : '(all rows)'}`);
      }
    } catch (err: any) {
      console.warn(`⚠️ Error clearing ${table}:`, err.message || err);
    }
  }

  // verification_codes table (not tenant-scoped, clear stale codes or keep target email codes)
  try {
    let query = dbAdmin.from('verification_codes').delete();
    if (keepEmail) {
      query = query.neq('email', keepEmail);
    } else {
      query = query.neq('created_at', '1970-01-01T00:00:00Z');
    }
    await query;
    console.log('✅ Cleared verification_codes');
  } catch (e: any) {
    console.warn('⚠️ Note on verification_codes:', e.message || e);
  }

  // Users table
  try {
    let query = dbAdmin.from('users').delete();
    if (keepUserId) {
      query = query.neq('id', keepUserId);
    } else {
      query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }
    const { error } = await query;
    if (error) console.warn('⚠️ Note on users:', error.message);
    else console.log(`✅ Cleared users ${keepUserId ? '(preserved target user)' : ''}`);
  } catch (err: any) {
    console.warn('⚠️ Error clearing users:', err.message || err);
  }

  // Tenants table
  try {
    let query = dbAdmin.from('tenants').delete();
    if (keepTenantId) {
      query = query.neq('id', keepTenantId);
    } else {
      query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }
    const { error } = await query;
    if (error) console.warn('⚠️ Note on tenants:', error.message);
    else console.log(`✅ Cleared tenants ${keepTenantId ? '(preserved target tenant)' : ''}`);
  } catch (err: any) {
    console.warn('⚠️ Error clearing tenants:', err.message || err);
  }

  // Flush Redis Cache
  if (connection && connection.status === 'ready') {
    try {
      await connection.flushall();
      console.log('✅ Cleared Redis cache (FLUSHALL).');
    } catch (e: any) {
      console.warn('⚠️ Redis flush error:', e.message || e);
    }
  }

  console.log('\n🎉 Cleanup completed successfully!');
  if (keepEmail) {
    console.log(`✨ User "${keepEmail}" and ALL its messages, contacts, campaigns, and templates were safely preserved.`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('💥 Cleanup failed:', err);
  process.exit(1);
});
