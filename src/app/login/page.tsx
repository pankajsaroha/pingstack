'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden selection:bg-blue-100">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-[100px] pointer-events-none" />
      
      <div className="max-w-md w-full space-y-4 p-8 bg-white/90 backdrop-blur-xl border border-white/60 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] relative z-50">
        <div className="flex flex-col items-center mb-2">
          <div className="bg-black p-2 rounded-xl shadow-lg mb-4 ring-4 ring-gray-50">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-xl font-black text-gray-900 tracking-tight">PingStack</span>
        </div>
        
        <div className="text-center">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Sign in</h2>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleLogin}>
          {error && <div className="text-red-600 text-[13px] font-bold bg-red-50 p-4 rounded-xl border border-red-100">{error}</div>}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Work Email</label>
              <input type="email" required className="block w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3 text-sm font-bold focus:bg-white focus:border-black focus:outline-none focus:ring-4 focus:ring-black/5 transition-all" placeholder="john@company.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
              <input type="password" required className="block w-full rounded-2xl border border-gray-200 bg-white/50 px-4 py-3 text-sm font-bold focus:bg-white focus:border-black focus:outline-none focus:ring-4 focus:ring-black/5 transition-all" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
              <div className="flex justify-end mt-2">
                <a 
                  href="/forgot-password" 
                  onClick={(e) => { e.preventDefault(); window.location.href='/forgot-password'; }}
                  className="text-[10px] font-black text-gray-400 hover:text-black uppercase tracking-[0.15em] transition-all cursor-pointer relative z-[100]"
                >
                  Forgot password?
                </a>
              </div>
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" className="w-full flex justify-center py-4 border border-transparent rounded-2xl shadow-xl text-sm font-black text-white bg-gray-900 hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all">
              Sign in
            </button>
          </div>
          <div className="text-center text-sm mt-6 flex flex-col items-center space-y-4">
            <Link href="/register" className="font-bold text-gray-400 hover:text-gray-900 transition-colors">
              Don't have an account? <span className="text-black">Register</span>
            </Link>
            
            <div className="pt-6 border-t border-gray-50 w-full">
              <Link href="/privacy" className="text-[10px] font-black text-gray-300 hover:text-gray-600 transition-all uppercase tracking-[0.2em]">
                Privacy Terms
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
