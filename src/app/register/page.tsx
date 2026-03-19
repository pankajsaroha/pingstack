'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
  const [tenantName, setTenantName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/auth/register-tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantName, userName, email, password })
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-blue-100">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-100/50 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full space-y-8 p-10 bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] relative z-10 transition-all">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900 tracking-tight">Create your PingStack workspace</h2>
          <p className="mt-2 text-center text-sm text-gray-500">Get started with a free account.</p>
        </div>
        <form className="mt-8 space-y-5" onSubmit={handleRegister}>
          {error && <div className="text-red-600 text-sm text-center bg-red-50/50 p-3 rounded-xl border border-red-100">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
              <input type="text" required className="block w-full rounded-xl border border-gray-200 bg-white/50 px-4 py-3 shadow-[0_2px_4px_rgba(0,0,0,0.02)] focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm transition-all" value={tenantName} onChange={e => setTenantName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
              <input type="text" required className="block w-full rounded-xl border border-gray-200 bg-white/50 px-4 py-3 shadow-[0_2px_4px_rgba(0,0,0,0.02)] focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm transition-all" value={userName} onChange={e => setUserName(e.target.value)} />
            </div>
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
              Get Started
            </button>
          </div>
          <div className="text-center text-sm mt-6">
            <Link href="/login" className="font-medium text-gray-500 hover:text-gray-900 transition-colors">
              Already have an account? <span className="text-black">Sign in</span>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
