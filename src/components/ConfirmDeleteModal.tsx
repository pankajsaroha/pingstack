'use client';

import { Trash2, X, Loader2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDeleting?: boolean;
  checkboxLabel?: string;
  checkboxChecked?: boolean;
  onCheckboxChange?: (checked: boolean) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDeleteModal({
  isOpen,
  title = 'Delete Confirmation',
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDeleting = false,
  checkboxLabel,
  checkboxChecked = false,
  onCheckboxChange,
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200">
      <div className="bg-bg/95 backdrop-blur-xl border border-glass-border rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 relative text-left animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-7 right-7 text-muted hover:text-fg p-2 hover:bg-glass-input rounded-xl transition-colors cursor-pointer border-0 bg-transparent"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 mb-6 shadow-inner">
          <Trash2 className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-black text-fg tracking-tight mb-2">{title}</h3>
        <p className="text-xs text-muted font-medium leading-relaxed mb-6">
          {description}
        </p>

        {checkboxLabel && onCheckboxChange && (
          <div className="flex items-start space-x-3 mb-6 p-4 bg-glass-input border border-glass-border rounded-2xl">
            <input
              id="modal-delete-checkbox"
              type="checkbox"
              checked={checkboxChecked}
              onChange={(e) => onCheckboxChange(e.target.checked)}
              className="h-4.5 w-4.5 mt-0.5 bg-glass-input border-glass-border text-red-500 focus:ring-red-500 rounded cursor-pointer shrink-0"
            />
            <label htmlFor="modal-delete-checkbox" className="text-xs font-bold text-fg/80 cursor-pointer leading-relaxed">
              {checkboxLabel}
            </label>
          </div>
        )}

        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-6 py-3.5 border border-glass-border hover:bg-glass-input rounded-2xl text-xs font-black uppercase tracking-widest text-muted hover:text-fg transition-all cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="px-7 py-3.5 bg-red-600 hover:bg-red-500 disabled:bg-red-600/60 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center border-0 outline-none"
          >
            {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />}
            {isDeleting ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
