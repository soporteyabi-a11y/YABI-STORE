import * as SQLite from 'expo-sqlite';
import type {
  RnBanner,
  RnCustomer,
  RnEmpresa,
  RnOfflineSnapshot,
  RnProduct,
  RnPurchase,
  RnSale,
  RnSupplier,
  RnTicket,
} from './yabiDb';

export type RnOfflineOpType =
  | 'commitSale'
  | 'updateSale'
  | 'saveProduct'
  | 'updateStock'
  | 'savePurchase'
  | 'receivePurchase'
  | 'saveCustomer'
  | 'saveSupplier'
  | 'saveBanner'
  | 'deleteBanner'
  | 'saveTicket'
  | 'saveEmpresa';

export interface RnOfflineQueueItem {
  id: string;
  empresaId: string;
  opType: RnOfflineOpType;
  payload: unknown;
  createdAt: number;
}

const DB_NAME = 'yabi_store_offline_v1.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS empresas_cache (
        id TEXT PRIMARY KEY NOT NULL,
        nombre TEXT NOT NULL,
        nit TEXT,
        direccion TEXT,
        ciudad TEXT,
        telefono TEXT,
        iva REAL NOT NULL DEFAULT 0,
        plan TEXT,
        color TEXT,
        activa INTEGER NOT NULL DEFAULT 1,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS productos_cache (
        empresa_id TEXT NOT NULL,
        id TEXT NOT NULL,
        nombre TEXT NOT NULL,
        sku TEXT NOT NULL,
        cat TEXT NOT NULL,
        precio REAL NOT NULL DEFAULT 0,
        costo REAL NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER NOT NULL DEFAULT 5,
        proveedor TEXT,
        img TEXT,
        estado TEXT NOT NULL DEFAULT 'Activo',
        PRIMARY KEY (empresa_id, id)
      );
      CREATE TABLE IF NOT EXISTS ventas_cache (
        empresa_id TEXT NOT NULL,
        id TEXT NOT NULL,
        orden TEXT NOT NULL,
        cliente TEXT NOT NULL,
        producto_id TEXT NOT NULL,
        producto TEXT NOT NULL,
        precio REAL NOT NULL DEFAULT 0,
        qty INTEGER NOT NULL DEFAULT 1,
        descuento REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        pago TEXT NOT NULL,
        fecha TEXT NOT NULL,
        hora TEXT,
        estado TEXT NOT NULL,
        transportadora TEXT,
        guia TEXT,
        notas TEXT,
        origen TEXT,
        pending_sync INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (empresa_id, id)
      );
      CREATE TABLE IF NOT EXISTS collections_json_cache (
        empresa_id TEXT NOT NULL,
        collection_name TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (empresa_id, collection_name)
      );
      CREATE TABLE IF NOT EXISTS offline_ops_queue (
        id TEXT PRIMARY KEY NOT NULL,
        empresa_id TEXT NOT NULL,
        op_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_offline_ops_created ON offline_ops_queue(created_at ASC);
      CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas_cache(empresa_id, fecha DESC);
    `);
    dbInstance = db;
    return db;
  })();

  return initPromise;
}

async function saveJsonCollection(
  db: SQLite.SQLiteDatabase,
  empresaId: string,
  collectionName: string,
  payload: unknown
): Promise<void> {
  await db.runAsync(
    `INSERT INTO collections_json_cache (empresa_id, collection_name, payload_json, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(empresa_id, collection_name) DO UPDATE SET
       payload_json = excluded.payload_json,
       updated_at = excluded.updated_at;`,
    [empresaId, collectionName, JSON.stringify(payload), Date.now()]
  );
}

async function loadJsonCollection<T>(
  db: SQLite.SQLiteDatabase,
  empresaId: string,
  collectionName: string
): Promise<T[] | undefined> {
  const row = await db.getFirstAsync<{payload_json: string}>(
    'SELECT payload_json FROM collections_json_cache WHERE empresa_id = ? AND collection_name = ?;',
    [empresaId, collectionName]
  );
  if (!row) return undefined;
  try {
    return JSON.parse(row.payload_json) as T[];
  } catch {
    return undefined;
  }
}

export const sqliteStore = {
  async loadEmpresaSnapshot(empresaId: string): Promise<RnOfflineSnapshot | null> {
    try {
      const db = await getDb();

      const empRow = await db.getFirstAsync<{
        id: string;
        nombre: string;
        nit: string | null;
        direccion: string | null;
        ciudad: string | null;
        telefono: string | null;
        iva: number;
        plan: string | null;
        color: string | null;
        activa: number;
      }>('SELECT * FROM empresas_cache WHERE id = ?;', [empresaId]);

      const prodRows = await db.getAllAsync<{
        id: string;
        nombre: string;
        sku: string;
        cat: string;
        precio: number;
        costo: number;
        stock: number;
        min_stock: number;
        proveedor: string | null;
        img: string | null;
        estado: string;
      }>('SELECT * FROM productos_cache WHERE empresa_id = ?;', [empresaId]);

      const saleRows = await db.getAllAsync<{
        id: string;
        orden: string;
        cliente: string;
        producto_id: string;
        producto: string;
        precio: number;
        qty: number;
        descuento: number;
        total: number;
        pago: string;
        fecha: string;
        hora: string | null;
        estado: string;
        transportadora: string | null;
        guia: string | null;
        notas: string | null;
        origen: string | null;
        pending_sync: number;
      }>('SELECT * FROM ventas_cache WHERE empresa_id = ? ORDER BY fecha DESC, hora DESC;', [
        empresaId,
      ]);

      const [purchases, customers, suppliers, banners, tickets] = await Promise.all([
        loadJsonCollection<RnPurchase>(db, empresaId, 'purchases'),
        loadJsonCollection<RnCustomer>(db, empresaId, 'customers'),
        loadJsonCollection<RnSupplier>(db, empresaId, 'suppliers'),
        loadJsonCollection<RnBanner>(db, empresaId, 'banners'),
        loadJsonCollection<RnTicket>(db, empresaId, 'tickets'),
      ]);

      const empresa: RnEmpresa | undefined = empRow
        ? {
            id: empRow.id,
            nombre: empRow.nombre,
            nit: empRow.nit || undefined,
            direccion: empRow.direccion || undefined,
            ciudad: empRow.ciudad || undefined,
            telefono: empRow.telefono || undefined,
            iva: Number(empRow.iva ?? 0),
            plan: (empRow.plan as RnEmpresa['plan']) || 'Pro',
            color: empRow.color || '#00C8FF',
            activa: empRow.activa !== 0,
          }
        : undefined;

      const products: RnProduct[] | undefined =
        prodRows.length > 0
          ? prodRows.map((p) => ({
              id: p.id,
              nombre: p.nombre,
              sku: p.sku,
              cat: p.cat,
              precio: Number(p.precio),
              costo: Number(p.costo),
              stock: Number(p.stock),
              minStock: Number(p.min_stock),
              proveedor: p.proveedor || undefined,
              img: p.img || undefined,
              estado: (p.estado as RnProduct['estado']) || 'Activo',
            }))
          : undefined;

      const sales: RnSale[] | undefined =
        saleRows.length > 0
          ? saleRows.map((s) => ({
              id: s.id,
              orden: s.orden,
              cliente: s.cliente,
              productoId: s.producto_id,
              producto: s.producto,
              precio: Number(s.precio),
              qty: Number(s.qty),
              desc: Number(s.descuento),
              total: Number(s.total),
              pago: s.pago as RnSale['pago'],
              fecha: s.fecha,
              hora: s.hora || undefined,
              estado: (s.estado as RnSale['estado']) || 'Pagada',
              transportadora: s.transportadora || undefined,
              guia: s.guia || undefined,
              notas: s.notas || undefined,
              origen: (s.origen as RnSale['origen']) || 'POS',
              pendingSync: s.pending_sync === 1,
            }))
          : undefined;

      return {
        empresa,
        products,
        sales,
        purchases,
        customers,
        suppliers,
        banners,
        tickets,
      };
    } catch {
      return null;
    }
  },

  async saveEmpresaSnapshot(empresaId: string, patch: RnOfflineSnapshot): Promise<void> {
    try {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        if (patch.empresa) {
          const e = patch.empresa;
          await db.runAsync(
            `INSERT INTO empresas_cache (id, nombre, nit, direccion, ciudad, telefono, iva, plan, color, activa, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               nombre = excluded.nombre,
               nit = excluded.nit,
               direccion = excluded.direccion,
               ciudad = excluded.ciudad,
               telefono = excluded.telefono,
               iva = excluded.iva,
               plan = excluded.plan,
               color = excluded.color,
               activa = excluded.activa,
               updated_at = excluded.updated_at;`,
            [
              e.id,
              e.nombre,
              e.nit || null,
              e.direccion || null,
              e.ciudad || null,
              e.telefono || null,
              Number(e.iva ?? 0),
              e.plan || 'Pro',
              e.color || '#00C8FF',
              e.activa === false ? 0 : 1,
              Date.now(),
            ]
          );
        }

        if (patch.products) {
          await db.runAsync('DELETE FROM productos_cache WHERE empresa_id = ?;', [empresaId]);
          for (const p of patch.products) {
            await db.runAsync(
              `INSERT INTO productos_cache
               (empresa_id, id, nombre, sku, cat, precio, costo, stock, min_stock, proveedor, img, estado)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [
                empresaId,
                p.id,
                p.nombre,
                p.sku,
                p.cat,
                p.precio,
                p.costo,
                p.stock,
                p.minStock,
                p.proveedor || null,
                p.img || null,
                p.estado,
              ]
            );
          }
        }

        if (patch.sales) {
          // Preserve locally queued pending_sync sales until cloud confirms them
          const cloudIds = new Set(patch.sales.map((s) => s.id));
          await db.runAsync(
            'DELETE FROM ventas_cache WHERE empresa_id = ? AND pending_sync = 0;',
            [empresaId]
          );
          for (const s of patch.sales) {
            await db.runAsync(
              `INSERT INTO ventas_cache
               (empresa_id, id, orden, cliente, producto_id, producto, precio, qty, descuento, total, pago, fecha, hora, estado, transportadora, guia, notas, origen, pending_sync)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(empresa_id, id) DO UPDATE SET
                 orden = excluded.orden,
                 cliente = excluded.cliente,
                 estado = excluded.estado,
                 transportadora = excluded.transportadora,
                 guia = excluded.guia,
                 notas = excluded.notas,
                 pending_sync = 0;`,
              [
                empresaId,
                s.id,
                s.orden,
                s.cliente,
                s.productoId,
                s.producto,
                s.precio,
                s.qty,
                s.desc,
                s.total,
                s.pago,
                s.fecha,
                s.hora || null,
                s.estado,
                s.transportadora || null,
                s.guia || null,
                s.notas || null,
                s.origen || 'POS',
                s.pendingSync ? 1 : 0,
              ]
            );
          }
          // Clean up any pending_sync row whose ID already landed in cloud snapshot
          for (const id of cloudIds) {
            await db.runAsync(
              'UPDATE ventas_cache SET pending_sync = 0 WHERE empresa_id = ? AND id = ?;',
              [empresaId, id]
            );
          }
        }

        if (patch.purchases) await saveJsonCollection(db, empresaId, 'purchases', patch.purchases);
        if (patch.customers) await saveJsonCollection(db, empresaId, 'customers', patch.customers);
        if (patch.suppliers) await saveJsonCollection(db, empresaId, 'suppliers', patch.suppliers);
        if (patch.banners) await saveJsonCollection(db, empresaId, 'banners', patch.banners);
        if (patch.tickets) await saveJsonCollection(db, empresaId, 'tickets', patch.tickets);
      });
    } catch {
      // ignore transient SQLite write failures
    }
  },

  async recordOfflineSaleLocal(
    empresaId: string,
    sale: RnSale,
    stockUpdates: {id: string; stock: number}[]
  ): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT OR REPLACE INTO ventas_cache
         (empresa_id, id, orden, cliente, producto_id, producto, precio, qty, descuento, total, pago, fecha, hora, estado, transportadora, guia, notas, origen, pending_sync)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);`,
        [
          empresaId,
          sale.id,
          sale.orden,
          sale.cliente,
          sale.productoId,
          sale.producto,
          sale.precio,
          sale.qty,
          sale.desc,
          sale.total,
          sale.pago,
          sale.fecha,
          sale.hora || null,
          sale.estado,
          sale.transportadora || null,
          sale.guia || null,
          sale.notas || null,
          sale.origen || 'POS',
        ]
      );

      for (const upd of stockUpdates) {
        await db.runAsync(
          'UPDATE productos_cache SET stock = ? WHERE empresa_id = ? AND id = ?;',
          [Math.max(0, upd.stock), empresaId, upd.id]
        );
      }

      const opId = `OP-${sale.id}`;
      await db.runAsync(
        `INSERT OR REPLACE INTO offline_ops_queue (id, empresa_id, op_type, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?);`,
        [opId, empresaId, 'commitSale', JSON.stringify({sale: {...sale, pendingSync: true}, stockUpdates}), Date.now()]
      );
    });
  },

  async enqueueOp(
    empresaId: string,
    opType: RnOfflineOpType,
    payload: unknown,
    customId?: string
  ): Promise<number> {
    const db = await getDb();
    const id = customId || `OP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    await db.runAsync(
      `INSERT OR REPLACE INTO offline_ops_queue (id, empresa_id, op_type, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?);`,
      [id, empresaId, opType, JSON.stringify(payload), Date.now()]
    );
    return sqliteStore.getQueueCount();
  },

  async getQueuedOps(): Promise<RnOfflineQueueItem[]> {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<{
        id: string;
        empresa_id: string;
        op_type: RnOfflineOpType;
        payload_json: string;
        created_at: number;
      }>('SELECT * FROM offline_ops_queue ORDER BY created_at ASC;');
      return rows.map((r) => ({
        id: r.id,
        empresaId: r.empresa_id,
        opType: r.op_type,
        payload: JSON.parse(r.payload_json) as unknown,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  },

  async getQueueCount(): Promise<number> {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{cnt: number}>(
        'SELECT COUNT(*) AS cnt FROM offline_ops_queue;'
      );
      return Number(row?.cnt || 0);
    } catch {
      return 0;
    }
  },

  async markOpSynced(id: string, empresaId: string, saleId?: string): Promise<void> {
    try {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM offline_ops_queue WHERE id = ?;', [id]);
        if (saleId) {
          await db.runAsync(
            'UPDATE ventas_cache SET pending_sync = 0 WHERE empresa_id = ? AND id = ?;',
            [empresaId, saleId]
          );
        }
      });
    } catch {
      // ignore
    }
  },
};
