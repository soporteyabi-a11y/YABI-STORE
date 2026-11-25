import type {
  Customer,
  EmailLog,
  EmpresaConfig,
  Product,
  Purchase,
  Sale,
  StoreBanner,
  Supplier,
  SupportTicket,
  UserProfile,
} from '../types/yabi';

export type IdbCollectionKey =
  | 'empresa'
  | 'products'
  | 'customers'
  | 'suppliers'
  | 'purchases'
  | 'banners'
  | 'employees'
  | 'sales'
  | 'tickets'
  | 'emails'
  | 'wishlist';

export interface IdbEmpresaSnapshot {
  empresa?: EmpresaConfig;
  products?: Product[];
  customers?: Customer[];
  suppliers?: Supplier[];
  purchases?: Purchase[];
  banners?: StoreBanner[];
  employees?: UserProfile[];
  sales?: Sale[];
  tickets?: SupportTicket[];
  emails?: EmailLog[];
  wishlist?: string[];
}

export interface IdbQueuedRecord<T = unknown> {
  id: string;
  empresaId: string;
  createdAt: number;
  op: T;
}

const DB_NAME = 'yabi_store_idb_v1';
const DB_VERSION = 1;
const STORE_KV = 'kv';
const STORE_COLLECTIONS = 'collections';
const STORE_OFFLINE_OPS = 'offline_ops';

