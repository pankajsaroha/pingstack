'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, Lock, User, Building, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function Register() {
  const [step, setStep] = useState(0); // 0: Details, 1: OTP
  const [tenantName, setTenantName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'INITIATE', tenantName, userName, email, password })
      });

      const data = await res.json();
      if (res.ok) {
        setStep(1);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'VERIFY', email, code: otp })
      });

      const data = await res.json();
      if (res.ok) {
        document.cookie = `token=${data.token}; path=/; max-age=604800`;
        router.push('/dashboard');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-blue-100">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/40 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/40 blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full space-y-8 p-10 bg-white border border-gray-100 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] relative z-50 transition-all duration-500">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-black p-3 rounded-2xl shadow-xl hover:scale-105 transition-transform duration-500 mb-6 ring-8 ring-gray-50">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-2xl font-black text-gray-900 tracking-tight">PingStack</span>
        </div>

        {step === 0 ? (
          <>
            <div>
              <h2 className="text-center text-3xl font-black text-gray-900 tracking-tight">Create Account</h2>
              <p className="mt-2 text-center text-sm text-gray-500 font-medium tracking-tight">Get started with a verified business profile.</p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleInitiate}>
              {error && (
                <div className="flex items-center space-x-2 text-red-600 text-[13px] font-bold bg-red-50 p-4 rounded-2xl border border-red-100 animate-in fade-in slide-in-from-top-2">
                  <span>{error}</span>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="group">
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Company Name</label>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-black transition-colors" />
                    <input 
                      type="text" 
                      required 
                      className="block w-full rounded-2xl border border-gray-100 bg-gray-50/50 pl-12 pr-4 py-3.5 text-sm font-bold placeholder:text-gray-300 focus:bg-white focus:border-black focus:outline-none focus:ring-4 focus:ring-black/5 transition-all" 
                      placeholder="e.g. Acme Corp"
                      value={tenantName} 
                      onChange={e => setTenantName(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-black transition-colors" />
                    <input 
                      type="text" 
                      required 
                      className="block w-full rounded-2xl border border-gray-100 bg-gray-50/50 pl-12 pr-4 py-3.5 text-sm font-bold placeholder:text-gray-300 focus:bg-white focus:border-black focus:outline-none focus:ring-4 focus:ring-black/5 transition-all" 
                      placeholder="John Doe"
                      value={userName} 
                      onChange={e => setUserName(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-black transition-colors" />
                    <input 
                      type="email" 
                      required 
                      className="block w-full rounded-2xl border border-gray-100 bg-gray-50/50 pl-12 pr-4 py-3.5 text-sm font-bold placeholder:text-gray-300 focus:bg-white focus:border-black focus:outline-none focus:ring-4 focus:ring-black/5 transition-all" 
                      placeholder="john@company.com"
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-black transition-colors" />
                    <input 
                      type="password" 
                      required 
                      className="block w-full rounded-2xl border border-gray-100 bg-gray-50/50 pl-12 pr-4 py-3.5 text-sm font-bold placeholder:text-gray-300 focus:bg-white focus:border-black focus:outline-none focus:ring-4 focus:ring-black/5 transition-all" 
                      placeholder="Min. 8 characters"
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-2xl shadow-xl text-sm font-black text-white bg-gray-900 hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Get Started'}
              </button>
            </form>
          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <button 
              onClick={() => setStep(0)}
              className="mb-8 flex items-center text-xs font-black text-gray-400 hover:text-black uppercase tracking-widest transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Details
            </button>

            <div>
              <h2 className="text-center text-3xl font-black text-gray-900 tracking-tight">Verify Email</h2>
              <p className="mt-3 text-center text-sm text-gray-500 font-medium tracking-tight">
                We've sent a 6-digit code to <br />
                <span className="text-black font-bold font-mono">{email}</span>
              </p>
            </div>

            <form className="mt-10 space-y-6" onSubmit={handleVerify}>
              {error && (
                <div className="text-red-600 text-[13px] font-bold bg-red-50 p-4 rounded-2xl border border-red-100">
                  {error}
                </div>
              )}

              <div className="group">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 text-center">Verification Code</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-900" />
                  <input 
                    type="text" 
                    required 
                    maxLength={6}
                    placeholder="000000"
                    className="block w-full rounded-2xl border border-gray-100 bg-gray-50/50 pl-14 pr-4 py-5 text-2xl font-black tracking-[1em] text-center placeholder:text-gray-200 focus:bg-white focus:border-black focus:outline-none focus:ring-4 focus:ring-black/5 transition-all" 
                    value={otp} 
                    onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading || otp.length < 6}
                className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-2xl shadow-xl text-sm font-black text-white bg-gray-900 hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-[0_10px_30px_rgba(0,0,0,0.1)]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Registration'}
              </button>

              <div className="text-center">
                <button 
                  type="button"
                  onClick={handleInitiate}
                  className="text-xs font-black text-gray-400 hover:text-black uppercase tracking-widest transition-colors underline decoration-gray-200 underline-offset-4"
                >
                  Resend Code
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 0 && (
          <div className="text-center text-sm mt-8 flex flex-col items-center space-y-6">
            <Link href="/login" className="font-bold text-gray-400 hover:text-gray-900 transition-colors">
              Already have an account? <span className="text-black">Sign in</span>
            </Link>

            <div className="pt-8 border-t border-gray-50 w-full">
              <Link href="/privacy" className="text-[10px] font-black text-gray-300 hover:text-gray-600 transition-all uppercase tracking-[0.2em]">
                Privacy & Data Terms
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
