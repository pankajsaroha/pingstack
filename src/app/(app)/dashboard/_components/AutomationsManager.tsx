'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Bot, 
  Plus, 
  Trash2, 
  Edit3, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Sparkles, 
  X, 
  ArrowRight, 
  Zap, 
  Filter,
  Clock,
  MessageSquare
} from 'lucide-react';

interface AutomationsManagerProps {
  tenant: any;
  templates?: any[];
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function AutomationsManager({ tenant, templates: initialTemplates = [], onToast }: AutomationsManagerProps) {
  const [rules, setRules] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>(initialTemplates);
  const [quota, setQuota] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  // Form State
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('keyword');
  const [keywordInput, setKeywordInput] = useState('');
  const [actionType, setActionType] = useState<'send_template' | 'send_text'>('send_template');
  const [templateName, setTemplateName] = useState('');
  const [actionText, setActionText] = useState('');
  const [conditions, setConditions] = useState<any[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isPro = quota?.isAdvanced || tenant?.plan_type === 'pro';
  const isStarter = !quota || quota?.maxRules === 0 || tenant?.plan_type === 'starter';

  const fetchRulesAndTemplates = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [rulesRes, templatesRes] = await Promise.all([
        fetch('/api/automations', { headers: { 'x-tenant-id': tenant.id } }),
        fetch('/api/templates', { headers: { 'x-tenant-id': tenant.id } })
      ]);

      if (rulesRes.ok) {
        const data = await rulesRes.json();
        setRules(data.rules || []);
        setQuota(data.quota || null);
      }
      if (templatesRes.ok) {
        const tData = await templatesRes.json();
        const tList = Array.isArray(tData) ? tData : (tData.templates || []);
        setTemplates(tList);
      }
    } catch (e) {
      console.error('Failed to fetch automations:', e);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    fetchRulesAndTemplates();
  }, [fetchRulesAndTemplates]);

