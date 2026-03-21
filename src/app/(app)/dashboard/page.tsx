'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, CheckCircle2, AlertCircle, Copy, CheckSquare, Loader2, Settings, Zap, Rocket, BarChart3, Users, Book } from 'lucide-react';
import { db } from '@/lib/db';
import { PLANS, PlanType } from '@/lib/plans';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: any;
  }
}

export default function Dashboard() {
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totalContacts, setTotalContacts] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [manualToken, setManualToken] = useState('');
  const [manualWabaId, setManualWabaId] = useState('');
  const [manualPhoneId, setManualPhoneId] = useState('');

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will still have access until the end of the current billing cycle.')) return;
    try {
      const res = await fetch('/api/billing/razorpay/cancel-subscription', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchTenant();
      } else {
        alert(data.error || 'Failed to cancel subscription');
      }
    } catch (e) {
      alert('Cancellation failed');
    }
  };

  useEffect(() => {
    fetchTenant();
  }, []);

  const fetchTenant = async () => {
    try {
      const res = await fetch('/api/tenant/me');
      if (res.ok) {
        const data = await res.json();
        setTenant(data);
        
        if (data?.id) {
          const { count } = await db
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', data.id);
          setTotalContacts(count || 0);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setError(null);

    try {
      const res = await fetch('/api/whatsapp/meta/manual-connect', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id 
        },
        body: JSON.stringify({
          accessToken: manualToken,
          wabaId: manualWabaId,
          phoneNumberId: manualPhoneId
        })
      });

      const data = await res.json();
      if (res.ok) {
        fetchTenant();
        setManualToken('');
        setManualWabaId('');
        setManualPhoneId('');
      } else {
        setError(data.error || data.message || 'Failed to connect manually.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse p-8 text-gray-500">Initializing dashboard...</div>;
  }

  const whatsappAccount = tenant?.whatsapp_account;
  const isConnected = whatsappAccount?.status === 'ACTIVE';

  return (
    <div className="animate-in fade-in duration-700 max-w-6xl mx-auto p-4 sm:p-8">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">Meta WhatsApp Setup</h1>
          <p className="text-gray-500 mt-2 text-lg">Connect your native Meta Cloud API account manually.</p>
        </div>
        {isConnected && (
          <div className="flex items-center self-start px-5 py-2.5 bg-green-50 text-green-700 rounded-2xl text-sm font-bold border border-green-100 shadow-sm transition-all hover:bg-green-100/50">
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Active Connection
          </div>
        )}
      </div>

      {!isConnected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
          {/* Step 1: The Guide */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/10">
            <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center">
              <Settings className="w-6 h-6 mr-3 text-blue-600" />
              1. Setup on Meta Developers
            </h3>
            
            <div className="space-y-8">
              <div className="flex items-start group">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mr-4 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:scale-110">1</div>
                <div>
                  <p className="font-bold text-gray-900">Create a Meta App</p>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    Go to <a href="https://developers.facebook.com/apps" target="_blank" className="text-blue-600 underline font-medium decoration-blue-200 underline-offset-4 hover:decoration-blue-600 transition-all">developers.facebook.com/apps</a> and create a <strong>Business</strong> type app.
                  </p>
                </div>
              </div>

              <div className="flex items-start group">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mr-4 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:scale-110">2</div>
                <div>
                  <p className="font-bold text-gray-900">Add WhatsApp Product</p>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    Inside your app dashboard, scroll down and find the <strong>WhatsApp</strong> product. Click &quot;Set Up&quot; to add it to your app.
                  </p>
                </div>
              </div>

              <div className="flex items-start group">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mr-4 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:scale-110">3</div>
                <div>
                  <p className="font-bold text-gray-900">Get Credentials</p>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    Navigate to <strong>WhatsApp &gt; API Setup</strong>. Copy your <strong>Permanent Access Token</strong>, <strong>Phone Number ID</strong>, and <strong>WABA ID</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12 p-5 bg-blue-50/50 rounded-2xl border border-dashed border-blue-200">
              <p className="text-sm text-blue-800 leading-relaxed">
                <span className="inline-block px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold uppercase mr-2 tracking-wider">Note</span>
                Ensure you use a <strong>System User</strong> token for permanent access, otherwise the connection will expire in 24 hours.
              </p>
            </div>
          </div>

          {/* Step 2: The Form */}
          <div className="bg-gray-900 p-8 rounded-3xl shadow-2xl shadow-blue-900/20 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32 transition-all group-hover:bg-blue-600/20"></div>
            
            <h3 className="text-xl font-bold mb-8 flex items-center text-blue-400 relative z-10">
              <CheckSquare className="w-6 h-6 mr-3" />
              2. Enter Credentials
            </h3>

            <form onSubmit={handleManualConnect} className="space-y-6 relative z-10">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Permanent Access Token</label>
                <input 
                  type="password"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="EAAB..."
                  className="w-full bg-gray-800/80 border border-gray-700/50 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-600 outline-none hover:bg-gray-800"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Phone Number ID</label>
                  <input 
                    type="text"
                    value={manualPhoneId}
                    onChange={(e) => setManualPhoneId(e.target.value)}
                    placeholder="1098..."
                    className="w-full bg-gray-800/80 border border-gray-700/50 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-600 outline-none hover:bg-gray-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">WABA ID</label>
                  <input 
                    type="text"
                    value={manualWabaId}
                    onChange={(e) => setManualWabaId(e.target.value)}
                    placeholder="2384..."
                    className="w-full bg-gray-800/80 border border-gray-700/50 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-600 outline-none hover:bg-gray-800"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start text-red-400 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-4 h-4 mr-3 mt-1 flex-shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <button 
                type="submit"
                disabled={connecting}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center justify-center transform hover:-translate-y-1"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Save Connection
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Top Section: Always Visible (Plan & Usage) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 mb-12">
        {/* Plan & Usage Card */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6">
            <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
              {tenant?.plan_type || 'Starter'} Plan
            </span>
          </div>
          
          <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center">
            <Zap className="w-5 h-5 mr-3 text-blue-600" />
            Plan & Usage
          </h3>

          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-end mb-3">
                <div className="flex items-center text-sm font-bold text-gray-700">
                  <BarChart3 className="w-4 h-4 mr-2 text-gray-400" />
                  Campaigns Used Today
                </div>
                <span className="text-xs font-black text-gray-400">
                  {tenant?.campaigns_sent_today || 0} / {PLANS[tenant?.plan_type as PlanType || 'starter'].maxCampaignsPerDay === Infinity ? '∞' : PLANS[tenant?.plan_type as PlanType || 'starter'].maxCampaignsPerDay}
                </span>
              </div>
              <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-1000"
                  style={{ width: `${Math.min(100, ((tenant?.campaigns_sent_today || 0) / (PLANS[tenant?.plan_type as PlanType || 'starter'].maxCampaignsPerDay || 1)) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-3">
                <div className="flex items-center text-sm font-bold text-gray-700">
                  <Users className="w-4 h-4 mr-2 text-gray-400" />
                  Total Contacts
                </div>
                <span className="text-xs font-black text-gray-400">
                  {totalContacts} / {PLANS[tenant?.plan_type as PlanType || 'starter'].maxContacts === Infinity ? '∞' : PLANS[tenant?.plan_type as PlanType || 'starter'].maxContacts}
                </span>
              </div>
              <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-1000"
                  style={{ width: `${Math.min(100, (totalContacts / (PLANS[tenant?.plan_type as PlanType || 'starter'].maxContacts || 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-between">
            <a href="/pricing" className="text-sm font-black text-blue-600 hover:text-blue-700 flex items-center transition-all hover:translate-x-1">
              Upgrade Plan <Rocket className="w-4 h-4 ml-2" />
            </a>
            {tenant?.plan_type && tenant.plan_type !== 'starter' && (
              <button 
                onClick={handleCancelSubscription}
                className="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>

        {/* Documentation & Resources - Small Card */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center">
              <Book className="w-5 h-5 mr-3 text-indigo-600" />
              Documentation
            </h3>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">
              New here? Check our comprehensive guides to get your enterprise messaging infrastructure up and running in minutes.
            </p>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-50">
             <a href="/docs" className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs hover:bg-black transition-all shadow-lg active:scale-95">
                Visit Docs Center
             </a>
          </div>
        </div>
      </div>

      {isConnected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Existing Operational Status - Refactored into a card */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl relative overflow-hidden group lg:col-span-2">
            <div className="absolute top-0 right-0 p-8">
               <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
               </div>
            </div>
            
            <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-3 text-green-500" />
              Meta Connection Status
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center px-5 py-3 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-4">Phone ID</span>
                <span className="text-sm font-bold text-gray-700 font-mono">{whatsappAccount?.phone_number_id}</span>
              </div>
              <div className="flex items-center px-5 py-3 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-4">WABA ID</span>
                <span className="text-sm font-bold text-gray-700 font-mono">{whatsappAccount?.business_id}</span>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-50 flex justify-between items-center">
              <p className="text-xs text-gray-400 font-bold">Your Meta Cloud API integration is live and stable.</p>
              <button 
                onClick={() => setTenant({ ...tenant, whatsapp_account: null })}
                className="text-sm font-black text-gray-400 hover:text-red-600 transition-colors"
              >
                Update Credentials
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Conversations', value: '0', color: 'blue' },
          { label: 'Templates Approved', value: '0', color: 'green' },
          { label: 'Inbound Messages', value: '0', color: 'amber' }
        ].map((stat, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-xl p-8 rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all cursor-default">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">{stat.label}</h3>
            <p className="text-5xl font-black text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-gray-900 p-12 rounded-[3rem] border border-gray-800 shadow-2xl shadow-blue-900/10 text-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center mb-8 shadow-2xl rotate-6 group-hover:rotate-0 transition-all duration-500 transform group-hover:scale-110">
            <MessageCircle className="w-10 h-10" />
          </div>
          <h3 className="text-3xl font-black text-white tracking-tight">Enterprise Infrastructure</h3>
          <p className="text-gray-400 text-lg mt-4 max-w-xl leading-relaxed">
            Direct Cloud API integration bypasses third-party middle-ware, giving you <strong>lower costs</strong> and <strong>near-instant delivery</strong>.
          </p>
          <button 
            onClick={() => window.open('https://docs.pingstack.com', '_blank')}
            className="mt-10 px-10 py-4 bg-white text-gray-900 rounded-2xl font-black text-sm hover:bg-blue-50 transition-all shadow-xl active:scale-95 transform hover:-translate-y-1"
          >
            Documentation & Support
          </button>
        </div>
      </div>
    </div>
  );
}


