import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  setDoc,
  deleteDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {httpsCallable} from 'firebase/functions';
import {getDownloadURL, ref, uploadBytesResumable} from 'firebase/storage';
import {auth, db, functions, storage} from './firebase';
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

export const activeBackend: 'supabase' | 'firebase' = isSupabaseConfigured ? 'supabase' : 'firebase';

const LOCAL_KEYS = {
  empresasList: 'yabi_v2_empresas_list',
  activeEmpresaId: 'yabi_v2_active_empresa_id',
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
  collectionKey: keyof Omit<typeof LOCAL_KEYS, 'empresasList' | 'activeEmpresaId'>,
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

export const yabiAuth = {
  subscribe: (cb: (user: AuthSessionUser | User | null) => void) =>
    isSupabaseConfigured ? supabaseAuth.subscribe(cb) : onAuthStateChanged(auth, cb),
  login: (email: string, pass: string) =>
    isSupabaseConfigured
      ? supabaseAuth.login(email, pass)
      : signInWithEmailAndPassword(auth, email.trim(), pass),
  logout: () => (isSupabaseConfigured ? supabaseAuth.logout() : signOut(auth)),
  resetPassword: (email: string) =>
    isSupabaseConfigured
      ? supabaseAuth.resetPassword(email)
      : sendPasswordResetEmail(auth, email.trim()),
};

export async function loadUserContext(uid: string): Promise<{
  profile: UserProfile | null;
  empresa: EmpresaConfig;
}> {
  if (isSupabaseConfigured) {
    try {
      return await loadUserContextSupabase(uid);
    } catch {
      return {profile: null, empresa: DEMO_EMPRESA};
    }
  }
  try {
    const userSnap = await getDoc(doc(db, 'usuarios', uid));
    const profile = userSnap.exists() ? ({uid, ...userSnap.data()} as UserProfile) : null;
    const empresaId =
      profile?.empresaId && profile.empresaId !== '__super__' && profile.empresaId !== '__default__'
        ? profile.empresaId
        : 'EMP001';
    const empSnap = await getDoc(doc(db, 'empresas', empresaId));
    const empresa: EmpresaConfig = empSnap.exists()
      ? ({id: empSnap.id, ...empSnap.data()} as EmpresaConfig)
      : {...DEMO_EMPRESA, id: empresaId};
    return {profile, empresa};
  } catch {
    return {profile: null, empresa: DEMO_EMPRESA};
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
  if (isSupabaseConfigured) {
    return subscribeEmpresasListSupabase(isSuperAdmin, assignedEmpresaId, onEmpresas);
  }
  if (isSuperAdmin) {
    return onSnapshot(
      collection(db, 'empresas'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({id: d.id, ...d.data()}) as EmpresaConfig)
          .sort((a, b) => a.id.localeCompare(b.id));
        onEmpresas(list);
      },
      () => {
        // ignore restricted reads
      }
    );
  }
  return onSnapshot(
    doc(db, 'empresas', assignedEmpresaId),
    (snap) => {
      if (snap.exists()) {
        onEmpresas([{id: snap.id, ...snap.data()} as EmpresaConfig]);
      }
    },
    () => {
      // ignore restricted reads
    }
  );
}

export function subscribeEmpresaRealtime(
  empresaId: string,
  isSuperAdmin: boolean,
  callbacks: LiveSyncCallbacks
): () => void {
  if (isSupabaseConfigured) {
    return subscribeEmpresaRealtimeSupabase(empresaId, isSuperAdmin, callbacks);
  }

  const unsubs: Unsubscribe[] = [];

  const handleErr = () => {
    callbacks.onSyncStatus(false);
  };

  unsubs.push(
    onSnapshot(
      doc(db, 'empresas', empresaId),
      (snap) => {
        if (snap.exists()) {
          callbacks.onEmpresa({id: snap.id, ...snap.data()} as EmpresaConfig);
        }
        callbacks.onSyncStatus(true);
      },
      handleErr
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'empresas', empresaId, 'productos'),
      (snap) => {
        callbacks.onProducts(snap.docs.map((d) => ({id: d.id, ...d.data()}) as Product));
        callbacks.onSyncStatus(true);
      },
      handleErr
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'empresas', empresaId, 'clientes'),
      (snap) => {
        callbacks.onCustomers(snap.docs.map((d) => ({id: d.id, ...d.data()}) as Customer));
      },
      handleErr
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'empresas', empresaId, 'proveedores'),
      (snap) => {
        callbacks.onSuppliers(snap.docs.map((d) => ({id: d.id, ...d.data()}) as Supplier));
      },
      handleErr
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'empresas', empresaId, 'compras'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({id: d.id, ...d.data()}) as Purchase)
          .sort((a, b) => b.fecha.localeCompare(a.fecha));
        callbacks.onPurchases(list);
      },
      handleErr
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'empresas', empresaId, 'banners'),
      (snap) => {
        callbacks.onBanners(snap.docs.map((d) => ({id: d.id, ...d.data()}) as StoreBanner));
      },
      handleErr
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'empresas', empresaId, 'ventas'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({id: d.id, ...d.data()}) as Sale)
          .sort((a, b) => (b.fecha + (b.hora || '')).localeCompare(a.fecha + (a.hora || '')));
        callbacks.onSales(list);
      },
      handleErr
    )
  );

  const ticketsQ = isSuperAdmin
    ? collection(db, 'soporte')
    : query(collection(db, 'soporte'), where('empresaId', '==', empresaId));

  unsubs.push(
    onSnapshot(
      ticketsQ,
      (snap) => {
        const list = snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          const fechaObj = raw.fecha as {seconds?: number} | string | undefined;
          const fechaStr =
            typeof fechaObj === 'string'
              ? fechaObj
              : fechaObj && typeof fechaObj === 'object' && typeof fechaObj.seconds === 'number'
              ? new Date(fechaObj.seconds * 1000).toISOString().slice(0, 10)
              : new Date().toISOString().slice(0, 10);
          return {
            id: d.id,
            empresaId: String(raw.empresaId || empresaId),
            asunto: String(raw.asunto || 'Soporte'),
            mensaje: String(raw.mensaje || ''),
            prioridad: (raw.prioridad as SupportTicket['prioridad']) || 'Media',
            estado: (raw.estado as SupportTicket['estado']) || 'Abierto',
            fecha: fechaStr,
            creadoPor: raw.creadoPor ? String(raw.creadoPor) : undefined,
            respuesta: raw.respuesta ? String(raw.respuesta) : undefined,
          };
        });
        callbacks.onTickets(list);
      },
      () => {
        // ignore if restricted
      }
    )
  );

  const usersQ = isSuperAdmin
    ? collection(db, 'usuarios')
    : query(collection(db, 'usuarios'), where('empresaId', '==', empresaId));

  unsubs.push(
    onSnapshot(
      usersQ,
      (snap) => {
        callbacks.onEmployees(
          snap.docs.map((d) => ({id: d.id, uid: d.id, ...d.data()}) as UserProfile)
        );
      },
      () => {
        // Non-admin roles may have restricted user listing in rules
      }
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}

export interface LocalEmpresaSnapshot {
  empresa: EmpresaConfig;
  productsCount: number;
  customersCount: number;
  salesCount: number;
  revenue: number;
}

function defaultForEmpresa<T>(empId: string, emp001Fallback: T, emptyFallback: T): T {
  return empId === 'EMP001' ? emp001Fallback : emptyFallback;
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
    try {
      localStorage.setItem(LOCAL_KEYS.activeEmpresaId, empresaId || 'EMP001');
    } catch {
      // ignore
    }
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
    const emp001 = list.find((e) => e.id === 'EMP001');
    if (emp001) {
      writeLocal(LOCAL_KEYS.empresa, emp001);
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
  saveProducts: (data: Product[], empresaId?: string) =>
    writeLocal(scopedKey('products', empresaId || localStore.getActiveEmpresaId()), data),
  getCustomers: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<Customer[]>(scopedKey('customers', id), defaultForEmpresa(id, DEMO_CUSTOMERS, []));
  },
  saveCustomers: (data: Customer[], empresaId?: string) =>
    writeLocal(scopedKey('customers', empresaId || localStore.getActiveEmpresaId()), data),
  getSuppliers: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<Supplier[]>(scopedKey('suppliers', id), defaultForEmpresa(id, DEMO_SUPPLIERS, []));
  },
  saveSuppliers: (data: Supplier[], empresaId?: string) =>
    writeLocal(scopedKey('suppliers', empresaId || localStore.getActiveEmpresaId()), data),
  getPurchases: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<Purchase[]>(scopedKey('purchases', id), defaultForEmpresa(id, DEMO_PURCHASES, []));
  },
  savePurchases: (data: Purchase[], empresaId?: string) =>
    writeLocal(scopedKey('purchases', empresaId || localStore.getActiveEmpresaId()), data),
  getBanners: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<StoreBanner[]>(scopedKey('banners', id), defaultForEmpresa(id, DEMO_BANNERS, []));
  },
  saveBanners: (data: StoreBanner[], empresaId?: string) =>
    writeLocal(scopedKey('banners', empresaId || localStore.getActiveEmpresaId()), data),
  getEmployees: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<UserProfile[]>(scopedKey('employees', id), defaultForEmpresa(id, DEMO_EMPLOYEES, []));
  },
  saveEmployees: (data: UserProfile[], empresaId?: string) =>
    writeLocal(scopedKey('employees', empresaId || localStore.getActiveEmpresaId()), data),
  getSales: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<Sale[]>(scopedKey('sales', id), defaultForEmpresa(id, DEMO_SALES, []));
  },
  saveSales: (data: Sale[], empresaId?: string) =>
    writeLocal(scopedKey('sales', empresaId || localStore.getActiveEmpresaId()), data),
  getTickets: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<SupportTicket[]>(scopedKey('tickets', id), defaultForEmpresa(id, DEMO_TICKETS, []));
  },
  saveTickets: (data: SupportTicket[], empresaId?: string) =>
    writeLocal(scopedKey('tickets', empresaId || localStore.getActiveEmpresaId()), data),
  getEmails: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<EmailLog[]>(scopedKey('emails', id), defaultForEmpresa(id, DEMO_EMAIL_LOGS, []));
  },
  saveEmails: (data: EmailLog[], empresaId?: string) =>
    writeLocal(scopedKey('emails', empresaId || localStore.getActiveEmpresaId()), data),
  getWishlist: (empresaId?: string) => {
    const id = empresaId || localStore.getActiveEmpresaId();
    return readLocal<string[]>(scopedKey('wishlist', id), defaultForEmpresa(id, ['P001', 'P003'], []));
  },
  saveWishlist: (data: string[], empresaId?: string) =>
    writeLocal(scopedKey('wishlist', empresaId || localStore.getActiveEmpresaId()), data),
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

