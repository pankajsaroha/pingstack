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
  deletingId,
  onToggleSelection,
  onToggleAll,
  onEditContact,
  onDeleteSingle,
}: ContactsTableProps) {
  const isAllSelected = contacts.length > 0 && selectedIds.size >= contacts.length;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto text-left">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
              <th className="py-3 px-4 w-10">
                <button
                  type="button"
                  onClick={onToggleAll}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                    isAllSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                  }`}
                  aria-label="Select all contacts"
                >
                  {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
              </th>
              <th className="py-3 px-4 font-medium">Name</th>
              <th className="py-3 px-4 font-medium">WhatsApp Phone</th>
              <th className="py-3 px-4 font-medium">Added On</th>
              <th className="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
            {contacts.map((contact) => (
              <tr
                key={contact.id}
                className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group ${
                  selectedIds.has(contact.id) ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                }`}
              >
                <td className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => onToggleSelection(contact.id)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                      selectedIds.has(contact.id)
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 group-hover:border-zinc-400'
                    }`}
                    aria-label={`Select ${contact.name || 'contact'}`}
                  >
                    {selectedIds.has(contact.id) && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                </td>
                <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-200">
                  {contact.name || 'Anonymous'}
                </td>
                <td className="py-3 px-4 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                  {contact.phone_number}
                </td>
                <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                  {formatDate(contact.created_at)}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      title="Edit Contact"
                      onClick={() => onEditContact(contact)}
                      className="p-1.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Delete Contact"
                      disabled={deletingId === contact.id}
                      onClick={() => onDeleteSingle(contact.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {deletingId === contact.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800/50 text-left">
        <div className="p-3 bg-zinc-50 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onToggleAll}
            className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700 dark:text-zinc-300"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              isAllSelected
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'
            }`}>
              {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <span>{isAllSelected ? 'Deselect Page' : 'Select Page'}</span>
          </button>
          <span className="text-[10px] font-mono text-zinc-500">
            {selectedIds.size} Selected
          </span>
        </div>

        {contacts.map((contact) => (
          <div
            key={contact.id}
            className={`p-4 flex items-center justify-between transition-colors ${
              selectedIds.has(contact.id) ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
            }`}
          >
            <div className="flex items-center gap-3" onClick={() => onToggleSelection(contact.id)}>
              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                selectedIds.has(contact.id)
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'
              }`}>
                {selectedIds.has(contact.id) && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">{contact.name || 'Anonymous'}</p>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">{contact.phone_number}</p>
                <p className="text-[10px] text-zinc-400 font-mono">{formatDate(contact.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEditContact(contact)}
                className="p-1.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={deletingId === contact.id}
                onClick={() => onDeleteSingle(contact.id)}
                className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {deletingId === contact.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
