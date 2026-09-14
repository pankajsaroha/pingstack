/**
 * Server-Side Latency Telemetry & Performance Histogram System
 * Tracks P50, P95, P99, Avg, Max, Count, and Error Rates across all critical flows.
 */

export type FlowCategory = 
  | 'AUTH'
  | 'WHATSAPP_ONBOARDING'
  | 'INBOX'
  | 'CAMPAIGNS'
  | 'CONTACTS'
  | 'TEMPLATES'
  | 'DEVELOPER_API';

export type StageType = 
  | 'request_latency'
  | 'db_latency'
  | 'external_api_latency'
  | 'queue_wait_time'
  | 'worker_execution_time'
  | 'webhook_processing_latency'
  | 'end_to_end_latency';

export interface LatencySample {
  timestamp: number;
  flow: FlowCategory;
  operation: string;
  stage: StageType;
  durationMs: number;
  isError: boolean;
  metadata?: Record<string, any>;
}

export interface PercentileStats {
  count: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  minMs: number;
  errorRatePercent: number;
}

export interface FlowMetricsSummary {
  flow: FlowCategory;
  totalRequests: number;
  errorRate: number;
  overall: PercentileStats;
  stages: Record<string, PercentileStats>;
  operations: Record<string, PercentileStats>;
}

export interface PerformanceReport {
  timestamp: string;
  sampleCount: number;
  flows: Record<FlowCategory, FlowMetricsSummary>;
  slowestEndpoints: Array<{
    operation: string;
    flow: FlowCategory;
    p95Ms: number;
    avgMs: number;
    count: number;
    errorRate: number;
  }>;
  onboardingFunnel: {
    attempts: number;
    successful: number;
    failed: number;
    avgDurationMs: number;
    p95DurationMs: number;
    stepDurations: Record<string, number>;
  };
  messagingStats: {
    sendRequestP95: number;
    providerP95: number;
    webhookP95: number;
    e2eP95: number;
    pushDispatchP95: number;
  };
  alerts: Array<{
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    flow: FlowCategory;
    thresholdMs: number;
    actualP95Ms: number;
  }>;
}

// In-Memory Circular Buffer for fast, non-blocking telemetry (Max 2,000 recent samples)
const MAX_SAMPLES = 2000;
const sampleBuffer: LatencySample[] = [];

/**
 * Record a latency measurement sample
 */
export function recordLatency(
  flow: FlowCategory,
  operation: string,
  stage: StageType,
  durationMs: number,
  isError = false,
  metadata?: Record<string, any>
): void {
  const sample: LatencySample = {
    timestamp: Date.now(),
    flow,
    operation,
    stage,
    durationMs: Math.max(0, Math.round(durationMs * 10) / 10),
    isError,
    metadata
  };

  if (sampleBuffer.length >= MAX_SAMPLES) {
    sampleBuffer.shift();
  }
  sampleBuffer.push(sample);
}

/**
 * Measure execution time of a synchronous or asynchronous code block
 */
export async function measureStage<T>(
  flow: FlowCategory,
  operation: string,
  stage: StageType,
  fn: () => Promise<T> | T
): Promise<T> {
  const start = performance.now();
  let isError = false;
  try {
    return await fn();
  } catch (err) {
    isError = true;
    throw err;
  } finally {
    const elapsed = performance.now() - start;
    recordLatency(flow, operation, stage, elapsed, isError);
  }
}

/**
 * Calculate percentiles and summary statistics from an array of durations
 */
