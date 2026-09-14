import { TestSuiteType, TestSuiteResult, RunTestOptions } from './types';
import { runUnitTests, runIntegrationTests, runE2ETests, runAiEvaluationTests, runRateLimitTests, runPerformanceTests, runMetaMessagingLimitsTests } from './automated-suite';
import { runWhatsAppSmokeTest, runRealWhatsAppE2ETest, runRealAiTest } from './provider-tests';
import { logAdminAudit } from '@/lib/server/admin-audit';
import { connection } from '@/lib/queue';

const TEST_RESULTS_REDIS_KEY_PREFIX = 'admin:test_center:results:';

/**
 * Generate a unique correlation ID for a test run
 */
export function generateCorrelationId(suiteId: string): string {
  return `test_${suiteId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Persist test suite result in Redis for recent run history
 */
async function saveTestResult(result: TestSuiteResult): Promise<void> {
  if (connection && connection.status === 'ready') {
    try {
      const key = `${TEST_RESULTS_REDIS_KEY_PREFIX}${result.suiteId}`;
      await connection.set(key, JSON.stringify(result), 'EX', 86400 * 7); // keep 7 days
    } catch (e) {
      console.warn('[saveTestResult] Redis save failed:', e);
    }
  }
}

/**
 * Retrieve the latest test result for a suite from Redis
 */
export async function getLatestTestResult(suiteId: TestSuiteType): Promise<TestSuiteResult | null> {
  if (connection && connection.status === 'ready') {
    try {
      const key = `${TEST_RESULTS_REDIS_KEY_PREFIX}${suiteId}`;
      const raw = await connection.get(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('[getLatestTestResult] Redis read failed:', e);
    }
  }
  return null;
}

/**
 * Retrieve all latest test results for the Test Center dashboard
 */
export async function getAllLatestResults(): Promise<Record<TestSuiteType, TestSuiteResult | null>> {
  const suites: TestSuiteType[] = [
    'unit',
    'integration',
    'e2e',
    'ai_eval',
    'rate_limit',
    'performance',
    'meta_limits',
    'whatsapp_smoke',
    'whatsapp_e2e',
    'ai_real',
  ];

  const results: Partial<Record<TestSuiteType, TestSuiteResult | null>> = {};
  for (const s of suites) {
    results[s] = await getLatestTestResult(s);
  }

  return results as Record<TestSuiteType, TestSuiteResult | null>;
}

/**
 * Execute any test suite with correlation ID, audit logging, and result persistence
 */
export async function runTestSuite(options: RunTestOptions): Promise<TestSuiteResult> {
  const correlationId = generateCorrelationId(options.suiteId);

  let result: TestSuiteResult;

  switch (options.suiteId) {
    case 'unit':
      result = await runUnitTests(correlationId, options.adminEmail);
      break;
    case 'integration':
      result = await runIntegrationTests(correlationId, options.adminEmail);
      break;
    case 'e2e':
      result = await runE2ETests(correlationId, options.adminEmail);
      break;
    case 'ai_eval':
      result = await runAiEvaluationTests(correlationId, options.adminEmail);
      break;
    case 'rate_limit':
      result = await runRateLimitTests(correlationId, options.adminEmail);
      break;
    case 'performance':
      result = await runPerformanceTests(correlationId, options.adminEmail);
      break;
    case 'meta_limits':
      result = await runMetaMessagingLimitsTests(correlationId, options.adminEmail);
      break;
    case 'whatsapp_smoke':
      result = await runWhatsAppSmokeTest(options, correlationId);
      break;
    case 'whatsapp_e2e':
      result = await runRealWhatsAppE2ETest(options, correlationId);
      break;
    case 'ai_real':
      result = await runRealAiTest(options, correlationId);
      break;
    default:
      throw new Error(`Unknown test suite ID: ${options.suiteId}`);
  }

  // 1. Persist result in Redis
  await saveTestResult(result);

  // 2. Record to Admin Audit Trail
  await logAdminAudit({
    adminUserId: options.adminUserId,
    adminEmail: options.adminEmail,
    action: `TEST_RUN:${options.suiteId.toUpperCase()}`,
    metadata: {
      suiteId: options.suiteId,
      correlationId,
      status: result.status,
      durationMs: result.durationMs,
      totalTests: result.totalTests,
      passedCount: result.passedCount,
      failedCount: result.failedCount,
      isRealProviderTest: result.isRealProviderTest,
      dryRun: options.dryRun,
    },
  });

  return result;
}

/**
 * Run all automated test suites sequentially
 */
export async function runAllAutomatedSuites(adminEmail: string, adminUserId: string): Promise<TestSuiteResult[]> {
  const automatedSuites: TestSuiteType[] = ['unit', 'integration', 'e2e', 'ai_eval', 'rate_limit', 'performance', 'meta_limits'];
  const results: TestSuiteResult[] = [];

  for (const suiteId of automatedSuites) {
    const res = await runTestSuite({
      suiteId,
      adminEmail,
      adminUserId,
    });
    results.push(res);
  }

  return results;
}
