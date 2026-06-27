import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Hammer, 
  Plus, 
  Search, 
  BookOpen, 
  ArrowLeft, 
  MapPin,
  RefreshCw,
  User,
  LogOut,
  UserCheck
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
  deviceId,
  checkUsernameExists,
  registerUsername,
  loginUsername,
  logoutUser
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
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    isDestructive: true,
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

  // Simple Alphanumeric Username Login System State
  const [authUsername, setAuthUsername] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = authUsername.trim();
    if (!cleanUsername) {
      setAuthError("Username cannot be blank!");
      return;
    }

    // Validation: letters, numbers, spaces, underscores, hyphens only
    const validRegex = /^[a-zA-Z0-9_ -]+$/;
    if (!validRegex.test(cleanUsername)) {
      setAuthError("Username contains invalid characters! Only letters, numbers, spaces, underscores, and hyphens are allowed.");
      return;
    }

    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authMode === "register") {
        // Registering
        const exists = await checkUsernameExists(cleanUsername);
        if (exists) {
          setAuthError(`This username "${cleanUsername}" is already used. Please choose another username or use Log In!`);
          setAuthLoading(false);
          return;
        }

        await registerUsername(cleanUsername);
        showToast(`Account "${cleanUsername}" created!`);
        setAuthUsername("");
      } else {
        // Logging in
        const success = await loginUsername(cleanUsername);
        if (!success) {
          setAuthError(`Username "${cleanUsername}" not found. Please double check the spelling or select 'Create Account' to register!`);
          setAuthLoading(false);
          return;
        }
        showToast(`Logged in as ${cleanUsername}!`);
        setAuthUsername("");
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || "An unexpected error occurred during authentication.");
    } finally {
      setAuthLoading(false);
    }
  };
  
  // Storage status state (Cloud/Firebase vs Offline/Local Storage and User Auth)
  const [storageStatus, setStorageStatus] = useState<{
    connected: boolean;
    provider: "Cloud" | "Local";
    username: string | null;
  }>({ connected: false, provider: "Local", username: null });
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

  // Initial load and reload on user change
  useEffect(() => {
    setLoading(true);
    loadDashboardData();
  }, [loadDashboardData, storageStatus.username]);

  // Reset selected site on user change to prevent state cross-contamination
  useEffect(() => {
    setSelectedPlace(null);
    setPlaces([]);
    setActiveTransactions([]);
    setSearchQuery("");
    setPlaceToEdit(null);
    setTxToEdit(null);
  }, [storageStatus.username]);

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

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Active User profile & Log Out */}
            {storageStatus.username && (
              <div className="flex items-center gap-1">
                {/* Username pill */}
                <div className="flex items-center gap-1 bg-royal-green/15 text-royal-green py-1 px-2.5 rounded-full border border-royal-green/20 max-w-[100px] select-none">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-black truncate uppercase tracking-wider">
                    {storageStatus.username}
                  </span>
                </div>
                {/* Distinct Logout Button with nice mobile touch size & clear visual purpose */}
                <button
                  onClick={() => {
                    setConfirmConfig({
                      isOpen: true,
                      title: "Log Out?",
                      message: `Are you sure you want to log out of "${storageStatus.username}"?\n\nYour data is securely saved in the database, and you can log back in with this username at any time.`,
                      confirmText: "Yes, Log Out",
                      cancelText: "No, Stay Logged In",
                      isDestructive: false,
                      onConfirm: () => {
                        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                        logoutUser();
                        showToast("Logged out successfully.");
                      }
                    });
                  }}
                  className="p-1.5 rounded-lg text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 cursor-pointer flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95"
                  title="Log Out"
                  aria-label="Log Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Storage indicator */}
            <div className="flex items-center gap-1 bg-gray-100 py-1 px-2 rounded-full border border-gray-200 select-none">
              <span className={`w-1.5 h-1.5 rounded-full ${
                storageStatus.connected ? "bg-green-600 animate-pulse" : "bg-amber-600"
              }`} />
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-700">
                {storageStatus.provider === "Cloud" ? "Cloud" : "Phone"}
              </span>
            </div>

            {/* Manual Sync */}
            <button
              onClick={handleManualRefresh}
              className="p-1.5 rounded-lg text-gray-700 bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center shrink-0"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Primary Container Area */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 space-y-4">
        
        {!storageStatus.username ? (
          /* Login/Registration Screen */
          <div className="py-4">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-md space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-royal-green/10 text-royal-green rounded-full flex items-center justify-center mx-auto">
                  <User className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-royal-green tracking-tight">SITES LEDGER ACCESS</h2>
                <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                  Log in or register your username to access your secure cloud-synced ledgers and payment logs.
                </p>
              </div>

              {/* Toggle Buttons */}
              <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError(null);
                  }}
                  className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    authMode === "login"
                      ? "bg-white text-royal-green shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError(null);
                  }}
                  className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    authMode === "register"
                      ? "bg-white text-royal-green shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="username" className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Your Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={authUsername}
                    onChange={(e) => {
                      setAuthUsername(e.target.value);
                      setAuthError(null);
                    }}
                    placeholder="e.g. rabbuni"
                    maxLength={20}
                    required
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 px-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-royal-green/30"
                  />
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                    Letters, numbers, spaces, underscores, & hyphens only (Max 20 characters)
                  </p>
                </div>

                {authError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3.5 py-3 rounded-xl font-bold flex items-start gap-2">
                    <span className="shrink-0 font-extrabold">⚠️</span>
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-royal-green hover:bg-royal-green/95 text-white font-black text-sm py-3.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? (
                    <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                  ) : authMode === "login" ? (
                    <>
                      <UserCheck className="w-4.5 h-4.5" />
                      LOG IN
                    </>
                  ) : (
                    <>
                      <Plus className="w-4.5 h-4.5" />
                      CREATE ACCOUNT
                    </>
                  )}
                </button>
              </form>

              {/* Helpful Notice */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-[10px] text-gray-500 leading-relaxed space-y-1">
                <p className="font-extrabold text-gray-600 uppercase tracking-wider">🔒 DATA SEPARATION & SECURITY</p>
                <p>
                  Each username has its own separate, private ledger. Data syncs automatically to the cloud when connected to the internet, so you can access it on any device.
                </p>
              </div>
            </motion.div>
          </div>
        ) : (
          <>
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
          </>
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
        isDestructive={confirmConfig.isDestructive}
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
        <div className="max-w-md mx-auto px-4 text-center text-[10px] text-gray-400 font-medium space-y-4">
          <div className="space-y-1">
            <p>© 2026 Mason Site Ledger</p>
            <p className="font-mono">ID: {deviceId}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
