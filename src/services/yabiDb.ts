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
import {idbStore, type IdbEmpresaSnapshot} from './indexedDbStore';
import {isSupabaseConfigured} from './supabaseClient';
import {
  commitSaleSupabase,
  createEmployeeSupabase,
  deleteBannerSupabase,
  deleteEmployeeSupabase,
  deleteProductSupabase,
  loadUserContextSupabase,
  receivePurchaseSupabase,
  saveBannerSupabase,
  saveCustomerSupabase,
  saveEmpresaConfigSupabase,
  saveProductSupabase,
  savePurchaseSupabase,
  saveSaleSupabase,
  saveSupplierSupabase,
  saveTicketSupabase,
  subscribeEmpresaRealtimeSupabase,
  subscribeEmpresasListSupabase,
  supabaseAuth,
  uploadImageToSupabaseStorage,
  type AuthSessionUser,
} from './supabaseDb';
import {
  DEMO_BANNERS,
  DEMO_CUSTOMERS,
  DEMO_EMAIL_LOGS,
  DEMO_EMPLOYEES,
  DEMO_EMPRESA,
  DEMO_PRODUCTS,
  DEMO_PURCHASES,
  DEMO_SALES,
  DEMO_SUPPLIERS,
  DEMO_TICKETS,
} from '../data/demoSeed';

export const activeBackend = 'supabase' as const;
export {isSupabaseConfigured};

const LOCAL_KEYS = {
  empresasList: 'yabi_v2_empresas_list',
  activeEmpresaId: 'yabi_v2_active_empresa_id',
  offlineQueue: 'yabi_v2_offline_queue',
  products: 'yabi_v2_products',
  customers: 'yabi_v2_customers',
  suppliers: 'yabi_v2_suppliers',
  purchases: 'yabi_v2_purchases',
  banners: 'yabi_v2_banners',
  employees: 'yabi_v2_employees',
  sales: 'yabi_v2_sales',
  tickets: 'yabi_v2_tickets',
  emails: 'yabi_v2_emails',
  wishlist: 'yabi_v2_wishlist',
  empresa: 'yabi_v2_empresa',
};

function scopedKey(
  collectionKey: keyof Omit<
    typeof LOCAL_KEYS,
    'empresasList' | 'activeEmpresaId' | 'offlineQueue'
  >,
  empresaId?: string
): string {
  const id = (empresaId || 'EMP001').trim() || 'EMP001';
  if (id === 'EMP001') {
    return LOCAL_KEYS[collectionKey];
  }
  return `yabi_v2_emp_${id}_${collectionKey}`;
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para conectar en la nube.'
    );
  }
}

export const yabiAuth = {
  subscribe: (cb: (user: AuthSessionUser | null) => void): (() => void) => {
    if (!isSupabaseConfigured) {
      cb(null);
      return () => {};
    }
    return supabaseAuth.subscribe(cb);
  },
  login: async (email: string, pass: string) => {
    assertSupabaseConfigured();
    return supabaseAuth.login(email, pass);
  },
  registerOwner: async (payload: {
    email: string;
    password: string;
    nombreDueno: string;
    nombreTienda: string;
    nit?: string;
    direccion?: string;
    ciudad?: string;
    telefono?: string;
    iva?: number;
  }) => {
    assertSupabaseConfigured();
    return supabaseAuth.registerOwner(payload);
  },
  registerSubscriber: async (payload: {
    email: string;
    password: string;
    nombreAdmin: string;
    nombreTienda: string;
    plan: NonNullable<EmpresaConfig['plan']>;
    nit?: string;
    direccion?: string;
    ciudad?: string;
    telefono?: string;
    iva?: number;
  }) => {
    assertSupabaseConfigured();
    return supabaseAuth.registerSubscriber(payload);
  },
  resendConfirmation: async (email: string) => {
    assertSupabaseConfigured();
    await supabaseAuth.resendConfirmation(email);
  },
  logout: async () => {
    if (!isSupabaseConfigured) return;
    await supabaseAuth.logout();
  },
  resetPassword: async (email: string) => {
    assertSupabaseConfigured();
    await supabaseAuth.resetPassword(email);
  },
};