export function calculatePercentiles(durations: number[], totalCount: number, errorCount: number): PercentileStats {
  if (durations.length === 0) {
    return {
      count: totalCount,
      avgMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
      maxMs: 0,
      minMs: 0,
      errorRatePercent: totalCount > 0 ? Math.round((errorCount / totalCount) * 1000) / 10 : 0
    };
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = sum / sorted.length;

  const getPercentile = (p: number) => {
    const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return sorted[index];
  };

  return {
    count: totalCount,
    avgMs: Math.round(avg * 10) / 10,
    p50Ms: Math.round(getPercentile(50) * 10) / 10,
    p95Ms: Math.round(getPercentile(95) * 10) / 10,
    p99Ms: Math.round(getPercentile(99) * 10) / 10,
    maxMs: Math.round(sorted[sorted.length - 1] * 10) / 10,
    minMs: Math.round(sorted[0] * 10) / 10,
    errorRatePercent: totalCount > 0 ? Math.round((errorCount / totalCount) * 1000) / 10 : 0
  };
}

/**
 * Standard performance budgets in milliseconds for critical flows
 */
export const PERFORMANCE_BUDGETS: Record<string, { p95: number; description: string }> = {
  'AUTH:login': { p95: 350, description: 'User login & password verification' },
  'AUTH:session': { p95: 150, description: 'Session restoration' },
  'WHATSAPP_ONBOARDING:discover': { p95: 800, description: 'WABA & Phone Discovery' },
  'WHATSAPP_ONBOARDING:finish': { p95: 950, description: 'WABA Webhook & Phone Registration' },
  'INBOX:conversations': { p95: 250, description: 'Inbox conversation list load' },
  'INBOX:messages': { p95: 180, description: 'Conversation message thread load' },
  'INBOX:send_text': { p95: 120, description: 'Direct message enqueue' },
  'CAMPAIGNS:create': { p95: 200, description: 'Campaign save & enqueue' },
  'CONTACTS:upload_csv': { p95: 900, description: 'CSV/Excel 1,000-contact import' },
  'TEMPLATES:list': { p95: 200, description: 'Template list retrieval' },
  'DEVELOPER_API:v1_messages': { p95: 120, description: 'Developer API message dispatch' }
};

/**
 * Generate full real-time Performance Report
 */
export function generatePerformanceReport(): PerformanceReport {
  const flows: FlowCategory[] = [
    'AUTH',
    'WHATSAPP_ONBOARDING',
    'INBOX',
    'CAMPAIGNS',
    'CONTACTS',
    'TEMPLATES',
    'DEVELOPER_API'
  ];

  const flowSummaries: Record<FlowCategory, FlowMetricsSummary> = {} as any;

  // Initialize flow structures
  for (const flow of flows) {
    const flowSamples = sampleBuffer.filter(s => s.flow === flow);
    const durations = flowSamples.map(s => s.durationMs);
    const errors = flowSamples.filter(s => s.isError).length;

    // Group by stage
    const stages: Record<string, PercentileStats> = {};
    const stagesMap = new Map<string, LatencySample[]>();
    for (const sample of flowSamples) {
      if (!stagesMap.has(sample.stage)) stagesMap.set(sample.stage, []);
      stagesMap.get(sample.stage)!.push(sample);
    }
    stagesMap.forEach((samples, stageName) => {
      stages[stageName] = calculatePercentiles(
        samples.map(s => s.durationMs),
        samples.length,
        samples.filter(s => s.isError).length
      );
    });

    // Group by operation
    const operations: Record<string, PercentileStats> = {};
    const opMap = new Map<string, LatencySample[]>();
    for (const sample of flowSamples) {
      if (!opMap.has(sample.operation)) opMap.set(sample.operation, []);
      opMap.get(sample.operation)!.push(sample);
    }
    opMap.forEach((samples, opName) => {
      operations[opName] = calculatePercentiles(
        samples.map(s => s.durationMs),
        samples.length,
        samples.filter(s => s.isError).length
      );
    });

    flowSummaries[flow] = {
      flow,
      totalRequests: flowSamples.length,
      errorRate: flowSamples.length > 0 ? Math.round((errors / flowSamples.length) * 1000) / 10 : 0,
      overall: calculatePercentiles(durations, flowSamples.length, errors),
      stages,
      operations
    };
  }

  // Calculate Slowest Endpoints
  const allOps = new Map<string, { flow: FlowCategory; samples: LatencySample[] }>();
  for (const sample of sampleBuffer) {
    const key = `${sample.flow}:${sample.operation}`;
    if (!allOps.has(key)) allOps.set(key, { flow: sample.flow, samples: [] });
    allOps.get(key)!.samples.push(sample);
  }

  const slowestEndpoints: PerformanceReport['slowestEndpoints'] = [];
  allOps.forEach((val, key) => {
    const durations = val.samples.map(s => s.durationMs);
    const errors = val.samples.filter(s => s.isError).length;
    const stats = calculatePercentiles(durations, val.samples.length, errors);
    slowestEndpoints.push({
      operation: key,
      flow: val.flow,
      p95Ms: stats.p95Ms,
      avgMs: stats.avgMs,
      count: stats.count,
      errorRate: stats.errorRatePercent
    });
  });
  slowestEndpoints.sort((a, b) => b.p95Ms - a.p95Ms);

  // Onboarding Funnel Stats
  const onboardingSamples = sampleBuffer.filter(s => s.flow === 'WHATSAPP_ONBOARDING');
  const onboardingSuccess = onboardingSamples.filter(s => !s.isError).length;
  const onboardingFailed = onboardingSamples.filter(s => s.isError).length;
  const onboardingStats = calculatePercentiles(
    onboardingSamples.map(s => s.durationMs),
    onboardingSamples.length,
    onboardingFailed
  );

  // Messaging Metrics
  const msgSendSamples = sampleBuffer.filter(s => s.flow === 'INBOX' && s.operation.includes('send'));
  const providerSamples = sampleBuffer.filter(s => s.stage === 'external_api_latency');
  const webhookSamples = sampleBuffer.filter(s => s.stage === 'webhook_processing_latency');
  const pushSamples = sampleBuffer.filter(s => s.operation.includes('push'));

  const alerts: PerformanceReport['alerts'] = [];
  for (const [key, budget] of Object.entries(PERFORMANCE_BUDGETS)) {
    const [flowName, opName] = key.split(':');
    const flowObj = flowSummaries[flowName as FlowCategory];
    const opStats = flowObj?.operations[opName];
    if (opStats && opStats.count >= 3 && opStats.p95Ms > budget.p95) {
      alerts.push({
        severity: opStats.p95Ms > budget.p95 * 1.5 ? 'CRITICAL' : 'WARNING',
        message: `${budget.description} P95 (${opStats.p95Ms}ms) exceeded performance budget (${budget.p95}ms)`,
        flow: flowName as FlowCategory,
        thresholdMs: budget.p95,
        actualP95Ms: opStats.p95Ms
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    sampleCount: sampleBuffer.length,
    flows: flowSummaries,
    slowestEndpoints: slowestEndpoints.slice(0, 10),
    onboardingFunnel: {
      attempts: onboardingSamples.length,
      successful: onboardingSuccess,
      failed: onboardingFailed,
      avgDurationMs: onboardingStats.avgMs,
      p95DurationMs: onboardingStats.p95Ms,
      stepDurations: {
        discover: flowSummaries.WHATSAPP_ONBOARDING.operations['discover']?.avgMs || 0,
        register: flowSummaries.WHATSAPP_ONBOARDING.operations['register']?.avgMs || 0,
        finish: flowSummaries.WHATSAPP_ONBOARDING.operations['finish']?.avgMs || 0
      }
    },
    messagingStats: {
      sendRequestP95: calculatePercentiles(msgSendSamples.map(s => s.durationMs), msgSendSamples.length, 0).p95Ms,
      providerP95: calculatePercentiles(providerSamples.map(s => s.durationMs), providerSamples.length, 0).p95Ms,
      webhookP95: calculatePercentiles(webhookSamples.map(s => s.durationMs), webhookSamples.length, 0).p95Ms,
      e2eP95: flowSummaries.INBOX.overall.p95Ms,
      pushDispatchP95: calculatePercentiles(pushSamples.map(s => s.durationMs), pushSamples.length, 0).p95Ms
    },
    alerts
  };
}

// Seed baseline samples on server boot for instant metric visualization
if (sampleBuffer.length === 0) {
  const seeds: Array<[FlowCategory, string, StageType, number, boolean]> = [
    ['AUTH', 'login', 'request_latency', 115, false],
    ['AUTH', 'login', 'db_latency', 45, false],
    ['AUTH', 'session', 'request_latency', 32, false],
    ['WHATSAPP_ONBOARDING', 'discover', 'external_api_latency', 380, false],
    ['WHATSAPP_ONBOARDING', 'register', 'external_api_latency', 290, false],
    ['WHATSAPP_ONBOARDING', 'finish', 'request_latency', 420, false],
    ['INBOX', 'conversations', 'db_latency', 68, false],
    ['INBOX', 'messages', 'db_latency', 42, false],
    ['INBOX', 'send_text', 'queue_wait_time', 12, false],
    ['INBOX', 'meta_webhook', 'webhook_processing_latency', 45, false],
    ['CAMPAIGNS', 'create', 'db_latency', 85, false],
    ['CAMPAIGNS', 'worker_dispatch', 'worker_execution_time', 110, false],
    ['CONTACTS', 'search', 'db_latency', 35, false],
    ['CONTACTS', 'upload_csv', 'request_latency', 340, false],
    ['TEMPLATES', 'list', 'db_latency', 52, false],
    ['TEMPLATES', 'meta_sync', 'external_api_latency', 410, false],
    ['DEVELOPER_API', 'v1_messages', 'request_latency', 72, false],
    ['DEVELOPER_API', 'v1_contacts', 'request_latency', 64, false]
  ];

  for (const [flow, op, stage, dur, err] of seeds) {
    recordLatency(flow, op, stage, dur, err);
  }
}
