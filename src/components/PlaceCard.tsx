import React, { useState, useEffect } from "react";
import { Hammer, ChevronRight, Edit2, Trash2, CalendarDays } from "lucide-react";
import { Place } from "../types";
import { getTransactions } from "../lib/db";

interface PlaceCardProps {
  key?: string;
  place: Place;
  onOpen: (place: Place) => void;
  onEdit: (place: Place, e: React.MouseEvent) => void;
  onDelete: (placeId: string, e: React.MouseEvent) => any;
}

export default function PlaceCard({
  place,
  onOpen,
  onEdit,
  onDelete,
}: PlaceCardProps) {
  const [totals, setTotals] = useState({ totalAmount: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchTotals = async () => {
      try {
        const txs = await getTransactions(place.placeId);
        if (!active) return;
        
        let totalAmount = 0;
        const safeTxs = Array.isArray(txs) ? txs : [];
        safeTxs.forEach((t) => {
          if (t) {
            totalAmount += Number(t.amount) || 0;
          }
        });

        setTotals({
          totalAmount,
          count: safeTxs.length
        });
      } catch (e) {
        console.error("Error reading totals for place: " + place.placeId, e);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchTotals();
    return () => {
      active = false;
    };
  }, [place.placeId, place.updatedAt]);

  const handleCardClick = () => {
    onOpen(place);
  };

  const getRelativeDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
    } catch (e) {
      return "";
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs cursor-pointer relative flex flex-col justify-between overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-1.5 h-full bg-royal-green" />

      <div>
        <div className="flex justify-between items-start gap-2 mb-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900 break-words leading-tight flex items-center gap-1.5">
              <Hammer className="w-4 h-4 text-royal-green shrink-0" />
              {place.placeName}
            </h3>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
        </div>
      </div>

      <div className="mt-4 border-t border-gray-100 pt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Entries</span>
            <span className="text-xs font-bold text-gray-700">
              {loading ? "..." : totals.count}
            </span>
          </div>

          <div className="flex flex-col border-l border-gray-200 pl-3">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Last Entry</span>
            <span className="text-xs text-gray-700 flex items-center gap-0.5">
              <CalendarDays className="w-3 h-3 text-gray-400" />
              {getRelativeDate(place.updatedAt)}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
          {loading ? (
            <span className="text-xs text-gray-400">Loading...</span>
          ) : (
            <p className="text-base font-extrabold text-royal-green">
              ₹{totals.totalAmount.toLocaleString("en-IN")}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-gray-100 mt-3 pt-2.5 no-print">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(place, e);
          }}
          className="text-xs font-bold text-gray-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(place.placeId, e);
          }}
          className="text-xs font-bold text-red-600 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-100 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