export async function loadUserContext(uid: string): Promise<{
  profile: UserProfile | null;
  empresa: EmpresaConfig;
  setupWarning?: string;
}> {
  if (!isSupabaseConfigured) {
    return {profile: null, empresa: localStore.getEmpresa()};
  }
  try {
    return await loadUserContextSupabase(uid);
  } catch {
    return {profile: null, empresa: localStore.getEmpresa()};
  }
}

export interface LiveSyncCallbacks {
  onEmpresa: (empresa: EmpresaConfig) => void;
  onProducts: (products: Product[]) => void;
  onCustomers: (customers: Customer[]) => void;
  onSuppliers: (suppliers: Supplier[]) => void;
  onPurchases: (purchases: Purchase[]) => void;
  onBanners: (banners: StoreBanner[]) => void;
  onSales: (sales: Sale[]) => void;
  onEmployees: (employees: UserProfile[]) => void;
  onTickets: (tickets: SupportTicket[]) => void;
  onSyncStatus: (connected: boolean) => void;
}

export function subscribeEmpresasListCloud(
  isSuperAdmin: boolean,
  assignedEmpresaId: string,
  onEmpresas: (list: EmpresaConfig[]) => void
): () => void {
  if (!isSupabaseConfigured) {
    return () => {};
  }
  return subscribeEmpresasListSupabase(isSuperAdmin, assignedEmpresaId, onEmpresas);
}

export function subscribeEmpresaRealtime(
  empresaId: string,
  isSuperAdmin: boolean,
  callbacks: LiveSyncCallbacks
): () => void {
  if (!isSupabaseConfigured) {
    callbacks.onSyncStatus(false);
    return () => {};
  }
  return subscribeEmpresaRealtimeSupabase(empresaId, isSuperAdmin, callbacks);
}

export interface LocalEmpresaSnapshot {
  empresa: EmpresaConfig;
  productsCount: number;
  customersCount: number;
  salesCount: number;
  revenue: number;
}

export type OfflineQueueItem =
  | {id: string; empresaId: string; type: 'saveSaleCommit'; sale: Sale; updatedStocks: {id: string; stock: number}[]}
  | {id: string; empresaId: string; type: 'saveSale'; sale: Sale}
  | {id: string; empresaId: string; type: 'saveProduct'; product: Product}
  | {id: string; empresaId: string; type: 'deleteProduct'; productId: string}
  | {id: string; empresaId: string; type: 'saveCustomer'; customer: Customer}
  | {id: string; empresaId: string; type: 'saveSupplier'; supplier: Supplier}
  | {id: string; empresaId: string; type: 'savePurchase'; purchase: Purchase}
  | {id: string; empresaId: string; type: 'receivePurchase'; purchaseId: string; productId: string; newStock: number}
  | {id: string; empresaId: string; type: 'saveBanner'; banner: StoreBanner}
  | {id: string; empresaId: string; type: 'deleteBanner'; bannerId: string}
  | {id: string; empresaId: string; type: 'saveTicket'; ticket: SupportTicket}
  | {id: string; empresaId: string; type: 'saveEmpresa'; empresa: EmpresaConfig};

function defaultForEmpresa<T>(empId: string, emp001Fallback: T, emptyFallback: T): T {
  return empId === 'EMP001' ? emp001Fallback : emptyFallback;
}

export async function initOfflinePersistence(): Promise<void> {
  await idbStore.migrateFromLocalStorage();
}

export async function hydrateEmpresaFromIndexedDb(
  empresaId: string
): Promise<IdbEmpresaSnapshot | null> {
  return idbStore.getEmpresaSnapshot(empresaId);
}

export async function getOfflineQueueCountAsync(): Promise<number> {
  const idbCount = await idbStore.getOfflineQueueCount();
  const lsCount = localStore.getOfflineQueue().length;
  return Math.max(idbCount, lsCount);
}