let dbPromise: Promise<IDBDatabase | null> | null = null;
let migrationPromise: Promise<void> | null = null;

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase | null> {
  if (!isIndexedDbAvailable()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_KV)) {
          db.createObjectStore(STORE_KV, {keyPath: 'key'});
        }
        if (!db.objectStoreNames.contains(STORE_COLLECTIONS)) {
          const store = db.createObjectStore(STORE_COLLECTIONS, {keyPath: 'id'});
          store.createIndex('by_empresa', 'empresaId', {unique: false});
        }
        if (!db.objectStoreNames.contains(STORE_OFFLINE_OPS)) {
          const ops = db.createObjectStore(STORE_OFFLINE_OPS, {keyPath: 'id'});
          ops.createIndex('by_created', 'createdAt', {unique: false});
          ops.createIndex('by_empresa', 'empresaId', {unique: false});
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const idbStore = {
  async putKv<T>(key: string, value: T): Promise<void> {
    const db = await openDb();
    if (!db) return;
    try {
      const tx = db.transaction(STORE_KV, 'readwrite');
      tx.objectStore(STORE_KV).put({key, value, updatedAt: Date.now()});
      await txDone(tx);
    } catch {
      // ignore transient IndexedDB write failures
    }
  },

  async getKv<T>(key: string): Promise<T | null> {
    const db = await openDb();
    if (!db) return null;
    try {
      const tx = db.transaction(STORE_KV, 'readonly');
      const rec = await requestToPromise<{key: string; value: T} | undefined>(
        tx.objectStore(STORE_KV).get(key)
      );
      return rec ? rec.value : null;
    } catch {
      return null;
    }
  },

  async putCollection<T>(
    empresaId: string,
    collection: IdbCollectionKey,
    data: T
  ): Promise<void> {
    const db = await openDb();
    if (!db) return;
    const empId = (empresaId || 'EMP001').trim() || 'EMP001';
    try {
      const tx = db.transaction(STORE_COLLECTIONS, 'readwrite');
      tx.objectStore(STORE_COLLECTIONS).put({
        id: `${empId}:${collection}`,
        empresaId: empId,
        collection,
        data,
        updatedAt: Date.now(),
      });
      await txDone(tx);
    } catch {
      // ignore transient IndexedDB write failures
    }
  },

  async getCollection<T>(empresaId: string, collection: IdbCollectionKey): Promise<T | null> {
    const db = await openDb();
    if (!db) return null;
    const empId = (empresaId || 'EMP001').trim() || 'EMP001';
    try {
      const tx = db.transaction(STORE_COLLECTIONS, 'readonly');
      const rec = await requestToPromise<{data: T} | undefined>(
        tx.objectStore(STORE_COLLECTIONS).get(`${empId}:${collection}`)
      );
      return rec ? rec.data : null;
    } catch {
      return null;
    }
  },

  async getEmpresaSnapshot(empresaId: string): Promise<IdbEmpresaSnapshot | null> {
    const db = await openDb();
    if (!db) return null;
    const empId = (empresaId || 'EMP001').trim() || 'EMP001';
    try {
      const tx = db.transaction(STORE_COLLECTIONS, 'readonly');
      const index = tx.objectStore(STORE_COLLECTIONS).index('by_empresa');
      const records = await requestToPromise<
        {collection: IdbCollectionKey; data: unknown}[]
      >(index.getAll(IDBKeyRange.only(empId)));

      if (!records || records.length === 0) return null;
      const snapshot: Record<string, unknown> = {};
      for (const rec of records) {
        snapshot[rec.collection] = rec.data;
      }
      return snapshot as IdbEmpresaSnapshot;
    } catch {
      return null;
    }
  },

  async enqueueOfflineOp<T extends {id: string; empresaId: string}>(op: T): Promise<number> {
    const db = await openDb();
    if (!db) return 0;
    try {
      const tx = db.transaction(STORE_OFFLINE_OPS, 'readwrite');
      const store = tx.objectStore(STORE_OFFLINE_OPS);
      store.put({
        id: op.id,
        empresaId: op.empresaId,
        createdAt: Date.now(),
        op,
      } satisfies IdbQueuedRecord<T>);
      await txDone(tx);
      return await idbStore.getOfflineQueueCount();
    } catch {
      return 0;
    }
  },

  async getOfflineQueue<T = unknown>(): Promise<T[]> {
    const db = await openDb();
    if (!db) return [];
    try {
      const tx = db.transaction(STORE_OFFLINE_OPS, 'readonly');
      const index = tx.objectStore(STORE_OFFLINE_OPS).index('by_created');
      const rows = await requestToPromise<IdbQueuedRecord<T>[]>(index.getAll());
      return (rows || []).map((r) => r.op);
    } catch {
      return [];
    }
  },

  async getOfflineQueueCount(): Promise<number> {
    const db = await openDb();
    if (!db) return 0;
    try {
      const tx = db.transaction(STORE_OFFLINE_OPS, 'readonly');
      return await requestToPromise<number>(tx.objectStore(STORE_OFFLINE_OPS).count());
    } catch {
      return 0;
    }
  },

  async removeOfflineOp(id: string): Promise<void> {
    const db = await openDb();
    if (!db) return;
    try {
      const tx = db.transaction(STORE_OFFLINE_OPS, 'readwrite');
      tx.objectStore(STORE_OFFLINE_OPS).delete(id);
      await txDone(tx);
    } catch {
      // ignore
    }
  },

  async clearOfflineQueue(): Promise<void> {
    const db = await openDb();
    if (!db) return;
    try {
      const tx = db.transaction(STORE_OFFLINE_OPS, 'readwrite');
      tx.objectStore(STORE_OFFLINE_OPS).clear();
      await txDone(tx);
    } catch {
      // ignore
    }
  },

  migrateFromLocalStorage(): Promise<void> {
    if (migrationPromise) return migrationPromise;
    migrationPromise = (async () => {
      const db = await openDb();
      if (!db || typeof localStorage === 'undefined') return;
      try {
        const alreadyMigrated = await idbStore.getKv<boolean>('migrated_ls_v1');
        if (alreadyMigrated) return;

        const empresasRaw = localStorage.getItem('yabi_v2_empresas_list');
        if (empresasRaw) {
          const empresas = JSON.parse(empresasRaw) as EmpresaConfig[];
          await idbStore.putKv('empresas_list', empresas);
          for (const emp of empresas) {
            await idbStore.putCollection(emp.id, 'empresa', emp);
          }
        }

        const activeEmp = localStorage.getItem('yabi_v2_active_empresa_id') || 'EMP001';
        await idbStore.putKv('active_empresa_id', activeEmp);

        const queueRaw = localStorage.getItem('yabi_v2_offline_queue');
        if (queueRaw) {
          const ops = JSON.parse(queueRaw) as {id: string; empresaId: string}[];
          for (const op of ops) {
            await idbStore.enqueueOfflineOp(op);
          }
        }

        const collections: {lsSuffix: string; col: IdbCollectionKey}[] = [
          {lsSuffix: 'products', col: 'products'},
          {lsSuffix: 'customers', col: 'customers'},
          {lsSuffix: 'suppliers', col: 'suppliers'},
          {lsSuffix: 'purchases', col: 'purchases'},
          {lsSuffix: 'banners', col: 'banners'},
          {lsSuffix: 'employees', col: 'employees'},
          {lsSuffix: 'sales', col: 'sales'},
          {lsSuffix: 'tickets', col: 'tickets'},
          {lsSuffix: 'emails', col: 'emails'},
          {lsSuffix: 'wishlist', col: 'wishlist'},
        ];

        for (const item of collections) {
          const raw = localStorage.getItem(`yabi_v2_${item.lsSuffix}`);
          if (raw) {
            await idbStore.putCollection('EMP001', item.col, JSON.parse(raw));
          }
        }

        await idbStore.putKv('migrated_ls_v1', true);
      } catch {
        // ignore migration issues cleanly
      }
    })();
    return migrationPromise;
  },
};
