import { getDatabase, ref, onValue, set } from "firebase/database";
import { getAuth, User } from "firebase/auth";
import { app } from "./FirebaseService";
import { useAppStore } from "@/store/useAppStore";
import { Security } from "./Security";

const db = getDatabase(app);
const auth = getAuth(app);

class FirebaseSyncService {
  private userId: string | null = null;

  constructor() {
    auth.onAuthStateChanged((user) => {
      if (user) {
        this.userId = user.uid;
        this.syncClipboard();
      } else {
        this.userId = null;
      }
    });
  }

  public async syncClipboard() {
    if (!this.userId) return;

    const clipboardRef = ref(db, "clipboard/" + this.userId);
    onValue(clipboardRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        useAppStore.getState().setExcelAutofillData(Object.values(data));
      }
    });
  }

  public async setClipboard(clipboard: any[]) {
    if (!this.userId) return;

    const clipboardRef = ref(db, "clipboard/" + this.userId);
    set(clipboardRef, clipboard);
  }

  public async syncHistory() {
    // ... to be implemented
  }

  public async setHistory(history: any[]) {
    // ... to be implemented
  }

  public async syncApiKeys() {
    // ... to be implemented
  }

  public async setApiKeys(apiKeys: any) {
    if (!this.userId) return;

    const encryptedKeys = Security.encrypt(JSON.stringify(apiKeys));
    const apiKeysRef = ref(db, "apiKeys/" + this.userId);
    set(apiKeysRef, encryptedKeys);
  }
}

export const firebaseSyncService = new FirebaseSyncService();
