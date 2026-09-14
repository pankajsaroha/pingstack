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
  ExternalLink,
  Info,
  Loader2,
  Zap,
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
  const [envConfig, setEnvConfig] = useState<TestEnvironmentConfig>({ isVerified: false });
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({ workspaceId: '', recipientPhone: '', notes: '' });

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
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const toggleStepExpand = (key: string) => {
    setExpandedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
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
        setConfigForm({
          workspaceId: resConfig.config.workspaceId || '',
          recipientPhone: resConfig.config.recipientPhone || '',
          notes: resConfig.config.notes || '',
        });
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
          customRecipient: envConfig.recipientPhone,
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
      const res = await fetch('/api/admin/test-center/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm),
      });
      const json = await res.json();
      if (json.config) {
        setEnvConfig(json.config);
        setShowConfigModal(false);
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
    { id: 'unit', title: 'Unit Tests', desc: 'Standalone templates, variable substitution, validators, JWT integrity, and markdown parsing.', icon: CheckCircle2 },
    { id: 'integration', title: 'Integration Tests (Schedule Campaign)', desc: 'Plan entitlement gating, 17 schedule campaign lifecycle cases, tenant isolation, and status correlation.', icon: Server },
    { id: 'e2e', title: 'E2E Application Flow', desc: 'Deterministic mock simulation: Contact Ingestion -> Template Selection -> Queue Dispatch -> Delivery Status -> Inbox.', icon: Radio },
    { id: 'ai_eval', title: 'AI Template Evaluation (11 Cases)', desc: 'Validates 10+ enterprise use cases against sequential numbering {{1}}, JSON schemas, category bounds, and prompt injection defense.', icon: Sparkles },
    { id: 'rate_limit', title: 'Pingstack API Rate Limits', desc: 'Token-bucket bursts, sliding window endpoints, atomic concurrency, and plan tier differentiation.', icon: Zap },
  ];

  const providerSuites: Array<{ id: TestSuiteType; title: string; desc: string; isReal: boolean; icon: any }> = [
    {
      id: 'whatsapp_smoke',
      title: 'WhatsApp Smoke Test',
      desc: 'Verifies designated test workspace credentials, WABA connectivity, template readiness, and controlled dispatch.',
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

      {/* ── TABS NAVIGATION ───────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('automated')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'automated'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Automated Suites (Mock & Deterministic)</span>
            <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-mono">
              SAFE
            </span>
          </button>

          <button
            onClick={() => setActiveTab('provider')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
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
            <div className="text-[11px] font-mono text-zinc-500">CI Compatible (scripts/run-admin-tests.ts)</div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {automatedSuites.map((suite) => {
              const res = results[suite.id];
              const isRunning = runningSuite === suite.id;
              const Icon = suite.icon;

              return (
                <div
                  key={suite.id}
                  className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs transition-all"
                >
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{suite.title}</h3>
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
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">{suite.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {res && (
                        <div className="text-right text-[11px] font-mono text-zinc-500">
                          <div>{res.durationMs}ms</div>
                          <div className="text-[10px] text-zinc-400">{new Date(res.startedAt).toLocaleTimeString()}</div>
                        </div>
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

                  {/* Step details accordion if run results exist */}
                  {res && res.steps && res.steps.length > 0 && (
                    <div className="border-t border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/40 p-3">
                      <div className="space-y-1.5">
                        {res.steps.map((step) => {
                          const stepKey = `${res.suiteId}_${step.id}`;
                          const isExpanded = !!expandedSteps[stepKey];
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
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                                  )}
                                </div>
                              </div>

                              {isExpanded && (
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
        <div className="space-y-6">
          {/* Designated Test Environment Card */}
          <div className="p-4 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Designated Test Environment Configuration</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(true)}
                className="px-2.5 py-1 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg transition-colors cursor-pointer"
              >
                Configure Environment
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-lg border border-zinc-200/60 dark:border-zinc-800/40">
                <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Test Workspace</div>
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1 truncate">
                  {envConfig.workspaceName || 'Not Assigned'}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-lg border border-zinc-200/60 dark:border-zinc-800/40">
                <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Sender WABA / Phone</div>
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1 truncate">
                  {envConfig.senderPhone || (envConfig.wabaId ? `WABA: ${envConfig.wabaId}` : 'Sandbox / Test Mock')}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-lg border border-zinc-200/60 dark:border-zinc-800/40">
                <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Test Recipient Phone</div>
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1 truncate">
                  {envConfig.recipientPhone ? `+${envConfig.recipientPhone.slice(0, 3)}******${envConfig.recipientPhone.slice(-4)}` : 'Not Configured'}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 rounded-lg border border-zinc-200/60 dark:border-zinc-800/40">
                <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">Environment Mode</div>
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
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Caution: Real Provider Mode Active.</strong> Executing provider tests in this mode will dispatch live messages via Meta Cloud API or OpenAI.
                </span>
              </div>
            )}
          </div>

          {/* Provider Suites List */}
          <div className="grid grid-cols-1 gap-4">
            {providerSuites.map((suite) => {
              const res = results[suite.id];
              const isRunning = runningSuite === suite.id;
              const Icon = suite.icon;

              return (
                <div
                  key={suite.id}
                  className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs transition-all"
                >
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{suite.title}</h3>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                              dryRun
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {dryRun ? 'DRY RUN' : 'REAL TEST'}
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
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">{suite.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
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

                  {/* Step diagnostics */}
                  {res && res.steps && (
                    <div className="border-t border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/40 p-3">
                      <div className="space-y-1.5">
                        {res.steps.map((step) => {
                          const stepKey = `${res.suiteId}_${step.id}`;
                          const isExpanded = !!expandedSteps[stepKey];
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
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                                  )}
                                </div>
                              </div>

                              {isExpanded && step.diagnostics && (
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
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Designate Internal Test Workspace</h3>
              <button onClick={() => setShowConfigModal(false)} className="text-zinc-400 hover:text-zinc-600 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Designated Test Workspace
                </label>
                <select
                  value={configForm.workspaceId}
                  onChange={(e) => setConfigForm({ ...configForm, workspaceId: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                >
                  <option value="">-- Select Test Workspace --</option>
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.hasWaAccount ? `(WhatsApp: ${w.displayPhone || 'Connected'})` : '(No WhatsApp)'}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Real provider tests will strictly execute under this selected tenant only.
                </p>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Designated Recipient Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +919876543210"
                  value={configForm.recipientPhone}
                  onChange={(e) => setConfigForm({ ...configForm, recipientPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Real WhatsApp messages will ONLY be dispatched to this specific controlled recipient.
                </p>
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">Audit Notes / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Pre-production launch smoke testing"
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
                <span className="text-zinc-500">Test Sender:</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-bold">
                  {envConfig.workspaceName || 'PingStack Test'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Test Recipient:</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-bold">
                  {envConfig.recipientPhone ? `+${envConfig.recipientPhone.slice(0, 3)}******${envConfig.recipientPhone.slice(-4)}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Environment:</span>
                <span className="text-rose-500 font-bold">REAL WHATSAPP / OPENAI</span>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              This action will incur real provider API costs and dispatch live messages. Are you sure you wish to proceed?
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
