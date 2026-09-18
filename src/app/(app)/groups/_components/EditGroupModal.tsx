'use client';

import React, { useState } from 'react';
import { X, Pencil, Loader2 } from 'lucide-react';

interface EditGroupModalProps {
  group: {
    id: string;
    name: string;
    contacts_count?: number;
    [key: string]: any;
  };
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onSuccess: (updatedGroup: any) => void;
}

export default function EditGroupModal({
  group,
  onClose,
  onToast,
  onSuccess,
}: EditGroupModalProps) {
  const [name, setName] = useState(group.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setError('Group name cannot be empty');
      return;
    }

    if (trimmed.length > 100) {
      setError('Group name must not exceed 100 characters');
      return;
    }

    if (trimmed === group.name) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: group.id, name: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update group name');
      }

      const updated = data.data || { ...group, name: trimmed };
      onSuccess(updated);
      onToast(`Group renamed to "${trimmed}"`, 'success');
      onClose();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update group name';
      setError(errorMsg);
      onToast(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Edit Group</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Update the name of this audience group.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <div>
              <label htmlFor="group-name-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Group Name
              </label>
              <input
                id="group-name-input"
                type="text"
                autoFocus
                disabled={saving}
                value={name}
                maxLength={100}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. BCA Students 2026"
                className={`w-full px-3.5 py-2 text-xs rounded-lg border bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 transition-all ${
                  error
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
              {error && (
                <p className="mt-1.5 text-[11px] text-rose-500 font-medium">
                  {error}
                </p>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3.5 bg-zinc-50 dark:bg-zinc-950/60 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 rounded-lg shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