export async function saveSaleCloud(empresaId: string, sale: Sale): Promise<void> {
  if (isSupabaseConfigured) return saveSaleSupabase(empresaId, sale);
  await setDoc(doc(db, 'empresas', empresaId, 'ventas', sale.id), sale, {merge: true});
}

export async function saveTicketCloud(ticket: SupportTicket): Promise<void> {
  if (isSupabaseConfigured) return saveTicketSupabase(ticket);
  await setDoc(doc(db, 'soporte', ticket.id), ticket, {merge: true});
}

export async function saveEmpresaConfigCloud(empresa: EmpresaConfig): Promise<void> {
  if (isSupabaseConfigured) return saveEmpresaConfigSupabase(empresa);
  await setDoc(doc(db, 'empresas', empresa.id), empresa, {merge: true});
}

export async function cloneEmpresaStarterCloud(
  targetEmpresaId: string,
  template: {
    products: Product[];
    customers: Customer[];
    banners: StoreBanner[];
  }
): Promise<void> {
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
  if (isSupabaseConfigured) return saveProductSupabase(empresaId, product);
  await setDoc(doc(db, 'empresas', empresaId, 'productos', product.id), product, {merge: true});
}

export async function deleteProductCloud(empresaId: string, productId: string): Promise<void> {
  if (isSupabaseConfigured) return deleteProductSupabase(empresaId, productId);
  await deleteDoc(doc(db, 'empresas', empresaId, 'productos', productId));
}

