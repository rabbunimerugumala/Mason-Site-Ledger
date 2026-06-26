import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Hammer, 
  Plus, 
  Search, 
  BookOpen, 
  ArrowLeft, 
  MapPin,
  RefreshCw 
} from "lucide-react";
import { Place, Transaction } from "./types";
import { 
  getPlaces, 
  savePlace, 
  deletePlace, 
  getTransactions, 
  saveTransaction, 
  deleteTransaction, 
  clearTransactions,
  onStorageStatusChange,
  deviceId
} from "./lib/db";
import PlaceCard from "./components/PlaceCard";
import PlaceFormModal from "./components/PlaceFormModal";
import TransactionForm from "./components/TransactionForm";
import TransactionList from "./components/TransactionList";
import ConfirmModal from "./components/ConfirmModal";
import AlertModal from "./components/AlertModal";

export default function App() {
  // Navigation State
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [activeTransactions, setActiveTransactions] = useState<Transaction[]>([]);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);
  const [placeToEdit, setPlaceToEdit] = useState<Place | null>(null);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);

  // Custom Modal States for Senior Usability & Sandboxed safety
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: "info" | "error" | "warning";
  }>({
    isOpen: false,
    title: "",
    message: "",
  });
  
  // Storage status state (Cloud/Firebase vs Offline/Local Storage)
  const [storageStatus, setStorageStatus] = useState({ connected: false, provider: "Local" as "Cloud" | "Local" });
  const [toast, setToast] = useState<string | null>(null);

  // Trigger toast notification
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  // Listen to database connection status changes
  useEffect(() => {
    const unsubscribe = onStorageStatusChange((status) => {
      setStorageStatus(status);
    });
    return unsubscribe;
  }, []);

  // Load overall places
  const loadDashboardData = useCallback(async () => {
    try {
      const fetchedPlaces = await getPlaces();
      setPlaces(fetchedPlaces);
    } catch (e) {
      console.error("Error loading dashboard sites", e);
      showToast("Failed to load sites.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load transactions for the currently selected Place
  const loadPlaceData = useCallback(async (placeId: string) => {
    try {
      const txs = await getTransactions(placeId);
      setActiveTransactions(txs);
    } catch (e) {
      console.error("Error loading site transactions", e);
      showToast("Error loading ledger entries.");
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Keep transactions updated if a site is currently open
  useEffect(() => {
    if (selectedPlace) {
      loadPlaceData(selectedPlace.placeId);
    }
  }, [selectedPlace, loadPlaceData]);

  // Sync / Refresh trigger button
  const handleManualRefresh = async () => {
    setLoading(true);
    await loadDashboardData();
    if (selectedPlace) {
      await loadPlaceData(selectedPlace.placeId);
    }
    showToast("Refreshed!");
  };

  // --- PLACE CRUD HANDLERS ---
  
  const handleOpenPlace = (place: Place) => {
    setSelectedPlace(place);
    setTxToEdit(null); // clear any active edit form state
  };

  const handleCreatePlaceBtnClick = () => {
    setPlaceToEdit(null);
    setIsPlaceModalOpen(true);
  };

  const handleEditPlaceBtnClick = (place: Place, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening the card
    setPlaceToEdit(place);
    setIsPlaceModalOpen(true);
  };

  const handleDeletePlaceClick = (placeId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening the card
    
    const targetPlace = places.find(p => p.placeId === placeId);
    if (!targetPlace) return;

    setConfirmConfig({
      isOpen: true,
      title: "Delete Work Site?",
      message: `Are you sure you want to permanently delete "${targetPlace.placeName}"?\n\nThis will permanently delete all entries for this site. This cannot be undone!`,
      confirmText: "Yes, Delete Site",
      cancelText: "No, Keep Site",
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          await deletePlace(placeId);
          showToast("Site deleted.");
          if (selectedPlace?.placeId === placeId) {
            setSelectedPlace(null);
          }
          await loadDashboardData();
        } catch (err) {
          console.error(err);
          showToast("Failed to delete site.");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleSavePlace = async (savedPlace: Place) => {
    try {
      await savePlace(savedPlace);
      showToast(placeToEdit ? "Site updated!" : "Site created!");
      await loadDashboardData();
      
      // If we are currently inside the edited place, update selectedPlace reference
      if (selectedPlace && selectedPlace.placeId === savedPlace.placeId) {
        setSelectedPlace(savedPlace);
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to save site.");
    }
  };

  // --- TRANSACTION CRUD HANDLERS ---

  const handleSaveTransaction = async (tx: Transaction) => {
    try {
      await saveTransaction(tx);
      showToast(txToEdit ? "Entry updated!" : "Entry saved!");
      
      if (selectedPlace) {
        await loadPlaceData(selectedPlace.placeId);
      }
      await loadDashboardData();
      
      setTxToEdit(null);
    } catch (e) {
      console.error(e);
      showToast("Error saving entry.");
      throw e;
    }
  };

  const handleEditTransaction = (tx: Transaction) => {
    setTxToEdit(tx);
    // Scroll back to entry form on mobile
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!selectedPlace) return;
    try {
      await deleteTransaction(selectedPlace.placeId, txId);
      showToast("Entry deleted.");
      await loadPlaceData(selectedPlace.placeId);
      await loadDashboardData();
    } catch (e) {
      console.error(e);
      showToast("Error deleting entry.");
    }
  };

  const handleClearAllTransactions = async () => {
    if (!selectedPlace) return;
    try {
      await clearTransactions(selectedPlace.placeId);
      showToast("All entries cleared.");
      await loadPlaceData(selectedPlace.placeId);
      await loadDashboardData();
    } catch (e) {
      console.error(e);
      showToast("Error clearing entries.");
    }
  };

  // Search filtered places for Dashboard
  const filteredPlaces = (places || []).filter((p) => {
    if (!p) return false;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (p.placeName || "").toLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      {/* Toast Feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-1.5"
          >
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Top Header */}
      <header className="bg-white text-gray-900 py-4 px-4 sticky top-0 z-40 shadow-xs no-print border-b border-gray-200">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-royal-green rounded-lg flex items-center justify-center">
              <Hammer className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider font-black text-gray-500">Khatabook</span>
              <h1 className="text-base font-black tracking-tight leading-none text-royal-green">
                SITES LEDGER
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Storage indicator */}
            <div className="flex items-center gap-1.5 bg-gray-100 py-1 px-2.5 rounded-full border border-gray-200">
              <span className={`w-2 h-2 rounded-full ${
                storageStatus.connected ? "bg-green-600 animate-pulse" : "bg-amber-600"
              }`} />
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-700">
                {storageStatus.provider === "Cloud" ? "Cloud" : "Phone"}
              </span>
            </div>

            {/* Manual Sync */}
            <button
              onClick={handleManualRefresh}
              className="p-1.5 rounded-lg text-gray-700 bg-gray-50 border border-gray-200 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Primary Container Area */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 space-y-4">
        
        {/* Loading Spinner */}
        {loading && places.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Loading Ledger...</p>
          </div>
        )}

        {!loading && (
          <AnimatePresence mode="wait">
            {!selectedPlace ? (
              // ================= DASHBOARD SCREEN =================
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* Search Bar & Create Button */}
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search sites..."
                      className="w-full bg-white border border-gray-300 rounded-xl py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-royal-green/30"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <button
                    onClick={handleCreatePlaceBtnClick}
                    type="button"
                    className="bg-royal-green text-white font-bold text-sm h-[38px] px-4 rounded-xl flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    New Site
                  </button>
                </div>

                {/* Khata Places list */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    My Sites ({filteredPlaces.length})
                  </h3>

                  {filteredPlaces.length === 0 ? (
                    <div className="rounded-2xl p-8 text-center bg-white border border-gray-200 flex flex-col items-center justify-center space-y-2">
                      <BookOpen className="w-8 h-8 text-gray-300" />
                      <h4 className="text-sm font-bold text-gray-900">
                        {searchQuery ? "No Sites Found" : "No sites added yet"}
                      </h4>
                      <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                        {searchQuery 
                          ? "We couldn't find any work sites matching your search."
                          : "Create your first work site to start tracking payments."}
                      </p>
                      
                      {!searchQuery && (
                        <button
                          onClick={handleCreatePlaceBtnClick}
                          className="mt-2 bg-royal-green text-white font-bold text-xs py-2 px-3 rounded-lg cursor-pointer"
                        >
                          Add Site
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {filteredPlaces.map((place) => (
                        <PlaceCard
                          key={place.placeId}
                          place={place}
                          onOpen={handleOpenPlace}
                          onEdit={handleEditPlaceBtnClick}
                          onDelete={handleDeletePlaceClick}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              // ================= SITE DETAIL SCREEN =================
              <motion.div
                key="site-details"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                {/* Back Button */}
                <div>
                  <button
                    onClick={() => setSelectedPlace(null)}
                    type="button"
                    className="flex items-center gap-1 text-xs font-bold text-gray-700 py-1.5 px-3 rounded-lg bg-gray-100 border border-gray-200 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-royal-green" />
                    Back to Sites
                  </button>
                </div>

                {/* Place Profile header */}
                <div className="bg-white rounded-2xl p-4 border border-gray-200 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Active Site</span>
                    <h2 className="text-lg font-black text-royal-green flex items-center gap-1.5 break-words">
                      <MapPin className="w-4 h-4 text-royal-green shrink-0" />
                      {selectedPlace.placeName}
                    </h2>
                  </div>

                  <div className="shrink-0 no-print">
                    <button
                      onClick={(e) => handleEditPlaceBtnClick(selectedPlace, e)}
                      className="text-xs font-bold py-1.5 px-3 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg cursor-pointer"
                    >
                      Rename
                    </button>
                  </div>
                </div>

                {/* Large, High-Contrast Total Card for Seniors */}
                <div className="bg-white rounded-2xl p-6 border-2 border-royal-green shadow-xs text-center space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-widest text-royal-green">
                    TOTAL AMOUNT
                  </span>
                  <div className="text-4xl sm:text-5xl font-black text-royal-green tracking-tight leading-none font-mono">
                    ₹{(activeTransactions || []).reduce((sum, tx) => sum + (Number(tx?.amount) || 0), 0).toLocaleString("en-IN")}
                  </div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {activeTransactions.length} entries written
                  </p>
                </div>

                {/* Form to log entry */}
                <TransactionForm
                  placeId={selectedPlace.placeId}
                  onSave={handleSaveTransaction}
                  txToEdit={txToEdit}
                  onCancelEdit={() => setTxToEdit(null)}
                />

                {/* Transaction list */}
                <TransactionList
                  place={selectedPlace}
                  transactions={activeTransactions}
                  onEdit={handleEditTransaction}
                  onDelete={handleDeleteTransaction}
                  onClearAll={handleClearAllTransactions}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Place Form Modal */}
      <PlaceFormModal
        isOpen={isPlaceModalOpen}
        onClose={() => setIsPlaceModalOpen(false)}
        onSave={handleSavePlace}
        placeToEdit={placeToEdit}
      />

      {/* Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Custom Alert Modal */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Humble Footer */}
      <footer className="py-6 bg-white border-t border-gray-200 mt-auto no-print">
        <div className="max-w-md mx-auto px-4 text-center text-[10px] text-gray-400 font-medium space-y-1">
          <p>© 2026 Mason Site Ledger</p>
          <p className="font-mono">ID: {deviceId}</p>
        </div>
      </footer>
    </div>
  );
}
