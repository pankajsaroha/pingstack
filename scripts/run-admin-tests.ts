import '../src/lib/load-env';
import {
  runUnitTests,
  runIntegrationTests,
  runE2ETests,
  runAiEvaluationTests,
  runRateLimitTests,
  runPerformanceTests,
  runMetaMessagingLimitsTests,
  runOnboardingPerformanceAndReliabilityTests,
  runTeamsAndSharedInboxTests,
  runAdvancedAnalyticsSuite,
} from '../src/lib/server/admin-tests/automated-suite';

async function main() {
  console.log('\n======================================================');
  console.log('   🚀 PINGSTACK ADMIN TEST CENTER — CI / CLI RUNNER');
  console.log('======================================================\n');

  const correlationId = `ci_run_${Date.now()}`;
  const adminEmail = 'ci-system@pingstack.in';

  const suites = [
    { name: 'Unit Tests', fn: () => runUnitTests(correlationId, adminEmail) },
    { name: 'Integration Tests (inc. Schedule Campaign)', fn: () => runIntegrationTests(correlationId, adminEmail) },
    { name: 'E2E Application Flow Tests', fn: () => runE2ETests(correlationId, adminEmail) },
    { name: 'AI Template Evaluation Tests', fn: () => runAiEvaluationTests(correlationId, adminEmail) },
    { name: 'Pingstack API Rate Limit Tests', fn: () => runRateLimitTests(correlationId, adminEmail) },
    { name: 'Performance & Latency Benchmark Tests', fn: () => runPerformanceTests(correlationId, adminEmail) },
    { name: 'Meta WhatsApp Messaging Limits & Quotas Tests', fn: () => runMetaMessagingLimitsTests(correlationId, adminEmail) },
    { name: 'WhatsApp Onboarding Performance & Reliability Tests', fn: () => runOnboardingPerformanceAndReliabilityTests(correlationId, adminEmail) },
    { name: 'Teams, Shared Inbox & Conversation Assignment Tests', fn: () => runTeamsAndSharedInboxTests(correlationId, adminEmail) },
    { name: 'Advanced Analytics & Data Integrity Tests', fn: () => runAdvancedAnalyticsSuite(correlationId, adminEmail) },
  ];

  let totalAllTests = 0;
  let totalAllPassed = 0;
  let totalAllFailed = 0;

  for (const suite of suites) {
    console.log(`▶ Running ${suite.name}...`);
    try {
      const res = await suite.fn();
      totalAllTests += res.totalTests;
      totalAllPassed += res.passedCount;
      totalAllFailed += res.failedCount;

      console.log(`  Status: ${res.status.toUpperCase()} (${res.passedCount}/${res.totalTests} passed in ${res.durationMs}ms)`);
      for (const step of res.steps) {
        const icon = step.status === 'passed' ? '  ✓' : '  ✗';
        console.log(`  ${icon} [${step.durationMs}ms] ${step.name}${step.message ? ` — ${step.message}` : ''}`);
        if (step.error) {
          console.error(`      Error: ${step.error}`);
        }
      }
      console.log('');
    } catch (err: any) {
      console.error(`  ✗ Suite crashed: ${err?.message || err}\n`);
      totalAllFailed++;
    }
  }

  console.log('======================================================');
  console.log(`SUMMARY: ${totalAllPassed}/${totalAllTests} tests passed.`);
  if (totalAllFailed > 0) {
    console.error(`❌ FAILED: ${totalAllFailed} tests failed.`);
    process.exit(1);
  } else {
    console.log('🎉 ALL AUTOMATED SUITES PASSED CLEANLY.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
