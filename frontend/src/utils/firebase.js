/**
 * Firebase Configuration and Utilities
 * Initialize Firebase and handle Google authentication
 */

import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "firebase/auth";

import {
  getDatabase,
  ref,
  get
} from "firebase/database";

// Firebase config from .env with fallback defaults matching eco-stride2026
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Auth
export const auth = getAuth(app);

// Realtime Database
export const database = getDatabase(app);

// Google Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});


// ==============================
// Google Sign In
// ==============================

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();

    return {
      success: true,
      idToken,
      user: {
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        uid: result.user.uid
      }
    };

  } catch (error) {
    console.error("Google sign-in error:", error);

    return {
      success: false,
      error: error.message
    };
  }
};


// ==============================
// Logout
// ==============================

export const logoutFromFirebase = async () => {
  try {
    await signOut(auth);
    return { success: true };

  } catch (error) {
    console.error("Sign out error:", error);

    return {
      success: false,
      error: error.message
    };
  }
};


// ==============================
// Get ID Token
// ==============================

export const getIdToken = async (user) => {
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error("Error getting ID token:", error);
    return null;
  }
};


// ==============================
// Admin Functions
// ==============================

/**
 * Get all admins
 */
export const getAdmins = async () => {
  try {
    const adminsRef = ref(database, "admin");
    const snapshot = await get(adminsRef);

    if (snapshot.exists()) return snapshot.val();

    // Also check "admins" plural node if "admin" is empty
    const adminsPluralRef = ref(database, "admins");
    const snapshotPlural = await get(adminsPluralRef);
    return snapshotPlural.exists() ? snapshotPlural.val() : null;

  } catch (error) {
    console.error("Error fetching admins:", error);
    return null;
  }
};


/**
 * Validate Admin Login
 * Checks username + password
 */
export const validateAdminLogin = async (username, password) => {
  try {
    const admins = await getAdmins();

    if (!admins) return { success: false };

    const adminList = Object.values(admins);

    const matchedAdmin = adminList.find(
      (admin) =>
        admin.username === username &&
        admin.password === password
    );

    if (matchedAdmin) {
      return {
        success: true,
        admin: matchedAdmin
      };
    }

    return { success: false };

  } catch (error) {
    console.error("Admin login error:", error);

    return {
      success: false,
      error: error.message
    };
  }
};


// ==============================
// User Functions
// ==============================

/**
 * Fetch all users
 */
export const getAllUsers = async () => {
  try {
    const usersRef = ref(database, "users");
    const snapshot = await get(usersRef);

    return snapshot.exists() ? snapshot.val() : null;

  } catch (error) {
    console.error("Error fetching users:", error);
    return null;
  }
};

/**
 * Fetch a single user by UID
 */
export const getUserByUid = async (uid) => {
  try {
    const userRef = ref(database, `users/${uid}`);
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Firebase user lookup timed out")), 10000);
    });
    const snapshot = await Promise.race([get(userRef), timeout]);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error("Error fetching user by uid:", error);
    return null;
  }
};

export default app;