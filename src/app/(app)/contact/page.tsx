'use client';

import { useState } from 'react';
import { Mail, MessageSquare, Send, Shield, Globe, Clock, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        alert('Failed to send message. Please try again or email us directly.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('An error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-50 text-green-500 rounded-full mb-8 animate-in zoom-in duration-500">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4">Message Sent!</h1>
        <p className="text-gray-500 max-w-md mx-auto mb-10 font-medium">
          Thank you for reaching out. Our specialized team has received your inquiry and will get back to you within 24 hours.
        </p>
        <button 
          onClick={() => {
            setFormData({ name: '', email: '', subject: 'General Inquiry', message: '' });
            setSubmitted(false);
          }}
          className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all active:scale-95"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* Left Side: Copy & Info */}
        <div className="space-y-12">
          <div>
            <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">Support Center</h2>
            <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-6 leading-[1.1]">
              How can we help <br />your business?
            </h1>
            <p className="text-gray-500 text-lg font-medium max-w-md">
              Whether you have questions about Meta API setup, messaging limits, or custom enterprise solutions, we're here to help.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900">Email Us</h3>
              <p className="text-sm text-gray-500 font-medium">info@pingstack.in</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900">Response Time</h3>
              <p className="text-sm text-gray-500 font-medium">Typically within 24 hours</p>
            </div>
          </div>

          <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-700">
               <Shield className="w-32 h-32" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-4 relative z-10">Technical Support</h3>
            <p className="text-sm text-gray-500 font-medium relative z-10 leading-relaxed">
              Our infrastructure team monitors the platform 24/7. Enterprise clients get priority routing and a dedicated account manager.
            </p>
          </div>
        </div>

        {/* Right Side: Contact Form */}
        <div className="relative">
          {/* Decorative Backgrounds */}
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-100/50 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-indigo-100/50 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative bg-white/80 backdrop-blur-xl border border-white p-8 sm:p-10 rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="John Doe"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    required
                    type="email" 
                    placeholder="john@company.com"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Subject</label>
                <select 
                  value={formData.subject || 'General Inquiry'}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold appearance-none"
                >
                  <option>General Inquiry</option>
                  <option>Technical Support</option>
                  <option>Billing & Subscription</option>
                  <option>API & Webhooks</option>
                  <option>Enterprise Solutions</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Your Message</label>
                <textarea 
                  required
                  rows={5}
                  placeholder="How can we help you?"
                  value={formData.message || ''}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold resize-none"
                />
              </div>

              <button 
                disabled={isSubmitting}
                className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Message</span>
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-6">
                Guaranteed response within <span className="text-blue-600">24 hours</span>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