  const openCreateModal = () => {
    setEditingRule(null);
    setName('');
    setTriggerType('keyword');
    setKeywordInput('');
    setActionType('send_template');
    setTemplateName(templates[0]?.name || '');
    setActionText('');
    setConditions([]);
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (rule: any) => {
    setEditingRule(rule);
    setName(rule.name || '');
    setTriggerType(rule.trigger_type || 'keyword');
    setKeywordInput((rule.trigger_config?.keywords || []).join(', '));
    const firstAction = (rule.actions && rule.actions[0]) || {};
    setActionType(firstAction.type || 'send_template');
    setTemplateName(firstAction.templateName || templates[0]?.name || '');
    setActionText(firstAction.text || '');
    setConditions(rule.conditions || []);
    setIsActive(rule.is_active !== false);
    setModalOpen(true);
  };

  const handleToggleActive = async (rule: any) => {
    try {
      const res = await fetch(`/api/automations/${rule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({ is_active: !rule.is_active })
      });
      if (res.ok) {
        onToast(`Automation ${rule.is_active ? 'paused' : 'activated'}`, 'success');
        fetchRulesAndTemplates();
      }
    } catch (e) {
      onToast('Failed to update status', 'error');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return;
    try {
      const res = await fetch(`/api/automations/${ruleId}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenant.id }
      });
      if (res.ok) {
        onToast('Rule deleted', 'success');
        fetchRulesAndTemplates();
      }
    } catch (e) {
      onToast('Failed to delete rule', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const keywords = keywordInput
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const actionPayload = actionType === 'send_template'
        ? { type: 'send_template', templateName }
        : { type: 'send_text', text: actionText };

      const payload = {
        name,
        trigger_type: triggerType,
        trigger_config: { keywords },
        conditions,
        actions: [actionPayload],
        is_active: isActive,
      };

      const url = editingRule ? `/api/automations/${editingRule.id}` : '/api/automations';
      const method = editingRule ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant.id,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to save automation rule');
      }

      onToast(editingRule ? 'Automation updated!' : 'Automation rule created!', 'success');
      setModalOpen(false);
      fetchRulesAndTemplates();
    } catch (err: any) {
      onToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Starter Gated View
  if (isStarter) {
    return (
      <div className="bg-glass-card border border-glass-border p-8 rounded-[2.5rem] shadow-2xl text-center max-w-2xl mx-auto space-y-6">
        <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/5">
          <Bot className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black text-fg tracking-tight">WhatsApp Automations</h3>
          <p className="text-sm text-muted font-semibold leading-relaxed">
            Automations are available on the <strong>Growth</strong> plan (up to 3 rules) and <strong>Pro</strong> plan (Advanced multi-condition workflows).
          </p>
        </div>
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left">
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider block mb-1">Growth Includes:</span>
          <p className="text-xs text-muted font-medium">Automatic welcome greetings &amp; keyword auto-replies for instant 24/7 customer engagement.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Card */}
      <div className="bg-glass-card border border-glass-border p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h3 className="text-xl font-black text-fg tracking-tight flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-500" />
              {isPro ? 'Advanced Automations' : 'Basic Automations'}
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
              isPro ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {isPro ? 'PRO UNLIMITED' : `${quota?.currentCount || 0}/${quota?.maxRules || 3} RULES`}
            </span>
          </div>
          <p className="text-sm text-muted font-semibold">
            {isPro 
              ? 'Configure powerful multi-step keyword triggers, welcome auto-replies, and conditional messaging.' 
              : 'Set up automated keyword replies and customer welcome messages.'}
          </p>
        </div>
        <button
          type="button"
          disabled={!isPro && quota?.remainingQuota <= 0}
          onClick={openCreateModal}
          className="px-6 py-3 bg-fg text-bg hover:opacity-90 disabled:opacity-40 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Rule
        </button>
      </div>

      {/* Rules List */}
      <div className="bg-glass-card border border-glass-border rounded-[2.5rem] shadow-2xl p-8">
        <h4 className="text-xs font-black text-fg/30 uppercase tracking-widest mb-6 px-1">Configured Rules</h4>

        {loading ? (
          <div className="text-center py-12 opacity-40">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-fg mb-3" />
            <p className="text-[10px] font-black uppercase tracking-wider">Loading automation rules...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-glass-border rounded-[2rem] bg-glass-input/20">
            <Bot className="mx-auto h-8 w-8 text-fg/20 mb-3" />
            <h4 className="text-sm font-black text-fg/60">No Automation Rules Configured</h4>
            <p className="text-xs text-muted max-w-xs mx-auto mt-1 leading-relaxed">
              Create an auto-reply rule to instantly respond to incoming customer messages.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-glass-border">
            {rules.map((rule) => {
              const keywords = rule.trigger_config?.keywords || [];
              const action = (rule.actions && rule.actions[0]) || {};

              return (
                <div key={rule.id} className="py-6 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${rule.is_active ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                      <h4 className="text-base font-black text-fg tracking-tight">{rule.name}</h4>
                      <span className="px-2 py-0.5 bg-glass-input border border-glass-border text-fg/60 rounded-md text-[9px] font-mono uppercase">
                        {rule.trigger_type}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted font-medium">
                      {keywords.length > 0 && (
                        <span>Keywords: <strong className="text-fg/80">{keywords.join(', ')}</strong></span>
                      )}
                      <span>&bull;</span>
                      <span>Action: <strong className="text-fg/80">{action.type === 'send_template' ? `Template "${action.templateName}"` : 'Direct Text'}</strong></span>
                      <span>&bull;</span>
                      <span className="font-mono text-[10px] text-fg/40">Executed {rule.execution_count || 0} times</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(rule)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
                        rule.is_active 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                          : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20'
                      }`}
                    >
                      {rule.is_active ? 'Active' : 'Paused'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(rule)}
                      className="p-2 text-muted hover:text-fg hover:bg-glass-input rounded-xl border border-glass-border transition-colors cursor-pointer"
                      title="Edit Rule"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl border border-red-500/20 transition-colors cursor-pointer"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Rule Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-bg/95 backdrop-blur-md border border-glass-border w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-8 right-8 text-muted hover:text-fg p-1 hover:bg-glass-input rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-fg mb-6 tracking-tight flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-500" />
              {editingRule ? 'Edit Automation Rule' : 'New Automation Rule'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              {/* Name */}
              <div>
                <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Welcome New Customer, Pricing Inquiry"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-3.5 text-xs font-bold text-fg focus:border-indigo-500 focus:outline-none placeholder:text-fg/20"
                />
              </div>

              {/* Trigger Type */}
              <div>
                <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Trigger Event</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-3.5 text-xs font-bold text-fg focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="keyword" className="bg-bg text-fg">Message Contains Keywords</option>
                  <option value="exact_match" className="bg-bg text-fg">Exact Keyword Match</option>
                  <option value="welcome" className="bg-bg text-fg">First-time Inbound Message (Welcome Greeting)</option>
                </select>
              </div>

              {/* Keywords Input */}
              {triggerType !== 'welcome' && (
                <div>
                  <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">
                    Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. price, catalogue, quote, hi"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-3.5 text-xs font-bold text-fg focus:border-indigo-500 focus:outline-none placeholder:text-fg/20 font-mono"
                  />
                </div>
              )}

              {/* Pro Conditions Section */}
              <div className="p-4 rounded-2xl border border-glass-border bg-glass-input/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-fg/70 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-indigo-400" />
                    Advanced Conditions
                  </span>
                  {!isPro && (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-black uppercase rounded">
                      Pro Only
                    </span>
                  )}
                </div>

                {isPro ? (
                  <p className="text-xs text-muted font-medium">
                    Automations automatically evaluate incoming customer context and keywords with zero latency.
                  </p>
                ) : (
                  <p className="text-xs text-muted">
                    Upgrade to Pro to add multi-condition filtering and advanced routing.
                  </p>
                )}
              </div>

              {/* Action */}
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest px-1">Automated Action</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setActionType('send_template')}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      actionType === 'send_template'
                        ? 'bg-fg text-bg border-fg'
                        : 'bg-glass-input text-muted border-glass-border hover:text-fg'
                    }`}
                  >
                    Send Template
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('send_text')}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      actionType === 'send_text'
                        ? 'bg-fg text-bg border-fg'
                        : 'bg-glass-input text-muted border-glass-border hover:text-fg'
                    }`}
                  >
                    Send Direct Text
                  </button>
                </div>

                {actionType === 'send_template' ? (
                  <div>
                    <label className="block text-[9px] font-bold text-fg/40 uppercase mb-1.5">Select WhatsApp Template</label>
                    <select
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="block w-full bg-glass-input border border-glass-border rounded-xl px-4 py-3 text-xs font-bold text-fg focus:outline-none cursor-pointer"
                      required
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.name} className="bg-bg text-fg">
                          {t.name} ({t.category || 'UTILITY'})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[9px] font-bold text-fg/40 uppercase mb-1.5">Direct Message Text</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Hello {{name}}! Thank you for reaching out..."
                      value={actionText}
                      onChange={(e) => setActionText(e.target.value)}
                      className="block w-full bg-glass-input border border-glass-border rounded-xl px-4 py-3 text-xs font-bold text-fg focus:outline-none placeholder:text-fg/20 resize-none font-sans"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t border-glass-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3.5 border border-glass-border hover:bg-white/5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer text-fg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3.5 bg-fg text-bg hover:opacity-90 disabled:opacity-40 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center shadow-lg"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingRule ? 'Save Changes' : 'Create Rule')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
