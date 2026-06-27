'use client';

import { useState } from 'react';
import { Mail, Clock, CheckCircle2 } from 'lucide-react';
import { LandingNav } from '@/components/LandingNav';
import { LandingFooter } from '@/components/LandingFooter';
import { AuthModal } from '@/components/AuthModal';

export default function PublicContact() {
  const [modalType, setModalType] = useState<'login' | 'register' | 'forgot' | null>(null);
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
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black">
      <LandingNav onOpenAuth={setModalType} />

      <section className="pt-48 pb-32 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em] mb-4">Support & Care</h2>
            <h1 className="text-5xl md:text-6xl font-black mb-8 tracking-tight">How can we help?</h1>
            <p className="text-white/40 font-medium mb-12 leading-relaxed text-base">
              Our integration and engineering teams are available to guide you through onboarding Meta accounts or setting up production queues.
            </p>
            <div className="space-y-6">
              <div className="flex items-center space-x-4 bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Mail className="text-blue-400 w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-wider">Email Support</p>
                  <p className="text-sm font-bold mt-0.5">info@pingstack.in</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Clock className="text-indigo-400 w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-wider">SLA Response Time</p>
                  <p className="text-sm font-bold mt-0.5">Within 24 Hours</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/25 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-black mb-3">Message Dispatched</h3>
                <p className="text-white/40 text-sm mb-8">Our support team will get in touch with you shortly.</p>
                <button 
                  onClick={() => setSubmitted(false)} 
                  className="text-blue-400 hover:text-blue-300 font-black uppercase text-[10px] tracking-[0.2em] cursor-pointer"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 px-1">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. John Doe" 
                    required 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all placeholder:text-white/20" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 px-1">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="e.g. john@company.com" 
                    required 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all placeholder:text-white/20" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 px-1">Message Content</label>
                  <textarea 
                    placeholder="How can our engineering team help you?" 
                    rows={5} 
                    required 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all resize-none placeholder:text-white/20 leading-relaxed" 
                    value={formData.message} 
                    onChange={e => setFormData({...formData, message: e.target.value})} 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full py-4.5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-neutral-100 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] cursor-pointer"
                >
                  {isSubmitting ? 'Sending Message...' : 'Send Inquiry'}
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
