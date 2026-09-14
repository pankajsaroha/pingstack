export type TestSuiteType = 
  | 'unit'
  | 'integration'
  | 'e2e'
  | 'ai_eval'
  | 'rate_limit'
  | 'performance'
  | 'whatsapp_smoke'
  | 'whatsapp_e2e'
  | 'ai_real';

export type TestCategory = 'automated' | 'provider';

export type TestStatus = 'idle' | 'running' | 'passed' | 'failed' | 'skipped' | 'partial';

export interface TestStepResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'running';
  durationMs: number;
  message?: string;
  diagnostics?: Record<string, any>;
  error?: string;
}

export interface TestSuiteResult {
  suiteId: TestSuiteType;
  name: string;
  category: TestCategory;
  isRealProviderTest: boolean;
  status: TestStatus;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  steps: TestStepResult[];
  correlationId: string;
  triggeredBy: string;
  environment: 'MOCK' | 'STAGING' | 'REAL_PROVIDER';
  errorSummary?: string;
  metrics?: {
    latencyMs?: number;
    tokensUsed?: number;
    estimatedCostUsd?: number;
    messageId?: string;
    wabaId?: string;
  };
}

export interface TestEnvironmentConfig {
  workspaceId?: string;
  workspaceName?: string;
  wabaId?: string;
  senderPhone?: string;
  recipientPhone?: string;
  allowedRecipients?: string[];
  isVerified: boolean;
  lastVerifiedAt?: string;
  notes?: string;
}

export interface RunTestOptions {
  suiteId: TestSuiteType;
  adminEmail: string;
  adminUserId: string;
  dryRun?: boolean;
  customRecipient?: string;
  customPrompt?: string;
}
