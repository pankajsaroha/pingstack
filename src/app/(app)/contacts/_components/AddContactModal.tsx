'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface AddContactModalProps {
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onSaved: (name: string, phone: string) => Promise<void>;
}

export default function AddContactModal({ onClose, onToast, onSaved }: AddContactModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;

    setSubmitting(true);
    try {
      await onSaved(name, phone);
      onClose();
    } catch (err: any) {
      onToast(err.message || 'Failed to add contact', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-bg/95 backdrop-blur-md border border-glass-border rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 relative animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-muted hover:text-fg p-1 hover:bg-glass-input rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-black text-fg mb-6 tracking-tight text-left">Add Contact</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 mb-8 text-left">
            <div>
              <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Name</label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/20"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-fg/30 uppercase tracking-widest mb-2 px-1">Phone Number (with Country Code)</label>
              <input
                type="text"
                required
                placeholder="e.g. +919876543210"
                className="block w-full bg-glass-input border border-glass-border rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-indigo-500 focus:outline-none transition-all placeholder:text-fg/20 font-mono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3.5 border border-glass-border hover:bg-glass-input rounded-2xl text-[10px] font-black text-muted hover:text-fg uppercase tracking-widest cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 bg-fg text-bg hover:opacity-90 disabled:opacity-40 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
            >
              {submitting ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
