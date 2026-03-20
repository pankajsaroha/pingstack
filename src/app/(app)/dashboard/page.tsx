'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, CheckCircle2, AlertCircle, Copy, CheckSquare, Loader2, Settings } from 'lucide-react';

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

  const [showGuidedFallback, setShowGuidedFallback] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Feature Flag logic (ignoring old Gupshup/Embedded flag for now as we pivot)
  const isMetaSignupEnabled = true; 

  useEffect(() => {
    fetchTenant();
    initFacebookSDK();
  }, []);

  const initFacebookSDK = () => {
    const appId = process.env.NEXT_PUBLIC_FB_APP_ID;
    const doInit = () => {
      if (window.FB && appId) {
        window.FB.init({
          appId      : appId,
          cookie     : true,
          xfbml      : true,
          version    : 'v19.0'
        });
        console.log('FB SDK initialized successfully');
      }
    };
    if (window.FB) {
      doInit();
    } else {
      window.fbAsyncInit = function() { doInit(); };
    }
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

  const handleFBLogin = () => {
    if (!window.FB) {
      alert('Facebook SDK not loaded yet. Please wait a moment.');
      return;
    }

    setConnecting(true);
    setError(null);
    setShowGuidedFallback(false);

    // Phase 1: Link identity using a neutral business scope to avoid the WhatsApp picker
    window.FB.login((response: any) => {
      if (response.authResponse) {
        const accessToken = response.authResponse.accessToken;
        if (accessToken) {
          // Store token immediately (Phase 1)
          connectMetaAccount(accessToken, true);
        } else {
          setConnecting(false);
          setError('Failed to get access token from Facebook.');
        }
      } else {
        setConnecting(false);
      }
    }, {
      scope: 'pages_show_list'
    });
  };

  const handleWhatsAppConnect = () => {
    if (!window.FB) return;

    setIsDiscovering(true);
    setError(null);

    // Phase 2: Request specific WhatsApp scopes
    window.FB.login((response: any) => {
      if (response.authResponse) {
        const accessToken = response.authResponse.accessToken;
        if (accessToken) {
          // Store and Discover
          connectMetaAccount(accessToken, false);
        } else {
          setIsDiscovering(false);
          setError('Failed to get permissions from Facebook.');
        }
      } else {
        setIsDiscovering(false);
      }
    }, {
      scope: 'whatsapp_business_management,whatsapp_business_messaging'
    });
  };

  const handleReDiscover = async () => {
    setIsDiscovering(true);
    setError(null);
    try {
      const res = await fetch('/api/whatsapp/meta/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reDiscover: true })
      });
      const data = await res.json();
      if (res.ok) {
        setShowGuidedFallback(false);
        fetchTenant();
      } else {
        if (data.error === 'NO_WABA_FOUND' || data.error === 'NO_PHONE_FOUND') {
          setShowGuidedFallback(true);
        } else {
          setError(data.message || 'Failed to re-discover account.');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDiscovering(false);
    }
  };

  const connectMetaAccount = async (accessToken: string, storeOnly: boolean = false) => {
    setIsDiscovering(true);
    setError(null);
    
    try {
      const res = await fetch('/api/whatsapp/meta/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, storeOnly })
      });
      
      const data = await res.json();
      if (res.ok) {
        if (storeOnly) {
          // Phase 1 Success -> Now allow Phase 2
          setConnecting(false);
          fetchTenant(); // Refresh to show "FB Linked" UI
        } else {
          setShowGuidedFallback(false);
          fetchTenant();
        }
      } else {
        if (data.error === 'NO_WABA_FOUND' || data.error === 'NO_PHONE_FOUND') {
          setShowGuidedFallback(true);
        } else {
          setError(data.message || 'Failed to connect Meta account.');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
      setIsDiscovering(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse p-8">Loading dashboard...</div>;
  }

  const whatsappAccount = tenant?.whatsapp_account;
  const isConnected = whatsappAccount?.status === 'ACTIVE';
  const isFBLinked = whatsappAccount?.status === 'PENDING_SETUP' || isConnected;
  const isConnecting = connecting || isDiscovering;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Workspace Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your native Meta WhatsApp Cloud integration.</p>
        </div>
        {isConnected && (
          <div className="flex items-center space-x-3">
             <div className="flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-medium border border-green-200">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              WhatsApp Connected
            </div>
          </div>
        )}
      </div>
      
      {/* State 1: Completely Disconnected */}
      {!isFBLinked && !isConnecting && (
        <div className="mb-8 bg-blue-50/50 border border-blue-200 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between shadow-sm">
          <div className="flex items-center mb-6 md:mb-0">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mr-6 shadow-inner">
              <MessageCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Step 1: Link your Facebook</h3>
              <p className="text-sm text-gray-600 mt-1 max-w-lg leading-relaxed">
                Connect your Facebook account to PingStack first. Once linked, you can connect your WhatsApp Business number.
              </p>
            </div>
          </div>
          <button 
            onClick={handleFBLogin}
            disabled={connecting}
            className="px-8 py-4 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95 whitespace-nowrap flex items-center text-lg"
          >
            Connect with Facebook
          </button>
        </div>
      )}

      {/* State 2: FB Linked, but WhatsApp not configured */}
      {isFBLinked && !isConnected && !isConnecting && !showGuidedFallback && (
        <div className="mb-8 bg-white border border-gray-200 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between shadow-md">
          <div className="flex items-center mb-6 md:mb-0">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mr-6">
              <CheckSquare className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center">
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Step 2: Connect WhatsApp</h3>
                <span className="ml-3 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded border border-blue-100">FB Linked</span>
              </div>
              <p className="text-sm text-gray-600 mt-1 max-w-lg leading-relaxed">
                Your Facebook account is linked! Now, let's connect your WhatsApp Business Account.
              </p>
            </div>
          </div>
          <button 
            onClick={handleWhatsAppConnect}
            className="px-8 py-4 bg-gray-900 text-white hover:bg-black rounded-xl font-bold shadow-lg transition-all active:scale-95 whitespace-nowrap flex items-center text-lg"
          >
            Connect WhatsApp Business
          </button>
        </div>
      )}

      {/* Guided Fallback Screen (Detailed) */}
      {(showGuidedFallback || (isFBLinked && !isConnected)) && !isConnecting && showGuidedFallback && (
        <div className="mb-8 bg-amber-50/50 border border-amber-200 p-10 rounded-2xl shadow-sm animate-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col lg:flex-row gap-10 items-start">
            <div className="lg:w-2/3">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Finish Setting Up WhatsApp</h3>
              <p className="text-gray-600 mt-4 leading-relaxed">
                We couldn't find a WhatsApp Business Account. Please ensures you have a business profile and a verified number on Meta.
              </p>
              
              <div className="mt-8 space-y-6">
                <div className="flex items-start">
                  <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-4 mt-0.5">1</div>
                  <div>
                    <h4 className="font-bold text-gray-900">Go to Meta Business Suite</h4>
                    <p className="text-sm text-gray-500 mt-1">Create or select your business profile at <a href="https://business.facebook.com/" className="underline font-medium text-blue-600" target="_blank">business.facebook.com</a>.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-4 mt-0.5">2</div>
                  <div>
                    <h4 className="font-bold text-gray-900">Add a Phone Number</h4>
                    <p className="text-sm text-gray-500 mt-1">Link your business phone number to your WhatsApp Business Account.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-4 mt-0.5">3</div>
                  <div>
                    <h4 className="font-bold text-gray-900">Verify Ownership</h4>
                    <p className="text-sm text-gray-500 mt-1">Complete the OTP verification on Meta. This usually takes ~2 minutes.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-1/3 bg-white p-6 rounded-2xl border border-amber-100 shadow-sm self-stretch flex flex-col justify-center">
              <h4 className="font-bold text-gray-900 mb-4">Ready to try again?</h4>
              <p className="text-sm text-gray-500 mb-6">If you've finished the setup on Meta, click below to update your connection.</p>
              
              <button 
                onClick={handleWhatsAppConnect}
                className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-95 text-center mb-3 block"
              >
                Connect WhatsApp Business
              </button>
              <button 
                onClick={handleReDiscover}
                className="w-full px-6 py-3 bg-white border border-gray-200 text-gray-900 rounded-xl font-bold hover:bg-gray-50 transition-all active:scale-95"
              >
                Sync with Meta
              </button>
            </div>
          </div>
        </div>
      )}

      {(connecting || isDiscovering) && (
        <div className="mb-8 bg-white border border-gray-200 p-12 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
           <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" />
           <h3 className="text-xl font-bold text-gray-900 tracking-tight">
             {isDiscovering ? 'Discovering your account...' : 'Connecting to Meta...'}
           </h3>
           <p className="text-sm text-gray-500 mt-2 max-w-xs">
             {isDiscovering ? 'We are searching for your WhatsApp Business Account and Phone Number on Meta.' : 'Opening Facebook authorization...'}
           </p>
        </div>
      )}

      {error && (
        <div className="mb-8 bg-red-50 border border-red-200 p-4 rounded-xl flex items-start text-red-800 shadow-sm animate-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Connection Failed</p>
            <p className="text-xs mt-1">{error}</p>
            <button 
              onClick={handleFBLogin}
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

