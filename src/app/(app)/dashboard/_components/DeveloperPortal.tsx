'use client';

import { useState, useCallback, useEffect } from 'react';
import { Code, Key, Trash2, Loader2, Copy, AlertCircle, ShieldCheck, X, ArrowRight } from 'lucide-react';

interface DeveloperPortalProps {
  tenant: any;
  isConnected: boolean;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onTabSwitch: (tab: 'overview' | 'developer') => void;
}

export default function DeveloperPortal({ tenant, isConnected, onToast, onTabSwitch }: DeveloperPortalProps) {
  const [apps, setApps] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [showCreateAppModal, setShowCreateAppModal] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [newAppKey, setNewAppKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchApps = useCallback(async () => {
    if (!tenant?.id) return;
    setLoadingApps(true);
    try {
      const res = await fetch('/api/developer/apps', {
        headers: { 'x-tenant-id': tenant.id }
      });
      if (res.ok) {
        const data = await res.json();
        setApps(data);
      }
    } catch (e) {
      console.error('Failed to fetch developer apps:', e);
    } finally {
      setLoadingApps(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim() || !tenant?.id) return;
    setCreating(true);
    try {
      const res = await fetch('/api/developer/apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          name: newAppName,
          description: newAppDesc
        })
      });
      if (res.ok) {
        const data = await res.json();
        setNewAppKey(data.apiKey);
        setNewAppName('');
        setNewAppDesc('');
        fetchApps();
        onToast('Developer App created successfully!', 'success');
      } else {
        const err = await res.json();
        onToast(err.error || 'Failed to create app', 'error');
      }
    } catch (e) {
      onToast('Network error', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeApp = async (appId: string) => {
    if (!confirm('Are you sure you want to revoke this application? All API integrations utilizing this key will instantly fail.')) return;
    if (!tenant?.id) return;
    try {
      const res = await fetch(`/api/developer/apps?id=${appId}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenant.id }
      });
      if (res.ok) {
        onToast('API key revoked successfully.', 'success');
        fetchApps();
      } else {
        onToast('Failed to revoke key', 'error');
      }
    } catch (e) {
      onToast('Network error', 'error');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 max-w-5xl mx-auto">
      {/* Header Card */}
      <div className="bg-glass-card border border-glass-border p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-black text-fg tracking-tight flex items-center gap-2">
              <Code className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              API Keys &amp; Integrations
            </h3>
            <p className="text-sm text-muted mt-1 font-semibold">
              Generate secure API keys to integrate custom notification pipelines into your applications and databases.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setNewAppName('');
              setNewAppDesc('');
              setNewAppKey(null);
              setShowCreateAppModal(true);
            }}
            className="px-6 py-3 bg-fg text-bg hover:opacity-90 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all cursor-pointer select-none"
          >
            Generate API Key
          </button>
        </div>
      </div>

      {/* Sandbox / Live Mode indicator */}
      {!isConnected ? (
        <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 rounded-[2rem] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Sandbox Mocking Active</span>
            </div>
            <p className="text-xs text-muted font-semibold max-w-2xl leading-relaxed">
              Your Meta WhatsApp account is not active yet. All requests made to the API will execute in **Mock Mode**, logging requests and returning successful mock payloads so you can build and test integrations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onTabSwitch('overview')}
            className="self-start sm:self-center px-4 py-2 border border-amber-500/25 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            Connect Account
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-[2rem] p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest font-mono">Live API Pipeline Active</span>
          </div>
          <p className="text-xs text-muted font-semibold max-w-2xl leading-relaxed">
            Workspace infrastructure is fully linked to Meta WhatsApp Cloud API. Authenticated API key requests will queue live messages directly to target delivery numbers.
          </p>
        </div>
      )}

      {/* Active API Keys List */}
      <div className="bg-glass-card border border-glass-border rounded-[2.5rem] shadow-2xl p-8">
        <h4 className="text-xs font-black text-fg/30 uppercase tracking-widest mb-6 px-1">Active API Keys</h4>

        {loadingApps ? (
          <div className="text-center py-12 opacity-40">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-fg mb-3" />
            <p className="text-[10px] font-black uppercase tracking-wider">Retrieving keys credentials...</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-glass-border rounded-[2rem] bg-glass-input/20">
            <Key className="mx-auto h-8 w-8 text-fg/20 mb-3" />
            <h4 className="text-sm font-black text-fg/60">No API Keys Generated</h4>
            <p className="text-xs text-muted max-w-xs mx-auto mt-1 leading-relaxed">
              Generate your first API secret key credentials to begin programmatical testing.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-glass-border">
            {apps.map((app) => (
              <div key={app.id} className="py-6 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h4 className="text-base font-black text-fg tracking-tight">{app.name}</h4>
                  {app.description && <p className="text-xs font-semibold text-muted leading-relaxed">{app.description}</p>}
                  <div className="flex items-center gap-4 text-[10px] font-bold text-fg/30 pt-1">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-indigo-400" />
                      Key Prefix: <code className="font-mono text-fg/50">{app.api_key_prefix}</code>
                    </span>
                    <span>&bull;</span>
                    <span>Created: {new Date(app.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevokeApp(app.id)}
                  className="self-start sm:self-center px-4 py-2 border border-red-500/20 bg-red-500/[0.03] text-red-500 hover:bg-red-500/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Revoke Key
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Curl API Quickstart Guide */}
      <div className="bg-glass-card border border-glass-border rounded-[2.5rem] shadow-2xl p-8 space-y-6">
        <div>
          <h4 className="text-xs font-black text-fg/30 uppercase tracking-widest px-1">API Quickstart Guide</h4>
          <p className="text-sm font-semibold text-muted mt-2 leading-relaxed">
            Trigger template notifications using standard JSON payloads over HTTP POST. Map your key credentials to the header bearer token prefix:
          </p>
        </div>

        <div className="bg-bg/40 border border-glass-border rounded-[2rem] p-6 relative overflow-hidden font-mono text-xs text-fg/80 leading-relaxed shadow-inner">
          <div className="absolute top-4 right-4 z-20">
            <button
              type="button"
              onClick={() => {
                const curl = `curl -X POST https://pingstack.in/api/v1/messages/send \\\n  -H "Authorization: Bearer ps_secret_live_your_key_here" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "to": "919999999999",\n    "template": "welcome_alert",\n    "language": "en_US",\n    "parameters": ["John Doe", "Order #1002"]\n  }'`;
                navigator.clipboard.writeText(curl);
                onToast('Curl request example copied!', 'success');
              }}
              className="p-2 bg-glass-input hover:bg-glass-card rounded-lg transition-colors text-muted hover:text-fg cursor-pointer"
              title="Copy Curl Command"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap select-all">
{`curl -X POST https://pingstack.in/api/v1/messages/send \\
  -H "Authorization: Bearer ps_secret_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "919999999999",
    "template": "welcome_alert",
    "language": "en_US",
    "parameters": ["John Doe", "Order #1002"]
  }'`}
          </pre>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-glass-border">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block">1. Authentication Header</span>
            <p className="text-xs text-muted leading-relaxed font-semibold">
              Send requests with header <code className="font-mono text-fg/60">Authorization: Bearer ps_secret_live_...</code>.
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block">2. Sandbox Mode Matching</span>
            <p className="text-xs text-muted leading-relaxed font-semibold">
              If Meta account configuration isn&#39;t complete, we&#39;ll return a mock success payload for validation.
            </p>
          </div>
        </div>
      </div>

      {/* Create Developer Key Modal */}
      {showCreateAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-bg/95 backdrop-blur-md border border-glass-border w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 relative bg-gradient-to-b from-indigo-500/[0.03] to-transparent">
            <button
              type="button"
              onClick={() => setShowCreateAppModal(false)}
              className="absolute top-8 right-8 text-muted hover:text-fg p-1 hover:bg-glass-input rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-fg mb-6 tracking-tight flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-500" />
              Generate API Key
            </h3>

            <form onSubmit={handleCreateApp} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Key Label</label>
                <input
                  type="text"
                  placeholder="e.g. Google Sync Key, Stripe Webhooks"
                  value={newAppName}
                  onChange={e => setNewAppName(e.target.value)}
                  className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/20"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Usage Description (Optional)</label>
                <textarea
                  placeholder="Describe what this API credential is used for..."
                  value={newAppDesc}
                  onChange={e => setNewAppDesc(e.target.value)}
                  rows={3}
                  className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/20 resize-none"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateAppModal(false)}
                  className="flex-1 py-4 border border-glass-border hover:bg-white/5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer text-fg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-4 bg-fg text-bg hover:opacity-90 disabled:opacity-40 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secret API Key Generated Popup modal */}
      {newAppKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-bg/95 backdrop-blur-md border border-glass-border w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 relative bg-gradient-to-b from-emerald-500/[0.03] to-transparent">
            <button
              type="button"
              onClick={() => setNewAppKey(null)}
              className="absolute top-8 right-8 text-muted hover:text-fg p-1.5 hover:bg-glass-input rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mb-4 shadow-xl shadow-emerald-500/5">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-fg tracking-tight">API Key Generated</h3>
              <p className="text-xs font-semibold text-muted max-w-sm mt-2 leading-relaxed">
                Your credentials have been successfully created. Copy and store this secret token safely.
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-glass-input/50 border border-glass-border rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">API SECRET KEY</span>
                <div className="flex items-center justify-between gap-4">
                  <code className="text-xs font-mono font-bold text-fg select-all break-all pr-4">{newAppKey}</code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newAppKey);
                      onToast('API key copied to clipboard!', 'success');
                    }}
                    className="p-3 bg-fg text-bg hover:opacity-90 rounded-xl transition-all shrink-0 cursor-pointer shadow-lg shadow-white/5 active:scale-95"
                    title="Copy Key"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-amber-400 leading-relaxed">
                    CRITICAL: For security reasons, we do not store this plaintext key in our database. It will never be displayed to you again after closing this screen.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setNewAppKey(null)}
                className="w-full py-4 bg-fg text-bg hover:opacity-90 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg active:scale-95"
              >
                I Have Copied &amp; Saved It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
