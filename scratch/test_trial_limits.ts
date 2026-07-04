import dotenv from 'dotenv';
import path from 'path';

// Load env variables first before importing modules
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runTest() {
  const { db } = await import('@/lib/db');
  const { checkLimit } = await import('@/lib/limits');

  if (!db) {
    console.error('Database client not initialized');
    return;
  }

  console.log('--- Verification: Starting checkLimit Trial Verification ---');

  // 1. Fetch a tenant
  const { data: tenant, error } = await db.from('tenants').select('*').limit(1).single();
  if (error || !tenant) {
    console.error('No tenant found in DB to test with. Error:', error);
    return;
  }

  console.log(`Testing with tenant: ${tenant.name} (${tenant.id})`);
  console.log(`Original Created At: ${tenant.created_at}, Plan: ${tenant.plan_type}, Sub Status: ${tenant.subscription_status}`);

  // Test Case A: Active Subscription (Should be allowed)
  console.log('\n--- Test A: Subscription Active ---');
  await db.from('tenants').update({ subscription_status: 'active' }).eq('id', tenant.id);
  let result = await checkLimit(tenant.id, 'campaigns');
  console.log(`Result (should be true): ${result}`);

  // Test Case B: Trial Active (created_at is recent) (Should be allowed)
  console.log('\n--- Test B: Trial Active (Recent Registration) ---');
  await db.from('tenants').update({ 
    subscription_status: null, 
    created_at: new Date().toISOString() 
  }).eq('id', tenant.id);
  result = await checkLimit(tenant.id, 'campaigns');
  console.log(`Result (should be true): ${result}`);

  // Test Case C: Trial Expired (created_at is 16 days ago) (Should be BLOCKED - false)
  console.log('\n--- Test C: Trial Expired (16 Days Ago Registration) ---');
  const sixteenDaysAgo = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000);
  await db.from('tenants').update({ 
    subscription_status: null, 
    created_at: sixteenDaysAgo.toISOString() 
  }).eq('id', tenant.id);
  result = await checkLimit(tenant.id, 'campaigns');
  console.log(`Result (should be false): ${result}`);

  // 2. Restore original values
  console.log('\n--- Restoring Tenant Original Values ---');
  await db.from('tenants').update({
    created_at: tenant.created_at,
    subscription_status: tenant.subscription_status,
    plan_type: tenant.plan_type
  }).eq('id', tenant.id);
  
  console.log('Restored. Verification Complete.');
}

runTest().catch(console.error);
