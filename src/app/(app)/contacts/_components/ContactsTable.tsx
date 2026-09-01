'use client';

import { Check, Pencil, Trash2, Loader2 } from 'lucide-react';

interface ContactsTableProps {
  contacts: any[];
  selectedIds: Set<string>;
  searchQuery: string;
  deletingId?: string | null;
  onToggleSelection: (id: string) => void;
  onToggleAll: () => void;
  onEditContact: (contact: any) => void;
  onDeleteSingle: (id: string) => void;
}

export default function ContactsTable({
  contacts,
  selectedIds,
  searchQuery,
  deletingId,
  onToggleSelection,
  onToggleAll,
  onEditContact,
  onDeleteSingle,
}: ContactsTableProps) {
  const filteredContacts = contacts;

  const isAllSelected = filteredContacts.length > 0 && selectedIds.size >= filteredContacts.length;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto text-left">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-glass-border text-[10px] uppercase font-black tracking-widest text-muted">
              <th className="px-6 py-4 w-12">
                <button
                  type="button"
                  onClick={onToggleAll}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                    isAllSelected
                      ? 'bg-indigo-600 border-indigo-600 shadow-sm'
                      : 'border-fg/30 bg-glass-input hover:border-fg/60'
                  }`}
                >
                  {isAllSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              </th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Phone Number</th>
              <th className="px-6 py-4">Contact Added On</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredContacts.map((contact) => (
              <tr
                key={contact.id}
                className={`group hover:bg-white/[0.02] transition-colors ${
                  selectedIds.has(contact.id) ? 'bg-indigo-500/10' : ''
                }`}
              >
                <td className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => onToggleSelection(contact.id)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                      selectedIds.has(contact.id)
                        ? 'bg-indigo-600 border-indigo-600 shadow-sm'
                        : 'border-fg/30 bg-glass-input hover:border-fg/60'
                    }`}
                  >
                    {selectedIds.has(contact.id) && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm font-bold text-fg">{contact.name || 'Anonymous'}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-fg/50 font-mono tracking-tight">{contact.phone_number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-[11px] font-bold text-fg/40 tracking-tight font-mono">{formatDate(contact.created_at)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      title="Edit Contact"
                      onClick={() => onEditContact(contact)}
                      className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-glass-input rounded-xl transition-colors cursor-pointer border-0 bg-transparent"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete Contact"
                      disabled={deletingId === contact.id}
                      onClick={() => onDeleteSingle(contact.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-glass-input rounded-xl transition-colors cursor-pointer border-0 bg-transparent disabled:opacity-50"
                    >
                      {deletingId === contact.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="sm:hidden divide-y divide-white/5 text-left">
        <div className="p-4 bg-glass-input/40 border-b border-glass-border flex items-center justify-between">
          <button
            type="button"
            onClick={onToggleAll}
            className="flex items-center space-x-3 cursor-pointer text-left border-0 bg-transparent"
          >
            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
              isAllSelected
                ? 'bg-indigo-600 border-indigo-600 shadow-sm'
                : 'border-fg/30 bg-glass-input hover:border-fg/60'
            }`}>
              {isAllSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-fg/80">
              {isAllSelected ? 'Deselect All (This Page)' : 'Select All (This Page)'}
            </span>
          </button>
          <span className="text-[10px] font-mono text-muted font-bold">
            {selectedIds.size} Selected
          </span>
        </div>

        {filteredContacts.map((contact) => (
          <div
            key={contact.id}
            className={`p-5 flex items-center justify-between transition-colors ${
              selectedIds.has(contact.id) ? 'bg-indigo-500/10' : ''
            }`}
          >
            <div className="flex items-center" onClick={() => onToggleSelection(contact.id)}>
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-4 transition-all ${
                selectedIds.has(contact.id)
                  ? 'bg-indigo-600 border-indigo-600 shadow-sm'
                  : 'border-fg/30 bg-glass-input hover:border-fg/60'
              }`}>
                {selectedIds.has(contact.id) && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
              </div>
              <div>
                <p className="font-bold text-fg text-sm">{contact.name || 'Anonymous'}</p>
                <p className="text-[10px] text-muted font-semibold tracking-wide mt-0.5 font-mono">{contact.phone_number}</p>
                <p className="text-[9px] text-fg/30 font-bold tracking-tight font-mono mt-0.5">{formatDate(contact.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => onEditContact(contact)}
                className="p-2 text-indigo-400 hover:bg-glass-input rounded-xl transition-colors cursor-pointer border-0 bg-transparent"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={deletingId === contact.id}
                onClick={() => onDeleteSingle(contact.id)}
                className="p-2 text-red-400 hover:bg-glass-input rounded-xl transition-colors cursor-pointer border-0 bg-transparent disabled:opacity-50"
              >
                {deletingId === contact.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
