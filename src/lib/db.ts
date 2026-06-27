import { initializeApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  Firestore,
  writeBatch
} from "firebase/firestore";
import { Place, Transaction } from "../types";

// Memory fallback for localStorage if blocked or disabled (e.g. sandboxed iframe or private window)
const memoryStore: Record<string, string> = {};

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("Storage read failed. Falling back to memory store.", e);
      return memoryStore[key] || null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Storage write failed. Falling back to memory store.", e);
      memoryStore[key] = value;
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("Storage delete failed. Falling back to memory store.", e);
      delete memoryStore[key];
    }
  }
};

// Generate or retrieve a stable device/user ID to partition data locally and in cloud
const getDeviceId = (): string => {
  let id = safeStorage.getItem("mason_ledger_device_id");
  if (!id) {
    id = "mason_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now();
    safeStorage.setItem("mason_ledger_device_id", id);
  }
  return id;
};

export const deviceId = getDeviceId();

// Database state
let db: Firestore | null = null;
let useFirebase = false;

// Active User state (Simple Username-only Auth)
let activeUsername: string | null = safeStorage.getItem("mason_ledger_active_username");

export const getActiveUsername = (): string | null => activeUsername;

// Event emitter to notify the UI when storage engine status or login state changes
type StatusCallback = (status: { connected: boolean; provider: "Cloud" | "Local"; username: string | null }) => void;
const listeners: StatusCallback[] = [];

export const onStorageStatusChange = (callback: StatusCallback) => {
  listeners.push(callback);
  // Immediate trigger
  callback({ connected: useFirebase, provider: useFirebase ? "Cloud" : "Local", username: activeUsername });
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
};

const notifyStatus = () => {
  listeners.forEach(cb => cb({ connected: useFirebase, provider: useFirebase ? "Cloud" : "Local", username: activeUsername }));
};

// Local storage helpers for offline profiles
const getLocalRegisteredUsernames = (): string[] => {
  try {
    const data = safeStorage.getItem("mason_ledger_registered_usernames");
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

const saveLocalRegisteredUsernames = (usernames: string[]) => {
  safeStorage.setItem("mason_ledger_registered_usernames", JSON.stringify(usernames));
};

/**
 * Check if a username is already taken.
 * Returns true if taken, false if available.
 */
export const checkUsernameExists = async (username: string): Promise<boolean> => {
  const normUser = username.trim().toLowerCase();
  if (!normUser) return true; // Empty is considered taken/invalid

  if (useFirebase && db) {
    try {
      const userRef = doc(db, "users", normUser);
      const userSnap = await getDoc(userRef);
      return userSnap.exists();
    } catch (e) {
      console.warn("Firestore check username failed, falling back to local list", e);
    }
  }

  // Fallback to local
  const localUsers = getLocalRegisteredUsernames();
  return localUsers.includes(normUser);
};

/**
 * Register a new username.
 * Throws an error if already exists.
 */
export const registerUsername = async (username: string): Promise<void> => {
  const normUser = username.trim().toLowerCase();
  const displayUser = username.trim();
  if (!normUser) throw new Error("Username cannot be empty.");

  const exists = await checkUsernameExists(normUser);
  if (exists) {
    throw new Error("This username is already taken. Please choose a different name!");
  }

  if (useFirebase && db) {
    try {
      const userRef = doc(db, "users", normUser);
      await setDoc(userRef, {
        username: displayUser,
        createdAt: new Date().toISOString(),
        deviceId
      });
    } catch (e) {
      console.warn("Firestore register username failed, continuing locally", e);
    }
  }

  // Save to local list of usernames for offline lookup
  const localUsers = getLocalRegisteredUsernames();
  if (!localUsers.includes(normUser)) {
    localUsers.push(normUser);
    saveLocalRegisteredUsernames(localUsers);
  }

  // Set as active logged in user
  activeUsername = displayUser;
  safeStorage.setItem("mason_ledger_active_username", displayUser);
  notifyStatus();
  
  // Trigger background sync for this user
  setTimeout(syncLocalToFirebase, 1000);
};

/**
 * Log in with an existing username.
 * Returns true if successful, false if username does not exist.
 */
export const loginUsername = async (username: string): Promise<boolean> => {
  const normUser = username.trim().toLowerCase();
  const displayUser = username.trim();
  if (!normUser) return false;

  const exists = await checkUsernameExists(normUser);
  if (!exists) {
    return false;
  }

  // If online, let's fetch the correct casing of the username if possible
  let finalUsername = displayUser;
  if (useFirebase && db) {
    try {
      const userRef = doc(db, "users", normUser);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        finalUsername = userSnap.data().username || displayUser;
      }
    } catch (e) {
      console.warn("Failed to fetch user profile, using typed username", e);
    }
  }

  activeUsername = finalUsername;
  safeStorage.setItem("mason_ledger_active_username", finalUsername);
  notifyStatus();
  
  // Trigger background sync for this user
  setTimeout(syncLocalToFirebase, 1000);
  return true;
};

/**
 * Log out current user.
 */
export const logoutUser = () => {
  activeUsername = null;
  safeStorage.removeItem("mason_ledger_active_username");
  notifyStatus();
};

// Auto-initialize using environment variables
const initStorage = async () => {
  try {
    const config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID
    };

    if (config.apiKey) {
      if (getApps().length === 0) {
        const app = initializeApp(config);
        db = config.firestoreDatabaseId 
          ? getFirestore(app, config.firestoreDatabaseId)
          : getFirestore(app);
        useFirebase = true;
        console.log("Firebase Firestore initialized successfully as the primary storage engine.");
      } else {
        const app = getApps()[0];
        db = config.firestoreDatabaseId 
          ? getFirestore(app, config.firestoreDatabaseId)
          : getFirestore(app);
        useFirebase = true;
      }
      // Trigger automatic background synchronization of any existing offline/local data
      setTimeout(syncLocalToFirebase, 1000);
    } else {
      console.log("Firebase config missing in environment variables. Continuing in local-only mode.");
    }
  } catch (err) {
    console.log("Firebase initialization failed. Falling back to secure localStorage driver.", err);
  }
  notifyStatus();
};

