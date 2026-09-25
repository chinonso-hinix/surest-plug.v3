/**
 * Native IndexedDB Helper for Large Binary/Base64 Assets
 * Allows Surest Plug to store large ZIP files, databases, and high-res previews
 * without hitting browser 5MB LocalStorage quotas.
 */

const DB_NAME = 'surest_plug_assets_db';
const DB_VERSION = 1;
const STORE_NAME = 'binary_assets';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      // Safety timeout: Never let openDB hang indefinitely (e.g. in restricted sandboxed iframes)
      const timeoutId = setTimeout(() => {
        reject(new Error('IndexedDB open timeout'));
      }, 1500);

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        try {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        } catch (e) {
          clearTimeout(timeoutId);
          reject(e);
        }
      };

      request.onsuccess = () => {
        clearTimeout(timeoutId);
        resolve(request.result);
      };

      request.onerror = () => {
        clearTimeout(timeoutId);
        reject(request.error || new Error('IndexedDB open error'));
      };

      request.onblocked = () => {
        clearTimeout(timeoutId);
        reject(new Error('IndexedDB blocked'));
      };
    } catch (e) {
      reject(e);
    }
  });
}

export async function idbSet(key: string, value: any): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB set warning:', err);
  }
}

export async function idbGet<T = any>(key: string): Promise<T | undefined> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB get warning:', err);
    return undefined;
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete warning:', err);
  }
}

export async function idbGetAllKeys(): Promise<string[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result as string[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}
