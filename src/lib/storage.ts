/**
 * Browser-compatible storage utilities that work with Brave and private browsing modes
 * Handles localStorage/sessionStorage gracefully with fallback to in-memory storage
 */

type StorageType = 'local' | 'session';

// In-memory fallback storage for when browser storage is unavailable
const memoryStore = new Map<string, Map<string, string>>();

// Initialize memory store buckets
memoryStore.set('local', new Map());
memoryStore.set('session', new Map());

/**
 * Safely get an item from storage (localStorage or sessionStorage)
 * Falls back to in-memory storage if browser storage is unavailable
 */
export const safeStorageGetItem = (key: string, storageType: StorageType = 'local'): string | null => {
  try {
    const storage = storageType === 'local' ? localStorage : sessionStorage;
    return storage.getItem(key);
  } catch (error) {
    // Browser storage unavailable (private mode, quota exceeded, etc.)
    console.warn(`Browser ${storageType} storage unavailable, using memory storage:`, error);
    return memoryStore.get(storageType)?.get(key) || null;
  }
};

/**
 * Safely set an item in storage (localStorage or sessionStorage)
 * Falls back to in-memory storage if browser storage is unavailable
 */
export const safeStorageSetItem = (
  key: string,
  value: string,
  storageType: StorageType = 'local'
): void => {
  try {
    const storage = storageType === 'local' ? localStorage : sessionStorage;
    storage.setItem(key, value);
  } catch (error) {
    // Browser storage unavailable
    console.warn(`Browser ${storageType} storage unavailable, using memory storage:`, error);
    memoryStore.get(storageType)?.set(key, value);
  }
};

/**
 * Safely remove an item from storage
 * Falls back to in-memory storage if browser storage is unavailable
 */
export const safeStorageRemoveItem = (
  key: string,
  storageType: StorageType = 'local'
): void => {
  try {
    const storage = storageType === 'local' ? localStorage : sessionStorage;
    storage.removeItem(key);
  } catch (error) {
    console.warn(`Browser ${storageType} storage unavailable, using memory storage:`, error);
    memoryStore.get(storageType)?.delete(key);
  }
};

/**
 * Safely clear all items from storage
 * Falls back to in-memory storage if browser storage is unavailable
 */
export const safeStorageClear = (storageType: StorageType = 'local'): void => {
  try {
    const storage = storageType === 'local' ? localStorage : sessionStorage;
    storage.clear();
  } catch (error) {
    console.warn(`Browser ${storageType} storage unavailable, using memory storage:`, error);
    memoryStore.get(storageType)?.clear();
  }
};

/**
 * Check if browser storage is available
 */
export const isStorageAvailable = (storageType: StorageType = 'local'): boolean => {
  try {
    const storage = storageType === 'local' ? localStorage : sessionStorage;
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};