export const localStore = {
  getActiveEmpresaId: (): string => {
    try {
      return localStorage.getItem(LOCAL_KEYS.activeEmpresaId) || 'EMP001';
    } catch {
      return 'EMP001';
    }
  },
  saveActiveEmpresaId: (empresaId: string) => {
    const id = empresaId || 'EMP001';
    try {
      localStorage.setItem(LOCAL_KEYS.activeEmpresaId, id);
    } catch {
      // ignore
    }
    void idbStore.putKv('active_empresa_id', id);
  },
  getEmpresas: (): EmpresaConfig[] => {
    const legacyMain = readLocal<EmpresaConfig>(LOCAL_KEYS.empresa, DEMO_EMPRESA);
    const list = readLocal<EmpresaConfig[]>(LOCAL_KEYS.empresasList, []);
    if (list.length === 0) {
      const initial = [{...legacyMain, id: legacyMain.id || 'EMP001'}];
      writeLocal(LOCAL_KEYS.empresasList, initial);
      return initial;
    }
    return list;
  },
  saveEmpresas: (list: EmpresaConfig[]) => {
    writeLocal(LOCAL_KEYS.empresasList, list);
    void idbStore.putKv('empresas_list', list);
    const emp001 = list.find((e) => e.id === 'EMP001');
    if (emp001) {
      writeLocal(LOCAL_KEYS.empresa, emp001);
      void idbStore.putCollection('EMP001', 'empresa', emp001);
    }
  },
  upsertEmpresa: (data: EmpresaConfig): EmpresaConfig[] => {
    const list = localStore.getEmpresas();
    const exists = list.some((e) => e.id === data.id);
    const next = exists ? list.map((e) => (e.id === data.id ? data : e)) : [...list, data];
    localStore.saveEmpresas(next);
    if (data.id === 'EMP001') {
      writeLocal(LOCAL_KEYS.empresa, data);
    } else {
      writeLocal(scopedKey('empresa', data.id), data);
    }
    void idbStore.putCollection(data.id, 'empresa', data);
    return next;
  },
  getEmpresa: (empresaId?: string): EmpresaConfig => {
    const id = empresaId || localStore.getActiveEmpresaId();
    const fromList = localStore.getEmpresas().find((e) => e.id === id);
    if (fromList) return fromList;
    return readLocal<EmpresaConfig>(
      scopedKey('empresa', id),
      id === 'EMP001' ? DEMO_EMPRESA : {...DEMO_EMPRESA, id, nombre: `Empresa ${id}`, iva: 0}
    );
  },
  saveEmpresa: (data: EmpresaConfig) => {
    localStore.upsertEmpresa(data);
  },
  getProducts: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<Product[]>(scopedKey('products', id), defaultForEmpresa(id, DEMO_PRODUCTS, []));
  },
  saveProducts: (data: Product[], empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    writeLocal(scopedKey('products', id), data);
    void idbStore.putCollection(id, 'products', data);
  },
  getCustomers: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<Customer[]>(scopedKey('customers', id), defaultForEmpresa(id, DEMO_CUSTOMERS, []));
  },
  saveCustomers: (data: Customer[], empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    writeLocal(scopedKey('customers', id), data);
    void idbStore.putCollection(id, 'customers', data);
  },
  getSuppliers: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<Supplier[]>(scopedKey('suppliers', id), defaultForEmpresa(id, DEMO_SUPPLIERS, []));
  },
  saveSuppliers: (data: Supplier[], empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    writeLocal(scopedKey('suppliers', id), data);
    void idbStore.putCollection(id, 'suppliers', data);
  },
  getPurchases: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<Purchase[]>(scopedKey('purchases', id), defaultForEmpresa(id, DEMO_PURCHASES, []));
  },
  savePurchases: (data: Purchase[], empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    writeLocal(scopedKey('purchases', id), data);
    void idbStore.putCollection(id, 'purchases', data);
  },
  getBanners: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<StoreBanner[]>(scopedKey('banners', id), defaultForEmpresa(id, DEMO_BANNERS, []));
  },
  saveBanners: (data: StoreBanner[], empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    writeLocal(scopedKey('banners', id), data);
    void idbStore.putCollection(id, 'banners', data);
  },
  getEmployees: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<UserProfile[]>(scopedKey('employees', id), defaultForEmpresa(id, DEMO_EMPLOYEES, []));
  },
  saveEmployees: (data: UserProfile[], empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    writeLocal(scopedKey('employees', id), data);
    void idbStore.putCollection(id, 'employees', data);
  },
  getSales: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<Sale[]>(scopedKey('sales', id), defaultForEmpresa(id, DEMO_SALES, []));
  },
  saveSales: (data: Sale[], empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    writeLocal(scopedKey('sales', id), data);
    void idbStore.putCollection(id, 'sales', data);
  },
  getTickets: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<SupportTicket[]>(scopedKey('tickets', id), defaultForEmpresa(id, DEMO_TICKETS, []));
  },
  saveTickets: (data: SupportTicket[], empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    writeLocal(scopedKey('tickets', id), data);
    void idbStore.putCollection(id, 'tickets', data);
  },
  getEmails: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<EmailLog[]>(scopedKey('emails', id), defaultForEmpresa(id, DEMO_EMAIL_LOGS, []));
  },
  saveEmails: (data: EmailLog[], empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    writeLocal(scopedKey('emails', id), data);
    void idbStore.putCollection(id, 'emails', data);
  },
  getWishlist: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<string[]>(scopedKey('wishlist', id), defaultForEmpresa(id, ['P001', 'P003'], []));
  },
  saveWishlist: (data: string[], empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    writeLocal(scopedKey('wishlist', id), data);
    void idbStore.putCollection(id, 'wishlist', data);
  },
  getOfflineQueue: (): OfflineQueueItem[] =>
    readLocal<OfflineQueueItem[]>(LOCAL_KEYS.offlineQueue, []),
  saveOfflineQueue: (items: OfflineQueueItem[]) =>
    writeLocal(LOCAL_KEYS.offlineQueue, items),
  enqueueOfflineOp: (item: OfflineQueueItem): OfflineQueueItem[] => {
    const current = localStore.getOfflineQueue();
    const next = [...current.filter((x) => x.id !== item.id), item];
    localStore.saveOfflineQueue(next);
    void idbStore.enqueueOfflineOp(item);
    return next;
  },
  seedEmpresaCollections: (
    targetEmpresa: EmpresaConfig,
    template?: {
      products: Product[];
      customers: Customer[];
      banners: StoreBanner[];
    }
  ) => {
    localStore.upsertEmpresa(targetEmpresa);
    const id = targetEmpresa.id;
    if (template) {
      localStore.saveProducts(
        template.products.map((p, idx) => ({
          ...p,
          id: `${id}-P${String(idx + 1).padStart(3, '0')}`,
        })),
        id
      );
      localStore.saveCustomers(
        template.customers.map((c, idx) => ({
          ...c,
          id: `${id}-C${String(idx + 1).padStart(3, '0')}`,
        })),
        id
      );
      localStore.saveBanners(
        template.banners.map((b, idx) => ({
          ...b,
          id: `${id}-B${String(idx + 1).padStart(3, '0')}`,
        })),
        id
      );
    } else {
      localStore.saveProducts([], id);
      localStore.saveCustomers([], id);
      localStore.saveBanners([], id);
    }
    localStore.saveSuppliers([], id);
    localStore.savePurchases([], id);
    localStore.saveEmployees([], id);
    localStore.saveSales([], id);
    localStore.saveTickets([], id);
    localStore.saveEmails([], id);
    localStore.saveWishlist([], id);
  },
  getEmpresaSnapshot: (emp: EmpresaConfig): LocalEmpresaSnapshot => {
    const prods = localStore.getProducts(emp.id);
    const custs = localStore.getCustomers(emp.id);
    const empSales = localStore.getSales(emp.id).filter((s) => s.estado !== 'Cancelada');
    return {
      empresa: emp,
      productsCount: prods.length,
      customersCount: custs.length,
      salesCount: empSales.length,
      revenue: empSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0),
    };
  },
  resetDemo: () => {
    localStore.saveActiveEmpresaId('EMP001');
    localStore.saveEmpresas([DEMO_EMPRESA]);
    localStore.saveOfflineQueue([]);
    void idbStore.clearOfflineQueue();
    writeLocal(LOCAL_KEYS.empresa, DEMO_EMPRESA);
    writeLocal(LOCAL_KEYS.products, DEMO_PRODUCTS);
    writeLocal(LOCAL_KEYS.customers, DEMO_CUSTOMERS);
    writeLocal(LOCAL_KEYS.suppliers, DEMO_SUPPLIERS);
    writeLocal(LOCAL_KEYS.purchases, DEMO_PURCHASES);
    writeLocal(LOCAL_KEYS.banners, DEMO_BANNERS);
    writeLocal(LOCAL_KEYS.employees, DEMO_EMPLOYEES);
    writeLocal(LOCAL_KEYS.sales, DEMO_SALES);
    writeLocal(LOCAL_KEYS.tickets, DEMO_TICKETS);
    writeLocal(LOCAL_KEYS.emails, DEMO_EMAIL_LOGS);
  },
};