export async function saveCustomerCloud(empresaId: string, customer: Customer): Promise<void> {
  if (isSupabaseConfigured) return saveCustomerSupabase(empresaId, customer);
  await setDoc(doc(db, 'empresas', empresaId, 'clientes', customer.id), customer, {merge: true});
}

export async function saveSupplierCloud(empresaId: string, supplier: Supplier): Promise<void> {
  if (isSupabaseConfigured) return saveSupplierSupabase(empresaId, supplier);
  await setDoc(doc(db, 'empresas', empresaId, 'proveedores', supplier.id), supplier, {merge: true});
}

export async function savePurchaseCloud(empresaId: string, purchase: Purchase): Promise<void> {
  if (isSupabaseConfigured) return savePurchaseSupabase(empresaId, purchase);
  await setDoc(doc(db, 'empresas', empresaId, 'compras', purchase.id), purchase, {merge: true});
}

export async function receivePurchaseCloud(
  empresaId: string,
  purchaseId: string,
  productId: string,
  newStock: number
): Promise<void> {
  if (isSupabaseConfigured) {
    return receivePurchaseSupabase(empresaId, purchaseId, productId, newStock);
  }
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'empresas', empresaId, 'compras', purchaseId),
    {estado: 'Recibida'},
    {merge: true}
  );
  batch.set(
    doc(db, 'empresas', empresaId, 'productos', productId),
    {stock: newStock},
    {merge: true}
  );
  await batch.commit();
}

