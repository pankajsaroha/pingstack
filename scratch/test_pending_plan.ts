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

  console.log('--- Verification: Starting Pending Plan Auto-Transition Verification ---');

  // 1. Fetch a tenant
  const { data: tenant, error } = await db.from('tenants').select('*').limit(1).single();
  if (error || !tenant) {
    console.error('No tenant found in DB to test with. Error:', error);
    return;
  }

  console.log(`Testing with tenant: ${tenant.name} (${tenant.id})`);
  console.log(`Original Plan: ${tenant.plan_type}, Sub Status: ${tenant.subscription_status}, Period End: ${tenant.current_period_end}`);

  // Test Case A: Expired pending plan (should transition immediately on limit check)
  console.log('\n--- Test A: Pending Plan Transition (Expired) ---');
  const pastDate = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 mins ago
  await db.from('tenants').update({ 
    plan_type: 'growth',
    pending_plan_type: 'starter',
    subscription_status: 'cancelled',
    current_period_end: pastDate
  }).eq('id', tenant.id);

  console.log('Running checkLimit (triggers fresh limits & transitions)...');
  await checkLimit(tenant.id, 'campaigns');

  const { data: updatedTenantA } = await db.from('tenants').select('*').eq('id', tenant.id).single();
  console.log('Updated state post-transition:');
  console.log(`Plan: ${updatedTenantA.plan_type} (should be starter)`);
  console.log(`Sub Status: ${updatedTenantA.subscription_status} (should be expired)`);

  // Test Case B: Active pending plan (should NOT transition yet)
  console.log('\n--- Test B: Pending Plan Transition (Active/Future) ---');
  const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
  await db.from('tenants').update({ 
    plan_type: 'starter',
    pending_plan_type: 'growth',
    subscription_status: 'active',
    current_period_end: futureDate
  }).eq('id', tenant.id);

  console.log('Running checkLimit...');
  await checkLimit(tenant.id, 'campaigns');

  const { data: updatedTenantB } = await db.from('tenants').select('*').eq('id', tenant.id).single();
  console.log('Updated state post-check:');
  console.log(`Plan: ${updatedTenantB.plan_type} (should remain starter)`);
  console.log(`Pending Plan: ${updatedTenantB.pending_plan_type} (should remain growth)`);
  console.log(`Sub Status: ${updatedTenantB.subscription_status} (should remain active)`);

  // 2. Restore original values
  console.log('\n--- Restoring Tenant Original Values ---');
  await db.from('tenants').update({
    created_at: tenant.created_at,
    subscription_status: tenant.subscription_status,
    plan_type: tenant.plan_type,
    current_period_end: tenant.current_period_end
  }).eq('id', tenant.id);
  
  console.log('Restored. Verification Complete.');
}

runTest().catch(console.error);
