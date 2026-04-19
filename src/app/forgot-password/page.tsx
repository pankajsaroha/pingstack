'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, Lock, ArrowLeft, ShieldCheck, KeyRound, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const [step, setStep] = useState(0); // 0: Email, 1: OTP, 2: New Password, 3: Success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'INITIATE', email })
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
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'VERIFY', email, code: otp })
      });

      const data = await res.json();
      if (res.ok) {
        setStep(2);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
        setError('Password must be at least 8 characters');
        return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'RESET', email, code: otp, password: newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        setStep(3);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden italic-none">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/40 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/40 blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full space-y-8 p-10 bg-white border border-gray-100 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] relative z-50">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-black p-3 rounded-2xl shadow-xl mb-6 ring-8 ring-gray-50">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black text-gray-900 tracking-tight">PingStack</span>
        </div>

        {step === 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <Link href="/login" className="mb-8 flex items-center text-xs font-black text-gray-400 hover:text-black uppercase tracking-widest transition-colors group">
              <ArrowLeft className="w-3.5 h-3.5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Login
            </Link>
            <h2 className="text-center text-3xl font-black text-gray-900 tracking-tight">Access Recovery</h2>
            <p className="mt-3 text-center text-sm text-gray-500 font-medium tracking-tight">Enter your email and we'll send you a recovery code.</p>

            <form className="mt-10 space-y-6" onSubmit={handleInitiate}>
              {error && <div className="text-red-600 text-[13px] font-bold bg-red-50 p-4 rounded-2xl border border-red-100">{error}</div>}
              
              <div className="group">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email address</label>
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

              <button 
                type="submit" 
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-2xl shadow-xl text-sm font-black text-white bg-gray-900 hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Code'}
              </button>
            </form>
          </div>
        )}

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <button 
              onClick={() => setStep(0)}
              className="mb-8 flex items-center text-xs font-black text-gray-400 hover:text-black uppercase tracking-widest transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Wrong Email?
            </button>

            <h2 className="text-center text-3xl font-black text-gray-900 tracking-tight">Verify Code</h2>
            <p className="mt-3 text-center text-sm text-gray-500 font-medium tracking-tight">
              Enter the 6-digit code sent to <br />
              <span className="text-black font-bold font-mono">{email}</span>
            </p>

            <form className="mt-10 space-y-6" onSubmit={handleVerify}>
              {error && <div className="text-red-600 text-[13px] font-bold bg-red-50 p-4 rounded-2xl border border-red-100">{error}</div>}

              <div className="group">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 text-center">Recovery OTP</label>
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
                className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-2xl shadow-xl text-sm font-black text-white bg-gray-900 hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Continue'}
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-center text-3xl font-black text-gray-900 tracking-tight">New Password</h2>
            <p className="mt-3 text-center text-sm text-gray-500 font-medium tracking-tight">Secure your account with a fresh password.</p>

            <form className="mt-10 space-y-5" onSubmit={handleReset}>
              {error && <div className="text-red-600 text-[13px] font-bold bg-red-50 p-4 rounded-2xl border border-red-100">{error}</div>}

              <div className="group">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-black transition-colors" />
                  <input 
                    type="password" 
                    required 
                    className="block w-full rounded-2xl border border-gray-100 bg-gray-50/50 pl-12 pr-4 py-3.5 text-sm font-bold placeholder:text-gray-300 focus:bg-white focus:border-black focus:outline-none focus:ring-4 focus:ring-black/5 transition-all" 
                    placeholder="Min. 8 characters"
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-black transition-colors" />
                  <input 
                    type="password" 
                    required 
                    className="block w-full rounded-2xl border border-gray-100 bg-gray-50/50 pl-12 pr-4 py-3.5 text-sm font-bold placeholder:text-gray-300 focus:bg-white focus:border-black focus:outline-none focus:ring-4 focus:ring-black/5 transition-all" 
                    placeholder="Repeat password"
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-2xl shadow-xl text-sm font-black text-white bg-gray-900 hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
              </button>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="text-center animate-in zoom-in-95 duration-500 py-6">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
               <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Success!</h2>
            <p className="mt-4 text-sm text-gray-500 font-medium tracking-tight mb-10">
              Your password has been updated. <br />
              You can now sign in with your new credentials.
            </p>
            <Link 
              href="/login"
              className="w-full block py-4 px-4 border border-transparent rounded-2xl shadow-xl text-sm font-black text-white bg-gray-900 hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Sign In Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
