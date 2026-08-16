'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Loader2, X, ArrowLeft, Mail, Lock, 
  Building, User, ShieldCheck, CheckCircle2, 
  ArrowRight, Globe
} from 'lucide-react';
import { LogoIcon } from './Logo';

export function AuthModal({ isOpen, onClose, initialView = 'login' }: { isOpen: boolean; onClose: () => void; initialView?: 'login' | 'register' | 'forgot' }) {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>(initialView);
  const [regStep, setRegStep] = useState(0); // 0: Details, 1: OTP, 2: Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [userName, setUserName] = useState('');
  const [country, setCountry] = useState('IN');
  const [otp, setOtp] = useState('');
  // Forgot password states
  const [forgotStep, setForgotStep] = useState(0); // 0: Email, 1: OTP, 2: Reset, 3: Success
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');

  // Sync state on prop changes (e.g. clicking "Sign in" vs "Get Started")
  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setRegStep(0);
      setForgotStep(0);
      setError('');
      setLoading(false);
    }
  }, [isOpen, initialView]);

  if (!isOpen) return null;

  const handleClose = () => {
    setError('');
    setRegStep(0);
    setForgotStep(0);
    onClose();
  };

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
        handleClose();
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
        body: JSON.stringify({ step: 'INITIATE', tenantName, userName, email, password, country })
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
        body: JSON.stringify({ step: 'VERIFY', email, code: otp, password })
      });
      const data = await res.json();
      if (res.ok) {
        setRegStep(2);
        setTimeout(() => {
          handleClose();
          router.push('/dashboard');
        }, 1500);
      } else {
        setError(data.error || 'Verification failed.');
      }
    } catch (err) {
      setError('Verification process crashed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 animate-in fade-in" onClick={handleClose} />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-lg my-auto bg-bg/95 backdrop-blur-2xl border border-glass-border rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300 text-fg">
        
        {/* Glow Element */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
        
        <button onClick={handleClose} className="absolute right-6 top-6 sm:right-8 sm:top-8 p-2 text-muted hover:text-fg hover:bg-glass-card rounded-full transition-all z-[110] cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-10 overflow-y-auto flex-1 relative z-50">
          <div className="flex flex-col items-center mb-8">
            <LogoIcon bgClass="bg-fg" iconClass="text-bg" />
            <span className="text-xs font-black text-muted uppercase tracking-[0.4em] leading-none mt-3">PingStack Engine</span>
          </div>

          {regStep === 2 ? (
            <div className="text-center py-8 animate-in fade-in zoom-in duration-700">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-black text-fg mb-3">Welcome Aboard</h2>
              <p className="text-muted font-bold mb-8">Redirecting you to your dashboard...</p>
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
            </div>
          ) : view === 'login' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-black text-fg mb-2">Welcome Back</h2>
              <p className="text-muted font-medium mb-8">Log in to manage your WhatsApp campaigns.</p>
              
              <form className="space-y-4" onSubmit={handleLogin}>
                {error && <div className="text-red-400 text-[13px] font-bold bg-red-500/10 p-4 rounded-2xl border border-red-500/20">{error}</div>}
                
                <div className="space-y-3">
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/30 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                      type="email" required placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full bg-glass-input border border-glass-border rounded-2xl pl-14 pr-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/30"
                    />
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/30 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                      type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full bg-glass-input border border-glass-border rounded-2xl pl-14 pr-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/30"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button type="button" onClick={() => { setView('forgot'); setForgotStep(0); setForgotEmail(email || ''); setError(''); }} className="text-[10px] font-black text-muted hover:text-fg uppercase tracking-widest transition-colors mb-2 cursor-pointer">Forgot Password?</button>
                </div>

                <button 
                  type="submit" disabled={loading}
                  className="w-full py-4 bg-fg text-bg rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3 group cursor-pointer"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin text-bg" /> : (
                    <>
                      <span>Secure Login</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <p className="text-center text-sm font-bold text-muted mt-8">
                  New to PingStack? <button type="button" onClick={() => { setView('register'); setRegStep(0); setError(''); }} className="text-fg hover:underline underline-offset-4 cursor-pointer">Create an account</button>
                </p>
              </form>
            </div>
          ) : view === 'forgot' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {forgotStep === 3 ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h2 className="text-3xl font-black text-fg mb-3">Email Sent</h2>
                  <p className="text-muted font-bold mb-8">Check your inbox for the reset code.</p>
                  <button type="button" onClick={() => { setView('login'); setError(''); }} className="py-3 px-6 bg-fg text-bg rounded-2xl font-black uppercase text-xs">Return to Login</button>
                </div>
              ) : forgotStep === 0 ? (
                <div>
                  <h2 className="text-3xl font-black text-fg mb-2">Access Recovery</h2>
                  <p className="text-muted font-medium mb-8">Enter your email and we'll send a recovery code.</p>
                  <form className="space-y-4" onSubmit={async (e) => {
                    e.preventDefault();
                    setError('');
                    setLoading(true);
                    try {
                      const res = await fetch('/api/auth/forgot-password', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ step: 'INITIATE', email: forgotEmail })
                      });
                      const data = await res.json();
                      if (res.ok) setForgotStep(1);
                      else setError(data.error);
                    } catch (err) { setError('Connection error.'); }
                    finally { setLoading(false); }
                  }}>
                    {error && <div className="text-red-400 text-[13px] font-bold bg-red-500/10 p-4 rounded-2xl border border-red-500/20">{error}</div>}
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/30" />
                      <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} type="email" required placeholder="Email Address" className="w-full bg-glass-input border border-glass-border rounded-2xl pl-14 pr-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/30" />
                    </div>
                    <div className="flex justify-between items-center">
                      <button type="button" onClick={() => { setView('login'); setError(''); }} className="text-[10px] font-black text-muted hover:text-fg uppercase tracking-widest transition-colors cursor-pointer">Back to Login</button>
                      <button type="submit" disabled={loading} className="py-3 px-6 bg-fg text-bg rounded-2xl font-black uppercase text-xs cursor-pointer">Send Reset Code</button>
                    </div>
                  </form>
                </div>
              ) : forgotStep === 1 ? (
                <div>
                  <button onClick={() => setForgotStep(0)} className="mb-6 flex items-center text-[10px] font-black text-muted hover:text-fg uppercase tracking-widest transition-colors group cursor-pointer">Back</button>
                  <h2 className="text-3xl font-black text-fg mb-2">Verify Code</h2>
                  <p className="text-muted font-medium mb-6">Enter the 6-digit code sent to <span className="font-bold text-fg">{forgotEmail}</span></p>
                  <form className="space-y-4" onSubmit={async (e) => {
                    e.preventDefault();
                    setError(''); setLoading(true);
                    try {
                      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 'VERIFY', email: forgotEmail, code: forgotOtp }) });
                      const data = await res.json();
                      if (res.ok) setForgotStep(2); else setError(data.error);
                    } catch (err) { setError('Verification failed.'); }
                    finally { setLoading(false); }
                  }}>
                    {error && <div className="text-red-400 text-[13px] font-bold bg-red-500/10 p-4 rounded-2xl border border-red-500/20">{error}</div>}
                    <div className="relative group">
                      <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-fg/30" />
                      <input value={forgotOtp} onChange={e => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))} type="text" maxLength={6} required placeholder="000000" className="w-full bg-glass-input border border-glass-border rounded-2xl pl-14 pr-5 py-4 text-sm font-black text-fg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/30" />
                    </div>
                    <button type="submit" disabled={loading || forgotOtp.length < 6} className="w-full py-3 bg-fg text-bg rounded-2xl font-black text-xs uppercase cursor-pointer">Verify & Continue</button>
                  </form>
                </div>
              ) : (
                <div>
                  <h2 className="text-3xl font-black text-fg mb-2">New Password</h2>
                  <p className="text-muted font-medium mb-6">Choose a new password for <span className="font-bold text-fg">{forgotEmail}</span></p>
                  <form className="space-y-4" onSubmit={async (e) => {
                    e.preventDefault();
                    if (forgotNewPassword !== forgotConfirmPassword) { setError('Passwords do not match'); return; }
                    if (forgotNewPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
                    setError(''); setLoading(true);
                    try {
                      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 'RESET', email: forgotEmail, code: forgotOtp, password: forgotNewPassword }) });
                      const data = await res.json();
                      if (res.ok) setForgotStep(3); else setError(data.error);
                    } catch (err) { setError('Reset failed.'); }
                    finally { setLoading(false); }
                  }}>
                    {error && <div className="text-red-400 text-[13px] font-bold bg-red-500/10 p-4 rounded-2xl border border-red-500/20">{error}</div>}
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/30" />
                      <input value={forgotNewPassword} onChange={e => setForgotNewPassword(e.target.value)} type="password" required placeholder="New Password" className="w-full bg-glass-input border border-glass-border rounded-2xl pl-14 pr-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/30" />
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/30" />
                      <input value={forgotConfirmPassword} onChange={e => setForgotConfirmPassword(e.target.value)} type="password" required placeholder="Confirm Password" className="w-full bg-glass-input border border-glass-border rounded-2xl pl-14 pr-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/30" />
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-3 bg-fg text-bg rounded-2xl font-black text-xs uppercase cursor-pointer">Reset Password</button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {regStep === 0 ? (
                <>
                  <h2 className="text-3xl font-black text-fg mb-2">Get Started</h2>
                  <p className="text-muted font-medium mb-8">Join the elite network of verified senders.</p>
                  
                  <form className="space-y-4" onSubmit={handleRegisterInitiate}>
                    {error && <div className="text-red-400 text-[13px] font-bold bg-red-500/10 p-4 rounded-2xl border border-red-500/20">{error}</div>}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative group">
                        <Building className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/30 group-focus-within:text-indigo-400 transition-colors" />
                        <input type="text" required placeholder="Company" value={tenantName} onChange={e => setTenantName(e.target.value)} className="w-full bg-glass-input border border-glass-border rounded-2xl pl-12 pr-4 py-3.5 text-xs font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/30" />
                      </div>
                      <div className="relative group">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/30 group-focus-within:text-indigo-400 transition-colors" />
                        <input type="text" required placeholder="Full Name" value={userName} onChange={e => setUserName(e.target.value)} className="w-full bg-glass-input border border-glass-border rounded-2xl pl-12 pr-4 py-3.5 text-xs font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/30" />
                      </div>
                    </div>
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/30 group-focus-within:text-indigo-400 transition-colors" />
                      <input type="email" required placeholder="Work Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-glass-input border border-glass-border rounded-2xl pl-14 pr-5 py-3.5 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/30" />
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/30 group-focus-within:text-indigo-400 transition-colors" />
                      <input type="password" required placeholder="Secure Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-glass-input border border-glass-border rounded-2xl pl-14 pr-5 py-3.5 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/30" />
                    </div>
                    
                    <div className="relative group">
                      <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg/30 group-focus-within:text-indigo-400 transition-colors" />
                      <select 
                        value={country} 
                        onChange={e => setCountry(e.target.value)}
                        className="w-full bg-glass-input border border-glass-border rounded-2xl pl-14 pr-10 py-3.5 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="IN" className="bg-bg text-fg font-bold">India (IN)</option>
                        <option value="US" className="bg-bg text-fg font-bold">United States (US)</option>
                        <option value="GB" className="bg-bg text-fg font-bold">United Kingdom (GB)</option>
                        <option value="AE" className="bg-bg text-fg font-bold">United Arab Emirates (AE)</option>
                        <option value="OTHER" className="bg-bg text-fg font-bold">Other Country</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>

                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest text-center px-4">By joining, you agree to our <Link href="/privacy" className="text-fg hover:underline">Privacy Terms</Link></p>

                    <button 
                      type="submit" disabled={loading}
                      className="w-full py-4 bg-fg text-bg rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3 group mt-4 cursor-pointer"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin text-bg" /> : (
                        <>
                          <span>Create Account</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>

                    <p className="text-center text-sm font-bold text-muted mt-6">
                      Already have an account? <button type="button" onClick={() => { setView('login'); setRegStep(0); setError(''); }} className="text-fg hover:underline underline-offset-4 cursor-pointer">Sign In</button>
                    </p>
                  </form>
                </>
              ) : (
                <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                  <button onClick={() => setRegStep(0)} className="mb-6 flex items-center text-[10px] font-black text-muted hover:text-fg uppercase tracking-widest transition-colors group cursor-pointer">
                    <ArrowLeft className="w-3.5 h-3.5 mr-2 group-hover:-translate-x-1 transition-transform" /> Back
                  </button>
                  <h2 className="text-3xl font-black text-fg mb-2">Verify Identity</h2>
                  <p className="text-muted font-medium mb-6">We've sent a code to <span className="text-fg font-bold">{email}</span></p>

                  <form className="space-y-6" onSubmit={handleRegisterVerify}>
                    {error && <div className="text-red-400 text-[13px] font-bold bg-red-500/10 p-4 rounded-2xl border border-red-500/20">{error}</div>}
                    
                    <div className="relative group">
                      <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-fg/30 group-focus-within:text-indigo-400 transition-colors" />
                      <input 
                        type="text" required maxLength={6} placeholder="000000" value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full bg-glass-input border border-glass-border rounded-3xl pl-16 pr-5 py-5 text-2xl font-black tracking-[0.5em] text-fg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/20"
                      />
                    </div>

                    <button 
                      type="submit" disabled={loading || otp.length < 6}
                      className="w-full py-4 bg-fg text-bg rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 cursor-pointer"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-bg" /> : 'Complete Registration'}
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
