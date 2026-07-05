import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testAIGenerate() {
  console.log('--- Testing AI Template Generation ---');
  
  const { db } = await import('../src/lib/db');
  const { getActivePlanType } = await import('../src/lib/plans');
  
  if (!db) {
    console.error('Database connection missing');
    return;
  }
  
  // Find a test tenant
  const { data: tenants, error } = await db
    .from('tenants')
    .select('id, plan_type');
    
  if (error || !tenants || tenants.length === 0) {
    console.error('No tenants found in db to test');
    return;
  }

  for (const tenant of tenants) {
    const active = getActivePlanType(tenant.plan_type);
    console.log(`Tenant ${tenant.id} has plan: ${tenant.plan_type} -> Active parsed: ${active}`);
  }
  
  console.log('Testing completed successfully.');
}

testAIGenerate();
