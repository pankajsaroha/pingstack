import { validateAiTemplateOutput } from '@/lib/ai-template-validator';
import { PLANS } from '@/lib/plans';
import { getAiTemplateQuota, checkAiTemplateRateLimit, consumeAiTemplateQuota } from '@/lib/limits';
import { connection } from '@/lib/queue';
import { db } from '@/lib/db';

async function runAiTestSuite() {
  console.log('🧪 ========================================================');
  console.log('🧪 RUNNING AI ASSISTED TEMPLATES UNIT & INTEGRATION TESTS');
  console.log('🧪 ========================================================');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, extra?: any) => {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`, extra || '');
      failed++;
    }
  };

  // 1. Plan Config Quota Test
  console.log('\n--- 1. Testing Plan Quota Configs ---');
  assert(PLANS.starter.maxAiTemplatesPerMonth === 0, 'Starter plan has 0 AI template requests/month');
  assert(PLANS.growth.maxAiTemplatesPerMonth === 5, 'Growth plan has 5 AI template requests/month');
  assert(PLANS.pro.maxAiTemplatesPerMonth === 20, 'Pro plan has 20 AI template requests/month');

  // 2. Output Validator Tests
  console.log('\n--- 2. Testing AI Template Output Validator ---');
  
  // Valid Output
  const validOutput = {
    suggestions: [
      {
        name: 'order_status_alert',
        category: 'UTILITY',
        language: 'en_US',
        body: 'Hello {{1}}, your order #{{2}} is now {{3}}. Track here: {{4}}',
        variables: [
          { position: 1, meaning: 'Customer Name' },
          { position: 2, meaning: 'Order Number' },
          { position: 3, meaning: 'Order Status' },
          { position: 4, meaning: 'Tracking URL' }
        ]
      },
      {
        name: 'order_delivery_update',
        category: 'UTILITY',
        language: 'en_US',
        body: 'Hi {{1}}, delivery for item {{2}} is scheduled for {{3}}.',
        variables: [
          { position: 1, meaning: 'Customer Name' },
          { position: 2, meaning: 'Item Name' },
          { position: 3, meaning: 'Delivery Date' }
        ]
      }
    ]
  };
  const valResult = validateAiTemplateOutput(validOutput);
  assert(valResult.valid && valResult.suggestions?.length === 2, 'Valid output passes validation');

  // Invalid: Non-sequential variables
  const nonSequential = {
    suggestions: [
      {
        name: 'fee_alert',
        category: 'UTILITY',
        language: 'en_US',
        body: 'Hi {{1}}, your balance is {{3}}.', // Skips {{2}}
        variables: [{ position: 1, meaning: 'Name' }, { position: 3, meaning: 'Amount' }]
      },
      {
        name: 'fee_alert_2',
        category: 'UTILITY',
        language: 'en_US',
        body: 'Hi {{1}}, please pay {{2}}.',
        variables: [{ position: 1, meaning: 'Name' }, { position: 2, meaning: 'Amount' }]
      }
    ]
  };
  const nonSeqResult = validateAiTemplateOutput(nonSequential);
  assert(!nonSeqResult.valid, 'Non-sequential variables rejected by validator');

  // Invalid: Single brace syntax
  const singleBrace = {
    suggestions: [
      {
        name: 'test_template',
        category: 'MARKETING',
        language: 'en_US',
        body: 'Hi {1}, check out our new deals!',
        variables: []
      },
      {
        name: 'test_template_2',
        category: 'MARKETING',
        language: 'en_US',
        body: 'Hi {{1}}, welcome back!',
        variables: [{ position: 1, meaning: 'Name' }]
      }
    ]
  };
  const singleBraceResult = validateAiTemplateOutput(singleBrace);
  assert(!singleBraceResult.valid, 'Single brace syntax {1} rejected by validator');

  // Invalid: HTML tags
  const htmlTag = {
    suggestions: [
      {
        name: 'promo_alert',
        category: 'MARKETING',
        language: 'en_US',
        body: '<b>Special Offer!</b> Get 20% off today.',
        variables: []
      },
      {
        name: 'promo_alert_2',
        category: 'MARKETING',
        language: 'en_US',
        body: 'Special offer! Get 20% off today.',
        variables: []
      }
    ]
  };
  const htmlResult = validateAiTemplateOutput(htmlTag);
  assert(!htmlResult.valid, 'HTML markup rejected by validator');

  // Invalid: Body length > 1024
  const longBody = {
    suggestions: [
      {
        name: 'long_template',
        category: 'UTILITY',
        language: 'en_US',
        body: 'A'.repeat(1050),
        variables: []
      },
      {
        name: 'long_template_2',
        category: 'UTILITY',
        language: 'en_US',
        body: 'Short valid body.',
        variables: []
      }
    ]
  };
  const longResult = validateAiTemplateOutput(longBody);
  assert(!longResult.valid, 'Over-length body (>1024 chars) rejected by validator');

  // 3. Redis Rate Limiting & Monthly Quota Test
  console.log('\n--- 3. Testing Redis Rate Limiting & Quota Tracker ---');
  const testTenantId = `test-tenant-${Date.now()}`;

  if (connection && connection.status === 'ready') {
    // Test Rate Limiter (3 requests in 10 minutes)
    const r1 = await checkAiTemplateRateLimit(testTenantId);
    const r2 = await checkAiTemplateRateLimit(testTenantId);
    const r3 = await checkAiTemplateRateLimit(testTenantId);
    const r4 = await checkAiTemplateRateLimit(testTenantId); // 4th should be blocked

    assert(r1.allowed && r2.allowed && r3.allowed, 'First 3 requests within 10 minutes are permitted');
    assert(!r4.allowed, '4th request within 10 minutes is rate limited (429)');
    assert(typeof r4.retryAfterSeconds === 'number' && r4.retryAfterSeconds > 0, 'Retry-After seconds provided');

    // Clean up rate limit key
    await connection.del(`ratelimit:ai_templates:${testTenantId}`);
  }

  console.log('\n========================================================');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runAiTestSuite();