export async function flushOfflineQueueCloud(): Promise<number> {
  if (!isSupabaseConfigured) return 0;

  const [idbQueue, lsQueue] = await Promise.all([
    idbStore.getOfflineQueue<OfflineQueueItem>(),
    Promise.resolve(localStore.getOfflineQueue()),
  ]);

  const mergedMap = new Map<string, OfflineQueueItem>();
  for (const op of idbQueue) mergedMap.set(op.id, op);
  for (const op of lsQueue) {
    if (!mergedMap.has(op.id)) mergedMap.set(op.id, op);
  }

  const queue = Array.from(mergedMap.values());
  if (queue.length === 0) return 0;

  let synced = 0;
  const remaining: OfflineQueueItem[] = [];

  for (const op of queue) {
    try {
      if (op.type === 'saveSaleCommit') {
        await commitSaleSupabase(op.empresaId, {...op.sale, pendingSync: false}, op.updatedStocks);
      } else if (op.type === 'saveSale') {
        await saveSaleSupabase(op.empresaId, {...op.sale, pendingSync: false});
      } else if (op.type === 'saveProduct') {
        await saveProductSupabase(op.empresaId, op.product);
      } else if (op.type === 'deleteProduct') {
        await deleteProductSupabase(op.empresaId, op.productId);
      } else if (op.type === 'saveCustomer') {
        await saveCustomerSupabase(op.empresaId, op.customer);
      } else if (op.type === 'saveSupplier') {
        await saveSupplierSupabase(op.empresaId, op.supplier);
      } else if (op.type === 'savePurchase') {
        await savePurchaseSupabase(op.empresaId, op.purchase);
      } else if (op.type === 'receivePurchase') {
        await receivePurchaseSupabase(op.empresaId, op.purchaseId, op.productId, op.newStock);
      } else if (op.type === 'saveBanner') {
        await saveBannerSupabase(op.empresaId, op.banner);
      } else if (op.type === 'deleteBanner') {
        await deleteBannerSupabase(op.empresaId, op.bannerId);
      } else if (op.type === 'saveTicket') {
        await saveTicketSupabase(op.ticket);
      } else if (op.type === 'saveEmpresa') {
        await saveEmpresaConfigSupabase(op.empresa);
      }
      await idbStore.removeOfflineOp(op.id);
      synced++;
    } catch {
      remaining.push(op);
    }
  }

  localStore.saveOfflineQueue(remaining);
  return synced;
}

