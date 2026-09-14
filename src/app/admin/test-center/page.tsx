'use client';

import { useState, useEffect } from 'react';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Server,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Radio,
  Sliders,
  ChevronDown,
  ChevronRight,
  Loader2,
  Zap,
  Check,
  ChevronsDown,
  ChevronsUp,
  KeyRound,
  ShieldAlert,
  Send,
  Workflow,
  BellRing,
  Code,
  Gauge,
  Rocket,
} from 'lucide-react';
import { TestSuiteType, TestSuiteResult, TestEnvironmentConfig } from '@/lib/server/admin-tests/types';

interface WorkspaceOption {
  id: string;
  name: string;
  hasWaAccount: boolean;
  displayPhone?: string;
}

export default function AdminTestCenterPage() {
  const [activeTab, setActiveTab] = useState<'automated' | 'provider'>('automated');
  const [results, setResults] = useState<Record<string, TestSuiteResult | null>>({});
  const [runningSuite, setRunningSuite] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Test Environment Configuration
  const [envConfig, setEnvConfig] = useState<TestEnvironmentConfig>({ isVerified: false, allowedRecipients: [] });
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    workspaceId: '',
    recipientPhone: '',
    allowedRecipientsText: '',
    notes: '',
  });

  // Selected Recipient for Real Test
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');

  // Real Test Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    suiteId: TestSuiteType | null;
    title: string;
    description: string;
    isReal: boolean;
  }>({
    open: false,
    suiteId: null,
    title: '',
    description: '',
    isReal: false,
  });

  const [dryRun, setDryRun] = useState(true);

  // UI Accordion States: Collapsed by Default!
  const [suiteExpanded, setSuiteExpanded] = useState<Record<string, boolean>>({});
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const toggleSuiteExpand = (suiteId: string) => {
    setSuiteExpanded((prev) => ({ ...prev, [suiteId]: !prev[suiteId] }));
  };

  const toggleStepExpand = (key: string) => {
    setExpandedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAllSuites = () => {
    const all: Record<string, boolean> = {};
    automatedSuites.forEach((s) => (all[s.id] = true));
    providerSuites.forEach((s) => (all[s.id] = true));
    setSuiteExpanded(all);
  };

  const collapseAllSuites = () => {
    setSuiteExpanded({});
    setExpandedSteps({});
  };

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [resRun, resConfig] = await Promise.all([
        fetch('/api/admin/test-center/run').then((r) => r.json()),
        fetch('/api/admin/test-center/config').then((r) => r.json()),
      ]);

      if (resRun.results) setResults(resRun.results);
      if (resConfig.config) {
        setEnvConfig(resConfig.config);
        const allowed = resConfig.config.allowedRecipients || [];
        setConfigForm({
          workspaceId: resConfig.config.workspaceId || '',
          recipientPhone: resConfig.config.recipientPhone || allowed[0] || '',
          allowedRecipientsText: allowed.join(', '),
          notes: resConfig.config.notes || '',
        });
        if (allowed.length > 0) {
          setSelectedRecipient(resConfig.config.recipientPhone || allowed[0]);
        }
      }
      if (resConfig.availableWorkspaces) setWorkspaces(resConfig.availableWorkspaces);
    } catch (err) {
      console.error('Failed to load Test Center state:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunSuite = async (suiteId: TestSuiteType | 'all_automated', forceDryRun?: boolean) => {
    setRunningSuite(suiteId);
    try {
      const isDry = forceDryRun !== undefined ? forceDryRun : dryRun;
      const res = await fetch('/api/admin/test-center/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suiteId,
          dryRun: isDry,
          customRecipient: selectedRecipient || envConfig.recipientPhone,
        }),
      });

      const json = await res.json();
      if (json.result) {
        setResults((prev) => ({ ...prev, [json.result.suiteId]: json.result }));
      } else if (json.results && Array.isArray(json.results)) {
        const next = { ...results };
        json.results.forEach((r: TestSuiteResult) => {
          next[r.suiteId] = r;
        });
        setResults(next);
      }
    } catch (err) {
      console.error(`Failed to run test suite ${suiteId}:`, err);
    } finally {
      setRunningSuite(null);
      setConfirmModal({ open: false, suiteId: null, title: '', description: '', isReal: false });
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const allowed = configForm.allowedRecipientsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/admin/test-center/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: configForm.workspaceId,
          recipientPhone: configForm.recipientPhone,
          allowedRecipients: allowed,
          notes: configForm.notes,
        }),
      });
      const json = await res.json();
      if (json.config) {
        setEnvConfig(json.config);
        setShowConfigModal(false);
        if (json.config.allowedRecipients?.length) {
          setSelectedRecipient(json.config.recipientPhone || json.config.allowedRecipients[0]);
        }
      }
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSavingConfig(false);
    }
  };

  const triggerRealProviderConfirm = (suiteId: TestSuiteType, title: string, isReal: boolean) => {
    if (isReal && !dryRun) {
      setConfirmModal({
        open: true,
        suiteId,
        title,
        description: 'You are about to execute a real provider test. This will send actual network requests.',
        isReal: true,
      });
    } else {
      handleRunSuite(suiteId, dryRun);
    }
  };

  const automatedSuites: Array<{ id: TestSuiteType; title: string; desc: string; icon: any }> = [
    { id: 'unit', title: 'Unit Tests (9 Steps)', desc: 'Template variable substitution, multi-variable bounds, phone number normalization, AI validators, JWT integrity, and markdown parsing.', icon: CheckCircle2 },
    { id: 'integration', title: 'Integration Tests (26 Steps)', desc: '17 Schedule Campaign lifecycle cases, Developer API (/api/v1) auth, Automations engine keyword matching, out-of-order webhook delivery, Web Push payloads, and tenant isolation.', icon: Server },
    { id: 'e2e', title: 'E2E Application Flow (7 Steps)', desc: 'Deterministic mock simulation: Contact Ingestion -> Template Selection -> Queue Dispatch -> Delivery Status -> Inbox.', icon: Radio },
    { id: 'ai_eval', title: 'AI Template Evaluation (11 Cases)', desc: 'Validates 10+ enterprise use cases against sequential numbering {{1}}, JSON schemas, category bounds, and prompt injection defense.', icon: Sparkles },
    { id: 'rate_limit', title: 'Pingstack API Rate Limits (5 Steps)', desc: 'Token-bucket bursts, sliding window endpoints, atomic concurrency, and plan tier differentiation.', icon: Zap },
    { id: 'performance', title: 'Performance & Latency Benchmarks (8 Steps)', desc: 'Template regex speed, webhook parser throughput, batch phone normalization, JWT crypto, mocked AI & Onboarding orchestration, and 3x latency regression guardrails.', icon: Gauge },
    { id: 'meta_limits', title: 'Meta WhatsApp Messaging Limits & Quotas (20 Cases)', desc: 'Tier parsing (250/1k/10k/100k/unlimited), rolling 24h unique recipient tracking, customer-service 24h window exemption, fail-open resilience, pre-flight warnings, and webhook cache updates.', icon: ShieldAlert },
    { id: 'onboarding_perf', title: 'WhatsApp Onboarding Performance & Reliability (18 Cases)', desc: 'Parallel asset discovery, critical path isolation from template sync, transient error retries (503/429), non-retryable fast-fails (400/403/190), idempotency/replay, and latency regression guardrails.', icon: Rocket },
  ];

  const providerSuites: Array<{ id: TestSuiteType; title: string; desc: string; isReal: boolean; icon: any }> = [
    {
      id: 'whatsapp_smoke',
      title: 'WhatsApp Smoke Test',
      desc: 'Verifies designated test workspace credentials, WABA connectivity, template readiness, allowlist check, and controlled dispatch.',
      isReal: true,
      icon: MessageSquare,
    },
    {
      id: 'whatsapp_e2e',
      title: 'Real WhatsApp E2E Test',
      desc: 'Full stage-by-stage verification: Admin API -> Meta Provider -> Persistence -> Webhook Status -> Recipient Inbox record.',
      isReal: true,
      icon: Radio,
    },
    {
      id: 'ai_real',
      title: 'Real OpenAI API Test',
      desc: 'Controlled gpt-4o-mini request measuring round-trip latency (ms), token usage, cost estimation, and output schema validation.',
      isReal: true,
      icon: Sparkles,
    },
  ];

  // Launch Readiness Domains (17 Subsystems)
  const launchReadinessDomains = [
    { name: 'Authentication', isPassing: results['unit']?.status === 'passed' && results['integration']?.status === 'passed', icon: KeyRound },
    { name: 'WhatsApp Setup', isPassing: envConfig.isVerified, liveCheckRequired: !envConfig.isVerified, icon: MessageSquare },
    { name: 'Onboarding Engine', isPassing: results['onboarding_perf']?.status === 'passed', icon: Rocket },
    { name: 'Messaging Pipeline', isPassing: results['unit']?.status === 'passed' && results['e2e']?.status === 'passed', icon: Send },
    { name: 'Meta Limits & Quotas', isPassing: results['meta_limits']?.status === 'passed', icon: ShieldAlert },
    { name: 'Webhooks Correlation', isPassing: results['integration']?.status === 'passed', icon: Radio },
    { name: 'Inbox State', isPassing: results['e2e']?.status === 'passed', icon: MessageSquare },
    { name: 'Contacts & CSV', isPassing: results['unit']?.status === 'passed' && results['integration']?.status === 'passed', icon: Server },
    { name: 'Groups & Dedup', isPassing: results['integration']?.status === 'passed', icon: Server },
    { name: 'Templates Engine', isPassing: results['unit']?.status === 'passed', icon: Server },
    { name: 'Scheduled Campaigns', isPassing: results['integration']?.status === 'passed', icon: Clock },
    { name: 'Automations Engine', isPassing: results['integration']?.status === 'passed', icon: Workflow },
    { name: 'Push & PWA', isPassing: results['integration']?.status === 'passed', icon: BellRing },
    { name: 'Developer API (/v1)', isPassing: results['integration']?.status === 'passed', icon: Code },
    { name: 'AI Templates', isPassing: results['ai_eval']?.status === 'passed', icon: Sparkles },
    { name: 'Rate Limits', isPassing: results['rate_limit']?.status === 'passed', icon: Zap },
    { name: 'Performance & Budgets', isPassing: results['performance']?.status === 'passed', icon: Gauge },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="text-xs font-mono text-zinc-500">Initializing Admin Test Center...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── HEADER ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FlaskConical className="w-4 h-4" />
            </div>
            <span>Admin Test Center</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Production-grade test orchestration, deterministic automated regression suites, and controlled live provider diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-500' : 'text-zinc-400'}`} />
            <span>Refresh State</span>
          </button>

          <button
            onClick={() => handleRunSuite('all_automated')}
            disabled={runningSuite !== null}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {runningSuite === 'all_automated' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running All Suites...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run All Automated Tests</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── 1. PRODUCTION LAUNCH READINESS GRID ──────────────── */}
      <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-3 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">
              Production Launch Readiness Matrix (14 Subsystems)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">Evaluated against automated suites & provider configuration</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {launchReadinessDomains.map((dom) => {
            const Icon = dom.icon;
            return (
              <div
                key={dom.name}
                className="p-2.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800/40 bg-zinc-50/60 dark:bg-zinc-950/40 flex flex-col justify-between gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <Icon className="w-3.5 h-3.5 text-zinc-400" />
                  {dom.liveCheckRequired ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      LIVE CHECK
                    </span>
                  ) : dom.isPassing ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> PASS
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
                      PENDING
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 truncate">{dom.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TABS & EXPAND TOGGLE ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800/80 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('automated')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'automated'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Automated Suites (Mock & Deterministic)</span>
            <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-mono">
              SAFE (78 TESTS)
            </span>
          </button>

          <button
            onClick={() => setActiveTab('provider')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'provider'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Provider Tests (WhatsApp & OpenAI)</span>
            <span className="px-1.5 py-0.2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded text-[10px] font-mono">
              LIVE / DRY RUN
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={expandAllSuites}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
          >
            <ChevronsDown className="w-3.5 h-3.5" />
            <span>Expand All</span>
          </button>
          <button
            onClick={collapseAllSuites}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
          >
            <ChevronsUp className="w-3.5 h-3.5" />
            <span>Collapse All</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: AUTOMATED SUITES ───────────────────────────── */}
      {activeTab === 'automated' && (
        <div className="space-y-4">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                Automated tests execute against deterministic mocks and application services. They never call live Meta or OpenAI APIs and incur <strong>$0 provider charges</strong>.
              </span>
            </div>
            <div className="text-[11px] font-mono text-zinc-500 hidden md:block">CI Runner: <code>npm run test:admin</code></div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {automatedSuites.map((suite) => {
              const res = results[suite.id];
              const isRunning = runningSuite === suite.id;
              const isExpanded = !!suiteExpanded[suite.id];
              const Icon = suite.icon;

              return (
                <div
                  key={suite.id}
                  className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs transition-all"
                >
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-xs font-bold text-zinc-900 dark:text-white">{suite.title}</h3>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                            SAFE / MOCK
                          </span>
                          {res ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                                res.status === 'passed'
                                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {res.status} ({res.passedCount}/{res.totalTests})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
                              NOT RUN YET
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-2xl">{suite.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {res && (
                        <div className="text-right text-[11px] font-mono text-zinc-500">
                          <div>{res.durationMs}ms</div>
                          <div className="text-[10px] text-zinc-400">{new Date(res.startedAt).toLocaleTimeString()}</div>
                        </div>
                      )}

                      {res && res.steps && res.steps.length > 0 && (
                        <button
                          onClick={() => toggleSuiteExpand(suite.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Steps' : `Show Steps (${res.steps.length})`}</span>
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      <button
                        onClick={() => handleRunSuite(suite.id)}
                        disabled={isRunning}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isRunning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Running...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>Run Suite</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Step details: Collapsed by Default, shown only when isExpanded is true */}
                  {isExpanded && res && res.steps && res.steps.length > 0 && (
                    <div className="border-t border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/40 p-3">
                      <div className="space-y-1.5">
                        {res.steps.map((step) => {
                          const stepKey = `${res.suiteId}_${step.id}`;
                          const isStepExpanded = !!expandedSteps[stepKey];
                          return (
                            <div
                              key={step.id}
                              className="text-xs border border-zinc-200/60 dark:border-zinc-800/40 rounded-lg bg-white dark:bg-zinc-900/40 overflow-hidden"
                            >
                              <div
                                onClick={() => toggleStepExpand(stepKey)}
                                className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {step.status === 'passed' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  )}
                                  <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{step.name}</span>
                                  {step.message && (
                                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate hidden md:inline">
                                      — {step.message}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] font-mono text-zinc-400">{step.durationMs}ms</span>
                                  {isStepExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                                  )}
                                </div>
                              </div>

                              {isStepExpanded && (
                                <div className="p-3 border-t border-zinc-200/40 dark:border-zinc-800/40 bg-zinc-50/80 dark:bg-zinc-950/80 space-y-2">
                                  {step.error && (
                                    <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded text-xs font-mono">
                                      {step.error}
                                    </div>
                                  )}
                                  {step.diagnostics && (
                                    <pre className="p-2.5 bg-black/5 dark:bg-black/40 rounded text-[11px] font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto">
                                      {JSON.stringify(step.diagnostics, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: PROVIDER TESTS ─────────────────────────────── */}
      {activeTab === 'provider' && (
        <div className="space-y-5">
          {/* Designated Test Environment Card */}
          <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">
                  Designated Internal Test Environment Configuration
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(true)}
                className="px-2.5 py-1 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg transition-colors cursor-pointer"
              >
                Configure Environment & Allowlist
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-lg border border-zinc-200/60 dark:border-zinc-800/40">
                <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Designated Test Workspace</div>
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1 truncate">
                  {envConfig.workspaceName || 'Not Assigned'}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-lg border border-zinc-200/60 dark:border-zinc-800/40">
                <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Sender WABA / Phone</div>
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1 truncate">
                  {envConfig.senderPhone || (envConfig.wabaId ? `WABA: ${envConfig.wabaId}` : 'Sandbox / Mock')}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-lg border border-zinc-200/60 dark:border-zinc-800/40">
                <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Allowlisted Recipient Target</div>
                <div className="mt-1">
                  {envConfig.allowedRecipients && envConfig.allowedRecipients.length > 0 ? (
                    <select
                      value={selectedRecipient}
                      onChange={(e) => setSelectedRecipient(e.target.value)}
                      className="w-full text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-0.5 text-zinc-800 dark:text-zinc-200"
                    >
                      {envConfig.allowedRecipients.map((phone) => (
                        <option key={phone} value={phone}>
                          +{phone.replace(/\D/g, '').slice(0, 3)}******{phone.replace(/\D/g, '').slice(-4)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs text-rose-500 font-mono">No recipients allowlisted</div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-lg border border-zinc-200/60 dark:border-zinc-800/40">
                <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Execution Mode</div>
                <div className="flex items-center gap-2 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={dryRun}
                      onChange={(e) => setDryRun(e.target.checked)}
                      className="w-3.5 h-3.5 text-indigo-600 rounded"
                    />
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {dryRun ? 'Dry Run Mode (Safe)' : 'REAL PROVIDER'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {!dryRun && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Caution: Real Provider Mode Active.</strong> Executing provider tests in this mode will dispatch live messages via Meta Cloud API or OpenAI.
                </span>
              </div>
            )}
          </div>

          {/* Provider Suites List */}
          <div className="grid grid-cols-1 gap-3">
            {providerSuites.map((suite) => {
              const res = results[suite.id];
              const isRunning = runningSuite === suite.id;
              const isExpanded = !!suiteExpanded[suite.id];
              const Icon = suite.icon;

              return (
                <div
                  key={suite.id}
                  className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs transition-all"
                >
                  <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-xs font-bold text-zinc-900 dark:text-white">{suite.title}</h3>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-mono font-semibold uppercase ${
                              dryRun
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {dryRun ? 'DRY RUN (MOCK)' : 'REAL PROVIDER'}
                          </span>
                          {res && (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                                res.status === 'passed'
                                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {res.status} ({res.passedCount}/{res.totalTests})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-2xl">{suite.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {res && (
                        <div className="text-right text-[11px] font-mono text-zinc-500">
                          <div>{res.durationMs}ms</div>
                          {res.metrics?.estimatedCostUsd !== undefined && (
                            <div className="text-[10px] text-emerald-500 font-semibold">
                              ${res.metrics.estimatedCostUsd.toFixed(6)}
                            </div>
                          )}
                        </div>
                      )}

                      {res && res.steps && res.steps.length > 0 && (
                        <button
                          onClick={() => toggleSuiteExpand(suite.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide Steps' : `Show Steps (${res.steps.length})`}</span>
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      <button
                        onClick={() => triggerRealProviderConfirm(suite.id, suite.title, suite.isReal)}
                        disabled={isRunning}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                          dryRun
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100'
                            : 'bg-rose-600 hover:bg-rose-700 text-white'
                        }`}
                      >
                        {isRunning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Executing...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>{dryRun ? 'Run Dry Run' : 'Run Real Test'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Step diagnostics: Collapsed by Default */}
                  {isExpanded && res && res.steps && (
                    <div className="border-t border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/40 p-3">
                      <div className="space-y-1.5">
                        {res.steps.map((step) => {
                          const stepKey = `${res.suiteId}_${step.id}`;
                          const isStepExpanded = !!expandedSteps[stepKey];
                          return (
                            <div
                              key={step.id}
                              className="text-xs border border-zinc-200/60 dark:border-zinc-800/40 rounded-lg bg-white dark:bg-zinc-900/40 overflow-hidden"
                            >
                              <div
                                onClick={() => toggleStepExpand(stepKey)}
                                className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {step.status === 'passed' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  )}
                                  <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{step.name}</span>
                                  {step.message && (
                                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate hidden md:inline">
                                      — {step.message}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] font-mono text-zinc-400">{step.durationMs}ms</span>
                                  {isStepExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                                  )}
                                </div>
                              </div>

                              {isStepExpanded && step.diagnostics && (
                                <div className="p-3 border-t border-zinc-200/40 dark:border-zinc-800/40 bg-zinc-50/80 dark:bg-zinc-950/80">
                                  <pre className="p-2 bg-black/5 dark:bg-black/40 rounded text-[11px] font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto">
                                    {JSON.stringify(step.diagnostics, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ENVIRONMENT CONFIGURATION MODAL ───────────────────── */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Designate Internal Test Environment & Allowlist</h3>
              <button onClick={() => setShowConfigModal(false)} className="text-zinc-400 hover:text-zinc-600 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Designated Internal Test Workspace
                </label>
                <select
                  value={configForm.workspaceId}
                  onChange={(e) => setConfigForm({ ...configForm, workspaceId: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">-- Select Designated Test Workspace --</option>
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.hasWaAccount ? `(WhatsApp: ${w.displayPhone || 'Connected'})` : '(No WhatsApp)'}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Customer workspaces are strictly excluded. Only designated internal test environments can be selected.
                </p>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Test Recipient Allowlist (Comma-separated phone numbers)
                </label>
                <input
                  type="text"
                  placeholder="+919876543210, +919876543211"
                  value={configForm.allowedRecipientsText}
                  onChange={(e) => setConfigForm({ ...configForm, allowedRecipientsText: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Safety Lock: Real messages can ONLY be dispatched to numbers in this verified allowlist.
                </p>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Audit Notes / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Pre-production launch verification"
                  value={configForm.notes}
                  onChange={(e) => setConfigForm({ ...configForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {savingConfig ? 'Saving...' : 'Save & Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REAL TEST CONFIRMATION MODAL ──────────────────────── */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-9 h-9 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{confirmModal.title}</h3>
                <p className="text-[11px] text-zinc-500">Real Provider Execution Confirmation</p>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500">Sender:</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-bold">
                  {envConfig.workspaceName || 'PingStack Internal Test'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Recipient (Allowlisted):</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-bold">
                  {selectedRecipient ? `+${selectedRecipient.replace(/\D/g, '').slice(0, 3)}******${selectedRecipient.replace(/\D/g, '').slice(-4)}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Environment:</span>
                <span className="text-rose-500 font-bold">REAL WHATSAPP / OPENAI</span>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              This message will be sent through WhatsApp/OpenAI and may incur provider charges.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setConfirmModal({ open: false, suiteId: null, title: '', description: '', isReal: false })}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmModal.suiteId && handleRunSuite(confirmModal.suiteId, false)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                Run Real Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