// Helper to remove undefined values from objects before writing to Firestore
const cleanUndefined = (obj: any): any => {
  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
};

// Automatic background synchronization function
const syncLocalToFirebase = async () => {
  if (!useFirebase || !db) return;
  try {
    const localPlaces = getLocalPlaces();
    const localTransactions = getLocalTransactions();

    if (localPlaces.length === 0) return;

    console.log(`Starting background sync of ${localPlaces.length} places and ${localTransactions.length} transactions to Firestore...`);

    // Let's copy all places
    for (const place of localPlaces) {
      const placeRef = doc(db, "places", place.placeId);
      await setDoc(placeRef, cleanUndefined({ ...place, deviceId, username: activeUsername || null }), { merge: true });
    }

    // Let's copy all transactions
    for (const tx of localTransactions) {
      const txRef = doc(db, "places", tx.placeId, "transactions", tx.transactionId);
      await setDoc(txRef, cleanUndefined({ ...tx, deviceId, username: activeUsername || null }), { merge: true });
    }

    console.log("Background synchronization to Firebase Firestore completed successfully!");
  } catch (e) {
    console.warn("Background sync failed or partially completed:", e);
  }
};

// Trigger async initialization
initStorage();

// LOCAL STORAGE DRIVER HELPERS
const getLocalPlaces = (): Place[] => {
  try {
    const key = activeUsername ? `mason_ledger_places_${activeUsername}` : "mason_ledger_places";
    const data = safeStorage.getItem(key);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to parse local places", e);
    return [];
  }
};

const saveLocalPlaces = (places: Place[]) => {
  const safePlaces = Array.isArray(places) ? places : [];
  const key = activeUsername ? `mason_ledger_places_${activeUsername}` : "mason_ledger_places";
  safeStorage.setItem(key, JSON.stringify(safePlaces));
};

const getLocalTransactions = (): Transaction[] => {
  try {
    const key = activeUsername ? `mason_ledger_transactions_${activeUsername}` : "mason_ledger_transactions";
    const data = safeStorage.getItem(key);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to parse local transactions", e);
    return [];
  }
};

const saveLocalTransactions = (txs: Transaction[]) => {
  const safeTxs = Array.isArray(txs) ? txs : [];
  const key = activeUsername ? `mason_ledger_transactions_${activeUsername}` : "mason_ledger_transactions";
  safeStorage.setItem(key, JSON.stringify(safeTxs));
};

// UNIFIED EXPORTED DATABASE ACTIONS (CRUD)

/**
 * Fetch all Khata Places/Sites
 */
