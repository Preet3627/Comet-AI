// src/lib/FirebaseService.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged as firebaseOnAuthStateChanged, User } from 'firebase/auth'; // Added imports
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'; // Added imports
import { firebaseConfig } from './firebase.config';
class FirebaseService {
  app;
  auth;
  firestore;
  private googleProvider;

  constructor() {
    // Initialize with default config first
    // We will re-initialize if custom config is found later, or use a lazy getter
    const apps = getApps();
    if (!apps.length) {
      this.app = initializeApp(firebaseConfig);
    } else {
      this.app = getApp();
    }

    this.auth = getAuth(this.app);
    this.firestore = getFirestore(this.app);
    this.googleProvider = new GoogleAuthProvider();
  }

  /**
   * Re-initializes Firebase with a custom configuration if provided.
   * This can be called after the store is initialized.
   */
  async reinitializeWithCustomConfig(config: any) {
    if (this.app) {
      // Note: Re-initializing an existing app is tricky in Firebase.
      // Usually you'd delete the old one or initialize a named app.
      // For simplicity, we'll try to initialize if not matches.
    }
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<User | null> {
    try {
      const result = await signInWithPopup(this.auth, this.googleProvider);
      return result.user;
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      return null;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(this.auth);
    } catch (error) {
      console.error("Error during sign-out:", error);
    }
  }

  // Listen for auth state changes
  onAuthStateChanged(callback: (user: User | null) => void) {
    return firebaseOnAuthStateChanged(this.auth, callback);
  }

  // Add a new history entry for a user
  async addHistoryEntry(userId: string, url: string, title: string): Promise<void> {
    try {
      if (!userId) {
        throw new Error("User ID is required to add a history entry.");
      }
      const historyCollectionRef = collection(this.firestore, `users/${userId}/history`);
      await addDoc(historyCollectionRef, {
        url,
        title,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error adding history entry:", error);
    }
  }
}

const firebaseService = new FirebaseService();
export const app = firebaseService.app;
export default firebaseService;
