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
      
      <div className="max-w-md w-full space-y-8 p-10 bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] relative z-50">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-black p-2.5 rounded-2xl shadow-xl hover:scale-110 transition-transform duration-500 mb-4 ring-4 ring-black/5">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 tracking-tight">
            PingStack
          </span>
        </div>
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">Sign in</h2>
          <p className="mt-2 text-center text-sm text-gray-500 font-medium">Welcome back! Please enter your details.</p>
        </div>
        <form className="mt-8 space-y-5" onSubmit={handleLogin}>
          {error && <div className="text-red-600 text-sm text-center bg-red-50/50 p-3 rounded-xl border border-red-100">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input type="email" required className="block w-full rounded-xl border border-gray-200 bg-white/50 px-4 py-3 shadow-[0_2px_4px_rgba(0,0,0,0.02)] focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm transition-all" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" required className="block w-full rounded-xl border border-gray-200 bg-white/50 px-4 py-3 shadow-[0_2px_4px_rgba(0,0,0,0.02)] focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm transition-all" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-black hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all">
              Sign in
            </button>
          </div>
          <div className="text-center text-sm mt-6 flex flex-col items-center space-y-4">
            <Link href="/register" className="font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Don't have an account? <span className="text-black">Register</span>
            </Link>
            
            <Link href="/privacy" className="text-[10px] font-bold text-gray-400 hover:text-gray-900 transition-all uppercase tracking-[0.2em] pt-6 pb-2 border-t border-gray-50 w-full animate-in fade-in slide-in-from-bottom-2 duration-700 hover:scale-[1.02] active:scale-95">
              Privacy Policy
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