export async function saveBannerCloud(empresaId: string, banner: StoreBanner): Promise<void> {
  if (isSupabaseConfigured) return saveBannerSupabase(empresaId, banner);
  await setDoc(doc(db, 'empresas', empresaId, 'banners', banner.id), banner, {merge: true});
}

export async function deleteBannerCloud(empresaId: string, bannerId: string): Promise<void> {
  if (isSupabaseConfigured) return deleteBannerSupabase(empresaId, bannerId);
  await deleteDoc(doc(db, 'empresas', empresaId, 'banners', bannerId));
}

export async function commitSaleCloud(
  empresaId: string,
  sale: Sale,
  updatedStocks: {id: string; stock: number}[]
): Promise<void> {
  if (isSupabaseConfigured) {
    return commitSaleSupabase(empresaId, sale, updatedStocks);
  }
  const batch = writeBatch(db);
  batch.set(doc(db, 'empresas', empresaId, 'ventas', sale.id), sale);
  for (const item of updatedStocks) {
    batch.set(
      doc(db, 'empresas', empresaId, 'productos', item.id),
      {stock: item.stock},
      {merge: true}
    );
  }
  await batch.commit();
}

export async function createEmployeeCloud(payload: {
  email: string;
  pass: string;
  nombre: string;
  rol: 'admin' | 'vendedor' | 'bodega';
  empresaId: string;
}): Promise<string> {
  if (isSupabaseConfigured) return createEmployeeSupabase(payload);
  const fn = httpsCallable<
    {email: string; password: string; nombre: string; rol: string; empresaId: string},
    {uid: string}
  >(functions, 'createEmployeeAccount');
  const res = await fn({
    email: payload.email.trim(),
    password: payload.pass,
    nombre: payload.nombre.trim(),
    rol: payload.rol,
    empresaId: payload.empresaId,
  });
  return res.data.uid;
}

export async function deleteEmployeeCloud(uid: string): Promise<void> {
  if (isSupabaseConfigured) return deleteEmployeeSupabase(uid);
  const fn = httpsCallable<{uid: string}, unknown>(functions, 'deleteUserAccount');
  await fn({uid});
}

export function uploadImageToFirebaseStorage(
  empresaId: string,
  folder: 'productos' | 'banners',
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (isSupabaseConfigured) {
    return uploadImageToSupabaseStorage(empresaId, folder, file, onProgress);
  }
  return new Promise((resolve, reject) => {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageRef = ref(
      storage,
      `empresas/${empresaId}/${folder}/${Date.now()}_${cleanName}`
    );
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      'state_changed',
      (snap) => {
        if (snap.totalBytes > 0 && onProgress) {
          onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      },
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}
