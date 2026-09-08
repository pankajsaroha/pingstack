import { PLANS, PLAN_CONFIGS, getActivePlanType } from '../src/lib/plans';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function runTests() {
  console.log('\n=============================================');
  console.log('🧪 PINGSTACK PLAN & FEATURE ENFORCEMENT TESTS');
  console.log('=============================================\n');

  // Test 1: Commercial Contract Matrix Verification
  console.log('--- TEST GROUP 1: Commercial Plan Definitions ---');
  assert(PLANS.starter.maxContacts === 500, 'Starter allows max 500 contacts');
  assert(PLANS.starter.templateSendsPerDay === 100, 'Starter allows max 100 template sends/day');
  assert(PLANS.starter.maxSavedTemplates === 10, 'Starter allows max 10 saved templates');
  assert(PLANS.starter.mediaRetentionDays === 30, 'Starter retains messages for 30 days');
  assert(PLANS.starter.maxCustomFields === 0, 'Starter has 0 custom fields');
  assert(PLANS.starter.maxAutomationRules === 0, 'Starter has 0 automation rules');

  assert(PLANS.growth.maxContacts === 2500, 'Growth allows max 2500 contacts');
  assert(PLANS.growth.templateSendsPerDay === 500, 'Growth allows max 500 template sends/day');
  assert(PLANS.growth.maxSavedTemplates === 50, 'Growth allows max 50 saved templates');
  assert(PLANS.growth.mediaRetentionDays === 90, 'Growth retains messages for 90 days');
  assert(PLANS.growth.maxCustomFields === 20, 'Growth allows max 20 custom fields');
  assert(PLANS.growth.maxAutomationRules === 3, 'Growth allows max 3 automation rules');

  // Test 2: Active Plan Resolution
  console.log('\n--- TEST GROUP 2: Plan Resolution & Case Handling ---');
  assert(getActivePlanType(null) === 'starter', 'Null plan defaults to starter');
  assert(getActivePlanType(undefined) === 'starter', 'Undefined plan defaults to starter');
  assert(getActivePlanType('starter') === 'starter', '"starter" resolves to starter');
  assert(getActivePlanType('STARTER') === 'starter', '"STARTER" resolves to starter');
  assert(getActivePlanType('growth') === 'growth', '"growth" resolves to growth');
  assert(getActivePlanType('GROWTH') === 'growth', '"GROWTH" resolves to growth');
  assert(getActivePlanType('unknown_custom') === 'starter', 'Unknown plan defaults safely to starter');

  // Test 3: Plan Retention Edge-Case Logic
  console.log('\n--- TEST GROUP 3: Message Retention Calculations ---');
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Starter (30-day cutoff)
  const starterCutoff = new Date(now - PLANS.starter.mediaRetentionDays * oneDayMs);
  const starterMsg29DaysOld = new Date(now - 29 * oneDayMs);
  const starterMsg31DaysOld = new Date(now - 31 * oneDayMs);

  assert(starterMsg29DaysOld > starterCutoff, 'Starter: 29-day-old message is within retention (KEPT)');
  assert(starterMsg31DaysOld < starterCutoff, 'Starter: 31-day-old message is past retention (ELIGIBLE FOR CLEANUP)');

  // Growth (90-day cutoff)
  const growthCutoff = new Date(now - PLANS.growth.mediaRetentionDays * oneDayMs);
  const growthMsg89DaysOld = new Date(now - 89 * oneDayMs);
  const growthMsg91DaysOld = new Date(now - 91 * oneDayMs);

  assert(growthMsg89DaysOld > growthCutoff, 'Growth: 89-day-old message is within retention (KEPT)');
  assert(growthMsg91DaysOld < growthCutoff, 'Growth: 91-day-old message is past retention (ELIGIBLE FOR CLEANUP)');

  // Test 4: Pricing UI Config Integrity
  console.log('\n--- TEST GROUP 4: Pricing Page Contract Consistency ---');
  assert(PLAN_CONFIGS.starter.priceFormatted === 'FREE', 'Starter is displayed as FREE');
  assert(PLAN_CONFIGS.growth.priceFormatted === '₹199', 'Growth is displayed as ₹199');
  assert(PLAN_CONFIGS.pro.comingSoon === true, 'Pro is flagged as coming soon');
  assert(PLAN_CONFIGS.pro.disabled === true, 'Pro is disabled');

  console.log('\n=============================================');
  console.log('🎉 ALL PLAN & FEATURE ENFORCEMENT TESTS PASSED!');
  console.log('=============================================\n');
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
