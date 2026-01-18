import { getDatabase, ref, onValue, set } from "firebase/database";
import { getAuth, User } from "firebase/auth";
import { app } from "./FirebaseService";
import { Security } from "./Security";

// Type-only import to avoid circular dependency
import type { useAppStore as useAppStoreType } from "@/store/useAppStore";

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

  private async getStore() {
    const { useAppStore } = await import("@/store/useAppStore");
    return useAppStore;
  }

  public async syncClipboard() {
    if (!this.userId) return;

    const clipboardRef = ref(db, "clipboard/" + this.userId);
    onValue(clipboardRef, async (snapshot) => {
      const data = snapshot.val();
      if (data && Array.isArray(data)) {
        const useAppStore = await this.getStore();
        const store = useAppStore.getState();
        const decrypted = await Promise.all(
          data.map(item => Security.decrypt(item, store.syncPassphrase || undefined))
        );
        store.setExcelAutofillData(decrypted);
      }
    });
  }

  public async setClipboard(clipboard: any[]) {
    if (!this.userId) return;
    const useAppStore = await this.getStore();
    const store = useAppStore.getState();
    const encrypted = await Promise.all(
      clipboard.map(item => Security.encrypt(String(item), store.syncPassphrase || undefined))
    );

    const clipboardRef = ref(db, "clipboard/" + this.userId);
    set(clipboardRef, encrypted);
  }

  public async syncHistory() {
    if (!this.userId) return;

    const historyRef = ref(db, "history/" + this.userId);
    onValue(historyRef, async (snapshot) => {
      const data = snapshot.val();
      if (data && Array.isArray(data)) {
        const useAppStore = await this.getStore();
        const store = useAppStore.getState();
        const decrypted = await Promise.all(
          data.map(item => Security.decrypt(item, store.syncPassphrase || undefined))
        );
      }
    });
  }

  public async setHistory(history: string[]) {
    if (!this.userId) return;
    const useAppStore = await this.getStore();
    const store = useAppStore.getState();
    const encrypted = await Promise.all(
      history.map(item => Security.encrypt(item, store.syncPassphrase || undefined))
    );

    const historyRef = ref(db, "history/" + this.userId);
    set(historyRef, encrypted);
  }

  public async syncApiKeys() {
    // ... to be implemented
  }

  public async setApiKeys(apiKeys: any) {
    if (!this.userId) return;
    const useAppStore = await this.getStore();
    const store = useAppStore.getState();
    const encryptedKeys = await Security.encrypt(JSON.stringify(apiKeys), store.syncPassphrase || undefined);
    const apiKeysRef = ref(db, "apiKeys/" + this.userId);
    set(apiKeysRef, encryptedKeys);
  }
}

export const firebaseSyncService = new FirebaseSyncService();