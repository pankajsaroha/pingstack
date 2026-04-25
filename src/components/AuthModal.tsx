'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Loader2, X, ArrowLeft, Mail, Lock, 
  Building, User, ShieldCheck, CheckCircle2, 
  ArrowRight
} from 'lucide-react';
import { LogoIcon } from './Logo';

export function AuthModal({ isOpen, onClose, initialView = 'login' }: { isOpen: boolean; onClose: () => void; initialView?: 'login' | 'register' }) {
  const [view, setView] = useState<'login' | 'register'>(initialView);
  const [regStep, setRegStep] = useState(0); // 0: Details, 1: OTP, 2: Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [userName, setUserName] = useState('');
  const [otp, setOtp] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        document.cookie = `token=${data.token}; path=/; max-age=604800`;
        router.push('/dashboard');
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError('Connection failure. Check your network.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'INITIATE', tenantName, userName, email, password })
      });
      if (res.ok) setRegStep(1);
      else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError('Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'VERIFY', email, code: otp })
      });
      if (res.ok) {
        const data = await res.json();
        document.cookie = `token=${data.token}; path=/; max-age=604800`;
        setRegStep(2); // Show success state
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError('Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Dynamic Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity duration-1000 animate-in fade-in" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-[#0a0a0a]/90 border border-white/10 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* Glow Element */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
        
        <button onClick={onClose} className="absolute right-8 top-8 p-2 text-white/20 hover:text-white hover:bg-white/5 rounded-full transition-all z-[110]">
          <X className="w-5 h-5" />
        </button>

        <div className="p-12 relative z-50">
          <div className="flex flex-col items-center mb-10">
            <LogoIcon bgClass="bg-white" iconClass="text-black" />
            <span className="text-sm font-black text-white/30 uppercase tracking-[0.4em] leading-none mt-4">PingStack Engine</span>
          </div>

          {regStep === 2 ? (
            <div className="text-center py-10 animate-in fade-in zoom-in duration-700">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-3xl font-black text-white mb-3">Welcome Aboard</h2>
              <p className="text-white/40 font-bold mb-8">Redirecting you to your dashboard...</p>
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
            </div>
          ) : view === 'login' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-black text-white mb-2">Welcome Back</h2>
              <p className="text-white/40 font-medium mb-8">Log in to manage your WhatsApp campaigns.</p>
              
              <form className="space-y-4" onSubmit={handleLogin}>
                {error && <div className="text-red-400 text-[13px] font-bold bg-red-500/10 p-4 rounded-2xl border border-red-500/20">{error}</div>}
                
                <div className="space-y-3">
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-blue-400 transition-colors" />
                    <input 
                      type="email" required placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl pl-14 pr-5 py-4.5 text-sm font-bold text-white focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all placeholder:text-white/20"
                    />
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-blue-400 transition-colors" />
                    <input 
                      type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl pl-14 pr-5 py-4.5 text-sm font-bold text-white focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all placeholder:text-white/20"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button type="button" className="text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest transition-colors mb-2">Forgot Password?</button>
                </div>

                <button 
                  type="submit" disabled={loading}
                  className="w-full py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3 group"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <span>Secure Login</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <p className="text-center text-sm font-bold text-white/30 mt-8">
                  New to PingStack? <button type="button" onClick={() => { setView('register'); setError(''); }} className="text-white hover:underline underline-offset-4">Create an account</button>
                </p>
              </form>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {regStep === 0 ? (
                <>
                  <h2 className="text-3xl font-black text-white mb-2">Get Started</h2>
                  <p className="text-white/40 font-medium mb-8">Join the elite network of verified senders.</p>
                  
                  <form className="space-y-4" onSubmit={handleRegisterInitiate}>
                    {error && <div className="text-red-400 text-[13px] font-bold bg-red-500/10 p-4 rounded-2xl border border-red-500/20">{error}</div>}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative group">
                        <Building className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-blue-400 transition-colors" />
                        <input type="text" required placeholder="Company" value={tenantName} onChange={e => setTenantName(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold text-white focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all placeholder:text-white/20" />
                      </div>
                      <div className="relative group">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-blue-400 transition-colors" />
                        <input type="text" required placeholder="Full Name" value={userName} onChange={e => setUserName(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold text-white focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all placeholder:text-white/20" />
                      </div>
                    </div>
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-blue-400 transition-colors" />
                      <input type="email" required placeholder="Work Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl pl-14 pr-5 py-4.5 text-sm font-bold text-white focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all placeholder:text-white/20" />
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-blue-400 transition-colors" />
                      <input type="password" required placeholder="Secure Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/5 rounded-2xl pl-14 pr-5 py-4.5 text-sm font-bold text-white focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all placeholder:text-white/20" />
                    </div>

                    <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest text-center px-4">By joining, you agree to our <Link href="/privacy" className="text-white hover:underline">Privacy Terms</Link></p>

                    <button 
                      type="submit" disabled={loading}
                      className="w-full py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3 group mt-4"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                          <span>Create Account</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>

                    <p className="text-center text-sm font-bold text-white/30 mt-8">
                      Already have an account? <button type="button" onClick={() => { setView('login'); setError(''); }} className="text-white hover:underline underline-offset-4">Sign In</button>
                    </p>
                  </form>
                </>
              ) : (
                <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                  <button onClick={() => setRegStep(0)} className="mb-8 flex items-center text-[10px] font-black text-white/20 hover:text-white uppercase tracking-widest transition-colors group">
                    <ArrowLeft className="w-3.5 h-3.5 mr-2 group-hover:-translate-x-1 transition-transform" /> Back
                  </button>
                  <h2 className="text-3xl font-black text-white mb-2">Verify Identity</h2>
                  <p className="text-white/40 font-medium mb-8">We've sent a code to <span className="text-white font-bold">{email}</span></p>

                  <form className="space-y-8" onSubmit={handleRegisterVerify}>
                    {error && <div className="text-red-400 text-[13px] font-bold bg-red-500/10 p-4 rounded-2xl border border-red-500/20">{error}</div>}
                    
                    <div className="relative group">
                      <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-white/20 group-focus-within:text-blue-400 transition-colors" />
                      <input 
                        type="text" required maxLength={6} placeholder="000000" value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full bg-white/5 border border-white/5 rounded-3xl pl-16 pr-5 py-6 text-3xl font-black tracking-[0.5em] text-white focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all placeholder:text-white/10"
                      />
                    </div>

                    <button 
                      type="submit" disabled={loading || otp.length < 6}
                      className="w-full py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-black" /> : 'Complete Registration'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
