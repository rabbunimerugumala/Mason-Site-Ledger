import React, { useState, useEffect } from "react";
import { X, Hammer, CheckCircle2 } from "lucide-react";
import { Place } from "../types";

interface PlaceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (place: Place) => void;
  placeToEdit?: Place | null;
}

export default function PlaceFormModal({
  isOpen,
  onClose,
  onSave,
  placeToEdit,
}: PlaceFormModalProps) {
  const [placeName, setPlaceName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (placeToEdit) {
      setPlaceName(placeToEdit.placeName);
    } else {
      setPlaceName("");
    }
    setError("");
  }, [placeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim()) {
      setError("Please enter a site name");
      return;
    }

    const uniqueId = placeToEdit
      ? placeToEdit.placeId
      : "place_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();

    const savedPlace: Place = {
      placeId: uniqueId,
      placeName: placeName.trim(),
      createdAt: placeToEdit ? placeToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(savedPlace);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div 
        className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl p-6"
        id="place-form-modal"
      >
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-5">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Hammer className="w-5 h-5 text-royal-green" />
            {placeToEdit ? "Edit Work Place" : "New Work Place"}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-full text-gray-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
              Work Place Name *
            </label>
            <input
              type="text"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="e.g. Ramesh House"
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base font-medium text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-royal-green/30 focus:bg-white transition-all"
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 text-base font-bold rounded-xl bg-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-royal-green text-white text-base font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
