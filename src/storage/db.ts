/* IndexedDB storage layer — local-first, no backend. */

export const STORES = [
  'settings',
  'transactions',
  'budgets',
  'groceryLists',
  'inventory',
  'tasks',
  'notes',
  'events',
  'students',
  'subjects',
  'assignments',
  'exams',
  'customers',
  'products',
  'sales',
  'invoices',
  'quotations',
  'receipts',
  'vehicles',
  'maintenance',
  'documents',
  'reminders',
  'favorites',
  'recentTools',
  'businessProfile',
  'studySessions',
] as const;

export type StoreName = (typeof STORES)[number];

const DB_NAME = 'pakutility-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (db.objectStoreNames.contains(name)) continue;
        if (name === 'settings') {
          db.createObjectStore(name, { keyPath: 'key' });
        } else {
          const store = db.createObjectStore(name, { keyPath: 'id' });
          // helpful indexes
          if (name === 'transactions') {
            store.createIndex('date', 'date', { unique: false });
            store.createIndex('category', 'category', { unique: false });
          }
          if (name === 'tasks') store.createIndex('dueDate', 'dueDate', { unique: false });
          if (name === 'events') store.createIndex('date', 'date', { unique: false });
          if (name === 'exams') store.createIndex('date', 'date', { unique: false });
          if (name === 'assignments') store.createIndex('dueDate', 'dueDate', { unique: false });
          if (name === 'invoices' || name === 'quotations' || name === 'receipts')
            store.createIndex('date', 'date', { unique: false });
          if (name === 'documents') store.createIndex('expiryDate', 'expiryDate', { unique: false });
          if (name === 'recentTools') store.createIndex('at', 'at', { unique: false });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Database upgrade blocked. Please close other tabs.'));
  });
  return dbPromise;
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.onerror = () => reject(t.error);
      }),
  );
}

export function uid(prefix = ''): string {
  const r = Math.random().toString(36).slice(2, 10);
  const t = Date.now().toString(36);
  return `${prefix}${t}${r}`;
}

// ---- change notifications ----
type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

export const db = {
  async get<T>(store: StoreName, key: string): Promise<T | undefined> {
    const v = await tx<any>(store, 'readonly', (s) => s.get(key));
    return (v ?? undefined) as T | undefined;
  },
  async set(store: StoreName, key: string, value: unknown): Promise<void> {
    if (store === 'settings') {
      await tx(store, 'readwrite', (s) => s.put({ key, value }));
    } else {
      await tx(store, 'readwrite', (s) => s.put({ ...(value as object), id: key }));
    }
    notify();
  },
  async add<T extends { id?: string }>(store: StoreName, value: T): Promise<string> {
    const id = value.id || uid();
    await tx(store, 'readwrite', (s) => s.add({ ...value, id }));
    notify();
    return id;
  },
  async put<T extends { id: string }>(store: StoreName, value: T): Promise<void> {
    await tx(store, 'readwrite', (s) => s.put(value));
    notify();
  },
  async remove(store: StoreName, key: string): Promise<void> {
    await tx(store, 'readwrite', (s) => s.delete(key));
    notify();
  },
  async all<T>(store: StoreName): Promise<T[]> {
    return tx<T[]>(store, 'readonly', (s) => s.getAll());
  },
  async clear(store: StoreName): Promise<void> {
    await tx(store, 'readwrite', (s) => s.clear());
    notify();
  },
  async count(store: StoreName): Promise<number> {
    return tx<number>(store, 'readonly', (s) => s.count());
  },
  async exportAll(): Promise<Record<string, unknown[]>> {
    const out: Record<string, unknown[]> = {};
    for (const name of STORES) {
      out[name] = await tx<unknown[]>(name, 'readonly', (s) => s.getAll());
    }
    return out;
  },
  /** Import data. mode 'replace' clears each store first; 'merge' upserts by id/key. */
  async importAll(data: Record<string, unknown[]>, mode: 'replace' | 'merge'): Promise<void> {
    const database = await openDb();
    await new Promise<void>((resolve, reject) => {
      const t = database.transaction([...STORES] as string[], 'readwrite');
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      for (const name of STORES) {
        const rows = Array.isArray(data[name]) ? data[name] : [];
        const s = t.objectStore(name);
        if (mode === 'replace') s.clear();
        for (const row of rows as any[]) {
          try {
            if (mode === 'replace') s.add(row);
            else s.put(row);
          } catch {
            /* skip bad rows */
          }
        }
      }
    });
    notify();
  },
};
