'use client';

import { useState, useEffect } from 'react';
import { Plus, Folder, Trash2 } from 'lucide-react';

export default function Groups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      if (Array.isArray(data)) setGroups(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName })
      });
      if (res.ok) {
        setNewGroupName('');
        setShowModal(false);
        fetchGroups();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} group(s)?`)) return;

    try {
      const res = await fetch('/api/groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      if (res.ok) {
        setSelectedIds(new Set());
        fetchGroups();
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
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Groups</h1>
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
            Create Group
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-10 text-gray-500">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="col-span-full bg-white/80 backdrop-blur-md p-10 mt-4 rounded-2xl border border-gray-200/60 shadow-sm text-center">
            <Folder className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-base font-semibold text-gray-900">No groups</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new group.</p>
          </div>
        ) : (
          groups.map(group => (
            <div 
              key={group.id} 
              className={`bg-white/80 backdrop-blur-md p-6 rounded-2xl border relative shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all cursor-pointer ${
                selectedIds.has(group.id) ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200/60'
              }`}
              onClick={(e) => toggleSelection(group.id, e as any)}
            >
              <div className="absolute top-4 right-4">
                <input
                  type="checkbox"
                  checked={selectedIds.has(group.id)}
                  onChange={() => {}} // handled by parent onClick
                  className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded cursor-pointer pointer-events-none"
                />
              </div>
              <div className="flex items-center mb-4 pr-6">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight truncate">{group.name}</h3>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                  ID: {group.public_id}
                </span>
                <p className="text-xs text-gray-400 font-medium">{new Date(group.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 tracking-tight">Create New Group</h3>
            <form onSubmit={handleCreateGroup}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Group Name</label>
                <input
                  type="text"
                  required
                  className="block w-full rounded-xl border border-gray-200 px-3 py-2.5 shadow-[0_2px_4px_rgba(0,0,0,0.02)] focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                />
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
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