export const getPlaces = async (): Promise<Place[]> => {
  if (useFirebase && db) {
    try {
      const placesCol = collection(db, "places");
      const q = query(placesCol, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const places: Place[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (activeUsername) {
          if (data.username === activeUsername) {
            places.push({
              placeId: docSnap.id,
              placeName: data.placeName || "",
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
            });
          }
        } else {
          if (!data.username && (!data.deviceId || data.deviceId === deviceId)) {
            places.push({
              placeId: docSnap.id,
              placeName: data.placeName || "",
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
            });
          }
        }
      });
      return places;
    } catch (e) {
      console.warn("Firestore read failed, using localStorage fallback", e);
    }
  }
  
  return getLocalPlaces().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

/**
 * Save or update a Khata Place
 */
export const savePlace = async (place: Place): Promise<void> => {
  const enrichedPlace = {
    ...place,
    deviceId, // attach device ID for security/partitioning
    username: activeUsername || null,
  };

  if (useFirebase && db) {
    try {
      const docRef = doc(db, "places", enrichedPlace.placeId);
      await setDoc(docRef, cleanUndefined(enrichedPlace));
    } catch (e) {
      console.warn("Firestore write failed, writing to localStorage", e);
    }
  }

  const places = getLocalPlaces();
  const index = places.findIndex(p => p.placeId === enrichedPlace.placeId);
  if (index !== -1) {
    places[index] = enrichedPlace;
  } else {
    places.push(enrichedPlace);
  }
  saveLocalPlaces(places);
};

/**
 * Delete a Place and all its transactions
 */
export const deletePlace = async (placeId: string): Promise<void> => {
  if (useFirebase && db) {
    try {
      // 1. Delete transactions inside the subcollection first
      const txsCol = collection(db, "places", placeId, "transactions");
      const txSnapshot = await getDocs(txsCol);
      const batch = writeBatch(db);
      txSnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      
      // 2. Delete the place document itself
      const placeRef = doc(db, "places", placeId);
      batch.delete(placeRef);
      
      await batch.commit();
    } catch (e) {
      console.warn("Firestore delete failed, performing local delete", e);
    }
  }

  const places = getLocalPlaces().filter(p => p.placeId !== placeId);
  saveLocalPlaces(places);

  const transactions = getLocalTransactions().filter(t => t.placeId !== placeId);
  saveLocalTransactions(transactions);
};

/**
 * Get all transactions for a specific Place
 * Sorted by date descending, then createdAt descending
 */
export const getTransactions = async (placeId: string): Promise<Transaction[]> => {
  if (useFirebase && db) {
    try {
      const txsCol = collection(db, "places", placeId, "transactions");
      const snapshot = await getDocs(txsCol);
      const txs: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        txs.push({
          transactionId: docSnap.id,
          placeId: placeId,
          date: data.date || "",
          amount: Number(data.amount) || 0,
          note: data.note || "",
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });
      
      return txs.sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } catch (e) {
      console.warn("Firestore read transactions failed, using localStorage fallback", e);
    }
  }

  return getLocalTransactions()
    .filter(t => t.placeId === placeId)
    .sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
};

/**
 * Save or update a transaction
 */
export const saveTransaction = async (tx: Transaction): Promise<void> => {
  const enrichedTx = {
    ...tx,
    deviceId,
    username: activeUsername || null,
  };

  if (useFirebase && db) {
    try {
      const docRef = doc(db, "places", enrichedTx.placeId, "transactions", enrichedTx.transactionId);
      await setDoc(docRef, cleanUndefined(enrichedTx));
      
      // Update place's updatedAt timestamp
      const placeRef = doc(db, "places", enrichedTx.placeId);
      await setDoc(placeRef, { updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.warn("Firestore write transaction failed, using localStorage", e);
    }
  }

  const txs = getLocalTransactions();
  const index = txs.findIndex(t => t.transactionId === enrichedTx.transactionId);
  if (index !== -1) {
    txs[index] = enrichedTx;
  } else {
    txs.push(enrichedTx);
  }
  saveLocalTransactions(txs);

  // Update local place timestamp
  const places = getLocalPlaces();
  const pIndex = places.findIndex(p => p.placeId === enrichedTx.placeId);
  if (pIndex !== -1) {
    places[pIndex].updatedAt = new Date().toISOString();
    saveLocalPlaces(places);
  }
};

/**
 * Delete a transaction
 */
export const deleteTransaction = async (placeId: string, transactionId: string): Promise<void> => {
  if (useFirebase && db) {
    try {
      const docRef = doc(db, "places", placeId, "transactions", transactionId);
      await deleteDoc(docRef);

      // Update place's updatedAt timestamp
      const placeRef = doc(db, "places", placeId);
      await setDoc(placeRef, { updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.warn("Firestore delete transaction failed, performing local delete", e);
    }
  }

  const txs = getLocalTransactions().filter(t => t.transactionId !== transactionId);
  saveLocalTransactions(txs);

  // Update local place timestamp
  const places = getLocalPlaces();
  const pIndex = places.findIndex(p => p.placeId === placeId);
  if (pIndex !== -1) {
    places[pIndex].updatedAt = new Date().toISOString();
    saveLocalPlaces(places);
  }
};

/**
 * Clear all transactions for a Place
 */
export const clearTransactions = async (placeId: string): Promise<void> => {
  if (useFirebase && db) {
    try {
      const txsCol = collection(db, "places", placeId, "transactions");
      const snapshot = await getDocs(txsCol);
      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();

      // Update place's updatedAt timestamp
      const placeRef = doc(db, "places", placeId);
      await setDoc(placeRef, { updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.warn("Firestore clear transactions failed, performing local clear", e);
    }
  }

  const txs = getLocalTransactions().filter(t => t.placeId !== placeId);
  saveLocalTransactions(txs);

  // Update local place timestamp
  const places = getLocalPlaces();
  const pIndex = places.findIndex(p => p.placeId === placeId);
  if (pIndex !== -1) {
    places[pIndex].updatedAt = new Date().toISOString();
    saveLocalPlaces(places);
  }
};


