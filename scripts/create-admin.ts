import '../src/lib/load-env';
import { dbAdmin as db } from '../src/lib/db';
import { hashPassword } from '../src/lib/hash';

async function main() {
  const args = process.argv.slice(2);
  const email = args[0]?.trim().toLowerCase();
  const password = args[1]?.trim();
  const name = args[2]?.trim() || 'Admin';

  if (!email) {
    console.log(`
Usage:
  npx tsx scripts/create-admin.ts <email> [password] [name]

Examples:
  1. Make an existing user an admin:
     npx tsx scripts/create-admin.ts user@example.com

  2. Create a new admin user:
     npx tsx scripts/create-admin.ts newadmin@pingstack.in SecretPassword123 "Founder"
    `);
    process.exit(1);
  }

  if (!db) {
    console.error('❌ Database connection unavailable.');
    process.exit(1);
  }

  // 1. Check if user already exists
  const { data: existingUser } = await db
    .from('users')
    .select('id, email, role, tenant_id')
    .eq('email', email)
    .maybeSingle();

  if (existingUser) {
    // Update role to admin
    const updateData: any = { role: 'admin' };
    if (password) {
      updateData.password_hash = await hashPassword(password);
    }
    const { error } = await db.from('users').update(updateData).eq('id', existingUser.id);
    if (error) {
      console.error('❌ Failed to promote user:', error.message);
      process.exit(1);
    }
    console.log(`✅ Success: User "${email}" has been promoted to ADMIN (Role: admin).`);
    if (password) console.log(`🔑 Password updated.`);
    console.log(`👉 You can now log in at /login and navigate to /admin`);
    process.exit(0);
  }

  // 2. User does not exist, create new
  if (!password) {
    console.error('❌ Password is required to create a new user.');
    console.log(`Example: npx tsx scripts/create-admin.ts ${email} YourPassword123 "Admin Name"`);
    process.exit(1);
  }

  // Get or create tenant
  const { data: firstTenant } = await db
    .from('tenants')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const tenantId = firstTenant?.id;
  if (!tenantId) {
    console.error('❌ No tenant found to associate admin with.');
    process.exit(1);
  }

  const hashedPassword = await hashPassword(password);
  const { data: newUser, error: createErr } = await db
    .from('users')
    .insert({
      email,
      password_hash: hashedPassword,
      name,
      role: 'admin',
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (createErr) {
    console.error('❌ Failed to create admin user:', createErr.message);
    process.exit(1);
  }

  console.log(`🎉 Success: Created new Admin User:`);
  console.log(`📧 Email: ${email}`);
  console.log(`👤 Name: ${name}`);
  console.log(`🛡️  Role: admin`);
  console.log(`👉 Log in at http://localhost:3000/login and visit /admin`);
  process.exit(0);
}

main().catch((err) => {
  console.error('💥 Error:', err);
  process.exit(1);
});
