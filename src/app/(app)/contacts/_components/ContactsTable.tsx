'use client';

import { Check, Pencil, Trash2 } from 'lucide-react';

interface ContactsTableProps {
  contacts: any[];
  selectedIds: Set<string>;
  searchQuery: string;
  onToggleSelection: (id: string) => void;
  onToggleAll: () => void;
  onEditContact: (contact: any) => void;
  onDeleteSingle: (id: string) => void;
}

export default function ContactsTable({
  contacts,
  selectedIds,
  searchQuery,
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
        <table className="min-w-full divide-y divide-white/5">
          <thead className="bg-glass-card/85 border-b border-glass-border">
            <tr>
              <th scope="col" className="px-6 py-4 text-left w-12">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleAll}
                  className="h-5 w-5 bg-glass-input border-glass-border text-indigo-500 focus:ring-white rounded cursor-pointer animate-none"
                />
              </th>
              <th scope="col" className="px-6 py-4 text-left text-[9px] font-black text-muted uppercase tracking-widest">Name</th>
              <th scope="col" className="px-6 py-4 text-left text-[9px] font-black text-muted uppercase tracking-widest">Phone Number</th>
              <th scope="col" className="px-6 py-4 text-left text-[9px] font-black text-muted uppercase tracking-widest">Added On</th>
              <th scope="col" className="px-6 py-4 text-right text-[9px] font-black text-muted uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-transparent">
            {filteredContacts.map((contact) => (
              <tr key={contact.id} className="hover:bg-glass-card transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap w-12 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(contact.id)}
                    onChange={() => onToggleSelection(contact.id)}
                    className="h-5 w-5 bg-glass-input border-glass-border text-indigo-500 focus:ring-white rounded cursor-pointer"
                  />
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
                      onClick={() => onDeleteSingle(contact.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-glass-input rounded-xl transition-colors cursor-pointer border-0 bg-transparent"
                    >
                      <Trash2 className="w-4 h-4" />
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
        {filteredContacts.map((contact) => (
          <div
            key={contact.id}
            className={`p-5 flex items-center justify-between transition-colors ${
              selectedIds.has(contact.id) ? 'bg-indigo-500/5' : ''
            }`}
          >
            <div className="flex items-center" onClick={() => onToggleSelection(contact.id)}>
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-4 transition-colors ${
                selectedIds.has(contact.id) ? 'bg-white border-white' : 'border-glass-border bg-glass-input'
              }`}>
                {selectedIds.has(contact.id) && <Check className="w-3.5 h-3.5 text-black" />}
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
                onClick={() => onDeleteSingle(contact.id)}
                className="p-2 text-red-400 hover:bg-glass-input rounded-xl transition-colors cursor-pointer border-0 bg-transparent"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
