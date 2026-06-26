import React from "react";
import { Info, AlertCircle } from "lucide-react";

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
  type?: "info" | "error" | "warning";
}

export default function AlertModal({
  isOpen,
  title,
  message,
  buttonText = "OK, I Understand",
  onClose,
  type = "warning",
}: AlertModalProps) {
  if (!isOpen) return null;

  const isError = type === "error" || type === "warning";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-sm bg-white rounded-2xl border-3 border-royal-green shadow-2xl overflow-hidden"
        id="custom-alert-modal"
      >
        {/* Header */}
        <div className={`p-4 ${isError ? 'bg-amber-50 text-amber-900 border-b-2 border-amber-200' : 'bg-sky-50 text-sky-900 border-b-2 border-sky-250'} flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isError ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'}`}>
            {isError ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight">{title}</h3>
          </div>
        </div>

        {/* Message */}
        <div className="p-6">
          <p className="text-base font-bold text-gray-700 leading-relaxed whitespace-pre-wrap">
            {message}
          </p>
        </div>

        {/* Action Button */}
        <div className="bg-gray-50 p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-4 bg-royal-green text-white text-base font-black rounded-xl shadow-md cursor-pointer text-center"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
