'use client';

import { useState, useEffect } from 'react';
import { Plus, LayoutTemplate, Trash2 } from 'lucide-react';

export default function Templates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', template_id: '', content: '' });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (Array.isArray(data)) setTemplates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.template_id || !formData.content) return;

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setFormData({ name: '', template_id: '', content: '' });
        setShowModal(false);
        fetchTemplates();
      }
    } catch (e) {
      console.error(e);
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
          {selectedIds.size > 0 && (
            <button 
              onClick={handleDeleteSelected}
              className="flex items-center px-4 py-2 border border-red-200 rounded-xl shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-black transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Template
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
              className={`bg-white/80 backdrop-blur-md p-6 rounded-2xl border relative shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all cursor-pointer ${
                selectedIds.has(template.id) ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200/60'
              }`}
              onClick={(e) => toggleSelection(template.id, e as any)}
            >
              <div className="absolute top-6 right-6">
                <input
                  type="checkbox"
                  checked={selectedIds.has(template.id)}
                  onChange={() => {}} // handled by parent onClick
                  className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded cursor-pointer pointer-events-none"
                />
              </div>
              <div className="flex items-center mb-3">
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">{template.name}</h3>
                <span className="ml-4 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  {template.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 font-medium mb-4">Provider ID: <span className="text-gray-900">{template.template_id}</span></p>
              <div className="bg-gray-50/80 p-5 rounded-xl border border-gray-200/60 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {template.content}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-5 tracking-tight">Add Gupshup Template</h3>
            <form onSubmit={handleCreateTemplate}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Friendly Name</label>
                  <input
                    type="text"
                    required
                    className="block w-full rounded-xl border border-gray-200 px-3 py-2.5 shadow-[0_2px_4px_rgba(0,0,0,0.02)] focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Gupshup Template ID</label>
                  <input
                    type="text"
                    required
                    className="block w-full rounded-xl border border-gray-200 px-3 py-2.5 shadow-[0_2px_4px_rgba(0,0,0,0.02)] focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                    value={formData.template_id}
                    onChange={e => setFormData({ ...formData, template_id: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Template Content</label>
                  <textarea
                    required
                    rows={4}
                    className="block w-full rounded-xl border border-gray-200 px-3 py-2.5 shadow-[0_2px_4px_rgba(0,0,0,0.02)] focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-black transition-colors"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