export async function saveSaleCloud(empresaId: string, sale: Sale): Promise<void> {
  assertSupabaseConfigured();
  return saveSaleSupabase(empresaId, sale);
}

export async function saveTicketCloud(ticket: SupportTicket): Promise<void> {
  assertSupabaseConfigured();
  return saveTicketSupabase(ticket);
}

export async function saveEmpresaConfigCloud(empresa: EmpresaConfig): Promise<void> {
  assertSupabaseConfigured();
  return saveEmpresaConfigSupabase(empresa);
}

export async function cloneEmpresaStarterCloud(
  targetEmpresaId: string,
  template: {
    products: Product[];
    customers: Customer[];
    banners: StoreBanner[];
  }
): Promise<void> {
  assertSupabaseConfigured();
  const tasks: Promise<void>[] = [];
  template.products.forEach((p, idx) => {
    tasks.push(
      saveProductCloud(targetEmpresaId, {
        ...p,
        id: `${targetEmpresaId}-P${String(idx + 1).padStart(3, '0')}`,
      })
    );
  });
  template.customers.forEach((c, idx) => {
    tasks.push(
      saveCustomerCloud(targetEmpresaId, {
        ...c,
        id: `${targetEmpresaId}-C${String(idx + 1).padStart(3, '0')}`,
      })
    );
  });
  template.banners.forEach((b, idx) => {
    tasks.push(
      saveBannerCloud(targetEmpresaId, {
        ...b,
        id: `${targetEmpresaId}-B${String(idx + 1).padStart(3, '0')}`,
      })
    );
  });
  await Promise.all(tasks);
}

