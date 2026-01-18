// src/lib/FirebaseService.ts
import { initializeApp, getApp, getApps, FirebaseApp, deleteApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged as firebaseOnAuthStateChanged, User, Auth, signInWithCustomToken as firebaseSignInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, Firestore, query, orderBy, getDocs } from 'firebase/firestore';

class FirebaseService {
  app: FirebaseApp | null = null;
  auth: Auth | null = null;
  firestore: Firestore | null = null;
  private googleProvider: GoogleAuthProvider;

  constructor() {
    this.googleProvider = new GoogleAuthProvider();
  }

  async initializeFirebase(config: any, appName: string = 'cometBrowserApp') {
    // Check if an app with this name already exists
    const existingApp = getApps().find(app => app.name === appName);

    if (existingApp) {
      // If an app with the same name exists, delete it before re-initializing
      // This is crucial to prevent re-initialization errors if the config changes
      await deleteApp(existingApp);
    }

    this.app = initializeApp(config, appName);
    this.auth = getAuth(this.app);
    this.firestore = getFirestore(this.app);
    console.log(`Firebase app '${appName}' initialized/re-initialized.`);
  }

  // Sign in with Google
  async signInWithGoogle(): Promise<User | null> {
    if (!this.auth) {
      console.error("Firebase Auth not initialized.");
      return null;
    }
    try {
      const result = await signInWithPopup(this.auth, this.googleProvider);
      return result.user;
    } catch (error) {
      console.error("Error during Google sign-in:", error);
      return null;
    }
  }

  async signInWithCustomToken(token: string): Promise<User | null> {
    if (!this.auth) {
      console.error("Firebase Auth not initialized.");
      return null;
    }
    try {
      const result = await firebaseSignInWithCustomToken(this.auth, token);
      return result.user;
    } catch (error) {
      console.error("Error signing in with custom token:", error);
      return null;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    if (!this.auth) {
      console.error("Firebase Auth not initialized.");
      return;
    }
    try {
      await firebaseSignOut(this.auth);
    } catch (error) {
      console.error("Error during sign-out:", error);
    }
  }

  // Listen for auth state changes
  onAuthStateChanged(callback: (user: User | null) => void) {
    if (!this.auth) {
      console.error("Firebase Auth not initialized.");
      // Return a no-op unsubscribe function
      return () => {};
    }
    return firebaseOnAuthStateChanged(this.auth, callback);
  }

  // Add a new history entry for a user
  async addHistoryEntry(userId: string, url: string, title: string): Promise<void> {
    if (!this.firestore) {
      console.error("Firebase Firestore not initialized.");
      return;
    }
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

  // Get a user's history
  async getHistory(userId: string): Promise<any[]> {
    if (!this.firestore) {
      console.error("Firebase Firestore not initialized.");
      return [];
    }
    try {
      if (!userId) {
        throw new Error("User ID is required to get history.");
      }
      const historyCollectionRef = collection(this.firestore, `users/${userId}/history`);
      const q = query(historyCollectionRef, orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) => {
      console.error("Error getting history:", error);
      return [];
    }
  }
}

const firebaseService = new FirebaseService();
export default firebaseService;