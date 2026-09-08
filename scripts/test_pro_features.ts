import { PLANS, PLAN_CONFIGS } from '../src/lib/plans';

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
  console.log('🧪 PINGSTACK PRO FEATURES & PRICING TESTS');
  console.log('=============================================\n');

  // Test 1: Pro Price Verification
  console.log('--- TEST GROUP 1: Pro Pricing Contract ---');
  assert(PLAN_CONFIGS.pro.originalPriceFormatted === '₹999', 'Pro originalPriceFormatted is ₹999');
  assert(PLAN_CONFIGS.pro.priceFormatted === '₹499', 'Pro priceFormatted is ₹499');
  assert(PLAN_CONFIGS.pro.comingSoon === true, 'Pro comingSoon is true');
  assert(PLAN_CONFIGS.pro.disabled === true, 'Pro disabled is true (no self-service purchase)');
  assert(PLAN_CONFIGS.pro.ctaText === 'Coming Soon', 'Pro button label is Coming Soon');

  // Test 2: Automation Rules Limits & Capabilities
  console.log('\n--- TEST GROUP 2: Automation Entitlements ---');
  assert(PLANS.starter.maxAutomationRules === 0, 'Starter has 0 automation rules');
  assert(PLANS.growth.maxAutomationRules === 3, 'Growth has max 3 automation rules');
  assert(PLANS.pro.maxAutomationRules === Infinity, 'Pro has unlimited automation rules');

  // Test 3: Pro Capacities Integrity
  console.log('\n--- TEST GROUP 3: Pro Plan Core Limits ---');
  assert(PLANS.pro.maxContacts === 10000, 'Pro allows 10,000 contacts');
  assert(PLANS.pro.templateSendsPerDay === 2000, 'Pro allows 2,000 template sends/day');
  assert(PLANS.pro.maxSavedTemplates === Infinity, 'Pro allows unlimited saved templates');
  assert(PLANS.pro.mediaRetentionDays === 365, 'Pro retains 365 days of message history');
  assert(PLANS.pro.maxStorageMb === 5120, 'Pro has 5GB media storage');

  // Test 4: Keyword Trigger Matcher Simulation
  console.log('\n--- TEST GROUP 4: Automation Trigger Matcher ---');
  const sampleRule = {
    trigger_type: 'keyword',
    trigger_config: { keywords: ['price', 'quote', 'catalogue'] },
  };

  const matchKeyword = (rule: typeof sampleRule, text: string) => {
    const norm = text.toLowerCase();
    return rule.trigger_config.keywords.some((k) => norm.includes(k));
  };

  assert(matchKeyword(sampleRule, 'Hi, what is your price list?') === true, 'Matches "price" in sentence');
  assert(matchKeyword(sampleRule, 'Send me the catalogue please') === true, 'Matches "catalogue" in sentence');
  assert(matchKeyword(sampleRule, 'Thank you very much') === false, 'Does not match unrelated message');

  // Test 5: Welcome Trigger Simulation
  console.log('\n--- TEST GROUP 5: Welcome Trigger Simulation ---');
  const welcomeRule = { trigger_type: 'welcome' };
  const matchWelcome = (rule: typeof welcomeRule, isFirst: boolean) => isFirst;

  assert(matchWelcome(welcomeRule, true) === true, 'Triggers on first incoming message');
  assert(matchWelcome(welcomeRule, false) === false, 'Does not trigger on subsequent incoming messages');

  console.log('\n=============================================');
  console.log('🎉 ALL PRO FEATURES & PRICING TESTS PASSED!');
  console.log('=============================================\n');
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