export async function saveProductCloud(empresaId: string, product: Product): Promise<void> {
  assertSupabaseConfigured();
  return saveProductSupabase(empresaId, product);
}

export async function deleteProductCloud(empresaId: string, productId: string): Promise<void> {
  assertSupabaseConfigured();
  return deleteProductSupabase(empresaId, productId);
}

export async function saveCustomerCloud(empresaId: string, customer: Customer): Promise<void> {
  assertSupabaseConfigured();
  return saveCustomerSupabase(empresaId, customer);
}

export async function saveSupplierCloud(empresaId: string, supplier: Supplier): Promise<void> {
  assertSupabaseConfigured();
  return saveSupplierSupabase(empresaId, supplier);
}

export async function savePurchaseCloud(empresaId: string, purchase: Purchase): Promise<void> {
  assertSupabaseConfigured();
  return savePurchaseSupabase(empresaId, purchase);
}

export async function receivePurchaseCloud(
  empresaId: string,
  purchaseId: string,
  productId: string,
  newStock: number
): Promise<void> {
  assertSupabaseConfigured();
  return receivePurchaseSupabase(empresaId, purchaseId, productId, newStock);
}

export async function saveBannerCloud(empresaId: string, banner: StoreBanner): Promise<void> {
  assertSupabaseConfigured();
  return saveBannerSupabase(empresaId, banner);
}

export async function deleteBannerCloud(empresaId: string, bannerId: string): Promise<void> {
  assertSupabaseConfigured();
  return deleteBannerSupabase(empresaId, bannerId);
}

export async function commitSaleCloud(
  empresaId: string,
  sale: Sale,
  updatedStocks: {id: string; stock: number}[]
): Promise<void> {
  assertSupabaseConfigured();
  return commitSaleSupabase(empresaId, sale, updatedStocks);
}

export async function createEmployeeCloud(payload: {
  email: string;
  pass: string;
  nombre: string;
  rol: 'admin' | 'vendedor' | 'bodega';
  empresaId: string;
}): Promise<string> {
  assertSupabaseConfigured();
  return createEmployeeSupabase(payload);
}

export async function deleteEmployeeCloud(uid: string): Promise<void> {
  assertSupabaseConfigured();
  return deleteEmployeeSupabase(uid);
}

export function uploadImageToStorage(
  empresaId: string,
  folder: 'productos' | 'banners',
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  assertSupabaseConfigured();
  return uploadImageToSupabaseStorage(empresaId, folder, file, onProgress);
}
