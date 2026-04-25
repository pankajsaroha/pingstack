'use client';

import { useState } from 'react';
import { Mail, Send, Clock, CheckCircle2 } from 'lucide-react';
import { LandingNav } from '@/components/LandingNav';
import { LandingFooter } from '@/components/LandingFooter';
import { AuthModal } from '@/components/AuthModal';

export default function PublicContact() {
  const [modalType, setModalType] = useState<'login' | 'register' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: 'General Inquiry', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) setSubmitted(true);
      else alert('Failed to send.');
    } catch { alert('Error occurred.'); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <LandingNav onOpenAuth={setModalType} />

      <section className="pt-48 pb-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20">
          <div>
            <h2 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-4">Support</h2>
            <h1 className="text-5xl font-black mb-8">How can we help?</h1>
            <p className="text-white/40 font-medium mb-12">Our team is available 24/7 for enterprise support and API implementation guidance.</p>
            <div className="space-y-6">
              <div className="flex items-center space-x-4"><Mail className="text-blue-400" /> <span>info@pingstack.in</span></div>
              <div className="flex items-center space-x-4"><Clock className="text-indigo-400" /> <span>Within 24 hours</span></div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10">
            {submitted ? (
              <div className="text-center py-10">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-6" />
                <h3 className="text-2xl font-black mb-4">Email Sent!</h3>
                <button onClick={() => setSubmitted(false)} className="text-blue-400 font-black uppercase text-[10px] tracking-widest">Send another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <input type="text" placeholder="Name" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input type="email" placeholder="Email" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <textarea placeholder="Your message..." rows={4} required className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm resize-none" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all">
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <LandingFooter />
      <AuthModal isOpen={modalType !== null} onClose={() => setModalType(null)} initialView={modalType === 'register' ? 'register' : 'login'} />
    </div>
  );
}
