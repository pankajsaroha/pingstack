'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Settings, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: any;
  }
}

export default function Dashboard() {
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTenant();
    initFacebookSDK();
  }, []);

  const initFacebookSDK = () => {
    window.fbAsyncInit = function() {
      window.FB.init({
        appId      : process.env.NEXT_PUBLIC_FB_APP_ID,
        cookie     : true,
        xfbml      : true,
        version    : 'v19.0'
      });
    };
  };

  const fetchTenant = async () => {
    try {
      const res = await fetch('/api/tenant/me');
      if (res.ok) {
        const data = await res.json();
        setTenant(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWhatsApp = () => {
    if (!window.FB) {
      alert('Facebook SDK not loaded yet. Please wait a moment.');
      return;
    }

    setConnecting(true);
    setError(null);

    window.FB.login((response: any) => {
      if (response.authResponse) {
        const code = response.authResponse.code;
        if (code) {
          exchangeToken(code);
        } else {
          // Fallback if code isn't directly in authResponse (depends on FB config)
          // For Embedded Signup, we usually get a code.
          setConnecting(false);
          setError('Failed to get authorization code from Meta.');
        }
      } else {
        setConnecting(false);
        console.log('User cancelled login or did not fully authorize.');
      }
    }, {
      scope: 'whatsapp_business_management,whatsapp_business_messaging',
      extras: {
        feature: 'whatsapp_embedded_signup'
      }
    });
  };

  const exchangeToken = async (code: string) => {
    try {
      const res = await fetch('/api/whatsapp/meta/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      const data = await res.json();
      if (res.ok) {
        fetchTenant();
      } else {
        setError(data.error || 'Failed to exchange token with Meta.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse p-8">Loading dashboard...</div>;
  }

  const whatsappAccount = tenant?.whatsapp_account;
  const isConnected = whatsappAccount?.status === 'ACTIVE';
  const isConnecting = connecting || whatsappAccount?.status === 'PENDING';

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Workspace Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your native Meta WhatsApp Cloud integration.</p>
        </div>
        {isConnected && (
          <div className="flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-medium border border-green-200">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Meta API Connected
          </div>
        )}
      </div>
      
      {!isConnected && !isConnecting && (
        <div className="mb-8 bg-blue-50/50 border border-blue-200 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between shadow-sm">
          <div className="flex items-center mb-6 md:mb-0">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mr-6 shadow-inner">
              <MessageCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Connect WhatsApp via Meta</h3>
              <p className="text-sm text-gray-600 mt-1 max-w-lg leading-relaxed">
                PingStack now uses the native Meta WhatsApp Cloud API. Sign in with Facebook to immediately start sending messages from your business number.
              </p>
            </div>
          </div>
          <button 
            onClick={handleConnectWhatsApp}
            disabled={connecting}
            className="px-8 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 whitespace-nowrap flex items-center"
          >
            {connecting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
            Connect Now
          </button>
        </div>
      )}

      {isConnecting && (
        <div className="mb-8 bg-gray-50 border border-gray-200 p-8 rounded-2xl flex items-center justify-between shadow-sm animate-pulse">
           <div className="flex items-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mr-4" />
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Connecting to Meta...</h3>
              <p className="text-sm text-gray-500">Exchanging credentials and setting up your WhatsApp Business Account.</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-8 bg-red-50 border border-red-200 p-4 rounded-xl flex items-start text-red-800 shadow-sm animate-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Connection Failed</p>
            <p className="text-xs mt-1">{error}</p>
            <button 
              onClick={handleConnectWhatsApp}
              className="mt-3 text-xs font-bold underline hover:no-underline"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all">
          <h3 className="text-sm font-medium text-gray-500">Conversations</h3>
          <p className="mt-3 text-4xl font-bold text-gray-900">0</p>
        </div>
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all">
          <h3 className="text-sm font-medium text-gray-500">Templates Approved</h3>
          <p className="mt-3 text-4xl font-bold text-gray-900">0</p>
        </div>
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all">
          <h3 className="text-sm font-medium text-gray-500">Inbound Messages</h3>
          <p className="mt-3 text-4xl font-bold text-gray-900">0</p>
        </div>
      </div>
      
      <div className="mt-8 bg-white/80 backdrop-blur-md p-10 rounded-2xl border border-gray-200/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] min-h-[350px] flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-gray-900 rounded-3xl flex items-center justify-center mb-6 shadow-xl rotate-3">
          <MessageCircle className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 tracking-tight">WhatsApp Cloud Native</h3>
        <p className="text-gray-500 text-[16px] mt-2 max-w-md leading-relaxed">
          The manual API key era is over. PingStack now connects directly to Meta's infrastructure for better deliverability and lower costs.
        </p>
        <button className="mt-8 px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg active:scale-95">
          Read Setup Guide
        </button>
      </div>
    </div>
  );
}
