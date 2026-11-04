// Keeps the Supabase session for this browser tab and drops it when the tab closes.
// This is not a defense against malicious scripts running in the page.

type AuthStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function createSessionAuthStorage(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): AuthStorage {
  return {
    getItem(key) {
      return storage.getItem(key)
    },
    setItem(key, value) {
      storage.setItem(key, value)
    },
    removeItem(key) {
      storage.removeItem(key)
    },
  }
}
