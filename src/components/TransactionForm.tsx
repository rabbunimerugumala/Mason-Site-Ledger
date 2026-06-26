import React, { useState, useEffect, useRef } from "react";
import { PlusCircle, Edit3, XCircle, Calendar, IndianRupee } from "lucide-react";
import { Transaction } from "../types";

interface TransactionFormProps {
  placeId: string;
  onSave: (tx: Transaction) => Promise<void>;
  txToEdit?: Transaction | null;
  onCancelEdit?: () => void;
}

export default function TransactionForm({
  placeId,
  onSave,
  txToEdit,
  onCancelEdit,
}: TransactionFormProps) {
  // Get today's date in yyyy-mm-dd format in local timezone
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(getTodayString());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const amountRef = useRef<HTMLInputElement>(null);

  // Load existing transaction details if we are in Edit mode
  useEffect(() => {
    setErrorMsg("");
    if (txToEdit) {
      setDate(txToEdit.date);
      setAmount(String(txToEdit.amount));
      setNote(txToEdit.note || "");
      setSuccessMsg("");
    } else {
      setAmount("");
      setNote("");
    }
  }, [txToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const parsedAmount = parseFloat(amount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Please enter an amount greater than 0.");
      amountRef.current?.focus();
      return;
    }

    if (!date) {
      setErrorMsg("Please select a date.");
      return;
    }

    setLoading(true);
    try {
      const savedTx: Transaction = {
        transactionId: txToEdit ? txToEdit.transactionId : "tx_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now(),
        placeId,
        date,
        amount: parsedAmount,
        note: note.trim() || undefined,
        createdAt: txToEdit ? txToEdit.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSave(savedTx);
      
      // Success state
      setSuccessMsg(txToEdit ? "Updated!" : "Saved!");
      setTimeout(() => setSuccessMsg(""), 2000);
      
      // Clear inputs only if not editing
      if (!txToEdit) {
        setAmount("");
        setNote("");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save entry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
          {txToEdit ? <Edit3 className="w-4 h-4 text-royal-green" /> : <PlusCircle className="w-4 h-4 text-royal-green" />}
          {txToEdit ? "Edit Entry" : "New Entry"}
        </h3>
        
        {txToEdit && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs text-gray-500 font-bold flex items-center gap-1 cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            Cancel
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {successMsg && (
          <div className="p-3 bg-green-50 border-2 border-green-500 text-green-900 rounded-xl text-sm font-black text-center">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 border-2 border-red-500 text-red-950 rounded-xl text-sm font-black text-center">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Date Field */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
            Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-royal-green/30"
              required
            />
          </div>
        </div>

        {/* Amount Field */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
            Amount (₹) *
          </label>
          <div className="relative">
            <input
              type="number"
              ref={amountRef}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0.01"
              step="any"
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 pl-7 text-sm font-bold text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-royal-green/30"
              required
            />
            <IndianRupee className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Note Field */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
            Note / Details
          </label>
          <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Wages, Material, Advance"
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm font-medium text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-royal-green/30"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-royal-green text-white flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {txToEdit ? "Save Changes" : "Add Entry"}
        </button>
      </form>
    </div>
  );
}
