'use client';

import { useState, useEffect } from 'react';
import { Plus, LayoutTemplate, Trash2, Globe, Tag, RefreshCw, Loader2, AlertCircle, X } from 'lucide-react';

const LANGUAGES = [
  { code: 'en_US', label: 'English (US)' },
  { code: 'en_GB', label: 'English (UK)' },
  { code: 'hi_IN', label: 'Hindi' },
  { code: 'es_ES', label: 'Spanish' },
  { code: 'pt_BR', label: 'Portuguese (BR)' },
  { code: 'ar_SA', label: 'Arabic' },
  { code: 'fr_FR', label: 'French' },
  { code: 'de_DE', label: 'German' },
  { code: 'id_ID', label: 'Indonesian' },
];

export default function Templates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    language: 'en_US', 
    category: 'UTILITY', 
    bodyText: '' 
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async (sync = false) => {
    if (sync) setSyncing(true);
    try {
      // Use the Meta-specific sync endpoint if requested
      const url = sync ? '/api/whatsapp/meta/templates' : '/api/templates';
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) setTemplates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.bodyText) return;

    setSyncing(true);
    try {
      const res = await fetch('/api/whatsapp/meta/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setFormData({ name: '', language: 'en_US', category: 'UTILITY', bodyText: '' });
        setShowModal(false);
        fetchTemplates(true); // Sync after creation
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create template');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} template(s)?`)) return;

    try {
      const res = await fetch('/api/templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      if (res.ok) {
        setSelectedIds(new Set());
        fetchTemplates();
      } else {
        const data = await res.json();
        alert('Error: ' + data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Message Templates</h1>
        <div className="flex space-x-3">
          <button 
            onClick={() => fetchTemplates(true)}
            disabled={syncing}
            className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-black text-gray-700 hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`mr-2 h-4 w-4 text-blue-500 ${syncing ? 'animate-spin' : ''}`} />
            Sync with Meta
          </button>
          {selectedIds.size > 0 && (
            <button 
              onClick={handleDeleteSelected}
              className="flex items-center px-4 py-2 border border-red-100 rounded-xl shadow-sm text-sm font-black text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedIds.size})
            </button>
          )}
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center px-6 py-2 border border-transparent rounded-xl shadow-xl text-sm font-black text-white bg-gray-900 hover:bg-black transition-all active:scale-95"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md p-10 mt-4 rounded-2xl border border-gray-200/60 shadow-sm text-center">
            <LayoutTemplate className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-base font-semibold text-gray-900">No templates</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by linking a WhatsApp template.</p>
          </div>
        ) : (
          templates.map(template => (
            <div 
              key={template.id} 
              className={`bg-white/80 backdrop-blur-md p-6 rounded-2xl border relative shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all cursor-pointer group-card ${
                selectedIds.has(template.id) ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200/60'
              }`}
              onClick={(e) => toggleSelection(template.id, e as any)}
            >
              <div className="absolute top-6 right-6 z-30">
                <input
                  type="checkbox"
                  checked={selectedIds.has(template.id)}
                  onChange={() => {}} 
                  className="h-5 w-5 text-black focus:ring-black border-gray-300 rounded-lg cursor-pointer transition-transform active:scale-90"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center mb-4 gap-2">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{template.name}</h3>
                <div className="flex gap-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    template.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    template.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {template.status || 'PENDING'}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-600">
                    <Globe className="w-3 h-3 mr-1" />
                    {template.language || 'en_US'}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600">
                    <Tag className="w-3 h-3 mr-1" />
                    {template.category || 'UTILITY'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-4">Meta ID: <span className="text-gray-900 font-mono">{template.template_id}</span></p>
              <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed relative">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                   <LayoutTemplate className="w-8 h-8" />
                </div>
                {template.content}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-[2px] z-[100] overflow-y-auto animate-in fade-in duration-200">
          <div className="flex min-h-full items-start justify-center p-4 text-center sm:items-center sm:p-8">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-xl w-full p-8 border border-gray-100 animate-in zoom-in-95 duration-300 relative text-left my-8 sm:my-0">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-8 right-8 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center mb-10">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mr-6 shadow-sm">
                 <LayoutTemplate className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Create Meta Template</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Direct Cloud API Submission</p>
              </div>
            </div>

            <form onSubmit={handleCreateTemplate}>
              <div className="space-y-8 mb-10">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Template Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. order_confirmation"
                    className="block w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-sm font-bold shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  />
                  <p className="text-[10px] text-gray-400 mt-2.5 px-1 font-medium italic">Lowercase letters and underscores only.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Category</label>
                    <select
                      className="block w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-sm font-bold shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="UTILITY">Utility</option>
                      <option value="MARKETING">Marketing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Language</label>
                    <select
                      className="block w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-sm font-bold shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                      value={formData.language}
                      onChange={e => setFormData({ ...formData, language: e.target.value })}
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Body Content</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Hi {{1}}, your order {{2}} is ready!"
                    className="block w-full rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 text-sm font-bold shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all leading-relaxed"
                    value={formData.bodyText}
                    onChange={e => setFormData({ ...formData, bodyText: e.target.value })}
                  />
                  <div className="mt-4 flex items-start p-4 bg-blue-50/40 rounded-2xl border border-blue-100/30">
                    <AlertCircle className="w-4 h-4 text-blue-500 mr-3 mt-0.5" />
                    <p className="text-[10px] text-blue-700 font-bold leading-normal uppercase tracking-wider">
                      Use <code className="bg-blue-100 px-1.5 py-0.5 rounded-md mx-1 font-mono">{"{{1}}"}</code> for variables. Meta will review content before approval.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-5 border border-gray-100 rounded-2xl text-[10px] font-black text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all uppercase tracking-[0.2em]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="flex-[2] px-6 py-5 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center"
                >
                  {syncing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Submit to Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
