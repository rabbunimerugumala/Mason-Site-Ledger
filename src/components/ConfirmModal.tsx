import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Yes, Delete",
  cancelText = "Cancel",
  isDestructive = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-md bg-white rounded-2xl border-3 border-royal-green shadow-2xl overflow-hidden"
        id="custom-confirm-modal"
      >
        {/* Header/Indicator */}
        <div className={`p-4 ${isDestructive ? 'bg-red-50 text-red-900 border-b-2 border-red-200' : 'bg-royal-green-soft text-royal-green border-b-2 border-royal-green-soft'} flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-royal-green-soft text-royal-green'}`}>
            {isDestructive ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight">{title}</h3>
          </div>
        </div>

        {/* Message body - large, clear text for older users */}
        <div className="p-6">
          <p className="text-base font-semibold text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
            {message}
          </p>
        </div>

        {/* Actions - Massive tap targets for seniors */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-4 border-2 border-gray-300 text-gray-700 text-base font-bold rounded-xl bg-white cursor-pointer text-center"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 px-4 py-4 text-white text-base font-black rounded-xl shadow-md cursor-pointer text-center ${
              isDestructive 
                ? 'bg-red-600' 
                : 'bg-royal-green'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
