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
  EmpresaConfig,
  Product,
  Purchase,
  Sale,
  StoreBanner,
  Supplier,
  UserProfile,
} from '../types/yabi';
import {
  DEMO_BANNERS,
  DEMO_CUSTOMERS,
  DEMO_EMPLOYEES,
  DEMO_EMPRESA,
  DEMO_PRODUCTS,
  DEMO_PURCHASES,
  DEMO_SALES,
  DEMO_SUPPLIERS,
} from '../data/demoSeed';

const LOCAL_KEYS = {
  products: 'yabi_v2_products',
  customers: 'yabi_v2_customers',
  suppliers: 'yabi_v2_suppliers',
  purchases: 'yabi_v2_purchases',
  banners: 'yabi_v2_banners',
  employees: 'yabi_v2_employees',
  sales: 'yabi_v2_sales',
  wishlist: 'yabi_v2_wishlist',
  empresa: 'yabi_v2_empresa',
};

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
  subscribe: (cb: (user: User | null) => void) => onAuthStateChanged(auth, cb),
  login: (email: string, pass: string) => signInWithEmailAndPassword(auth, email.trim(), pass),
  logout: () => signOut(auth),
  resetPassword: (email: string) => sendPasswordResetEmail(auth, email.trim()),
};

export async function loadUserContext(uid: string): Promise<{
  profile: UserProfile | null;
  empresa: EmpresaConfig;
}> {
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
  onSyncStatus: (connected: boolean) => void;
}

export function subscribeEmpresaRealtime(
  empresaId: string,
  isSuperAdmin: boolean,
  callbacks: LiveSyncCallbacks
): () => void {
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

export const localStore = {
  getEmpresa: () => readLocal<EmpresaConfig>(LOCAL_KEYS.empresa, DEMO_EMPRESA),
  saveEmpresa: (data: EmpresaConfig) => writeLocal(LOCAL_KEYS.empresa, data),
  getProducts: () => readLocal<Product[]>(LOCAL_KEYS.products, DEMO_PRODUCTS),
  saveProducts: (data: Product[]) => writeLocal(LOCAL_KEYS.products, data),
  getCustomers: () => readLocal<Customer[]>(LOCAL_KEYS.customers, DEMO_CUSTOMERS),
  saveCustomers: (data: Customer[]) => writeLocal(LOCAL_KEYS.customers, data),
  getSuppliers: () => readLocal<Supplier[]>(LOCAL_KEYS.suppliers, DEMO_SUPPLIERS),
  saveSuppliers: (data: Supplier[]) => writeLocal(LOCAL_KEYS.suppliers, data),
  getPurchases: () => readLocal<Purchase[]>(LOCAL_KEYS.purchases, DEMO_PURCHASES),
  savePurchases: (data: Purchase[]) => writeLocal(LOCAL_KEYS.purchases, data),
  getBanners: () => readLocal<StoreBanner[]>(LOCAL_KEYS.banners, DEMO_BANNERS),
  saveBanners: (data: StoreBanner[]) => writeLocal(LOCAL_KEYS.banners, data),
  getEmployees: () => readLocal<UserProfile[]>(LOCAL_KEYS.employees, DEMO_EMPLOYEES),
  saveEmployees: (data: UserProfile[]) => writeLocal(LOCAL_KEYS.employees, data),
  getSales: () => readLocal<Sale[]>(LOCAL_KEYS.sales, DEMO_SALES),
  saveSales: (data: Sale[]) => writeLocal(LOCAL_KEYS.sales, data),
  getWishlist: () => readLocal<string[]>(LOCAL_KEYS.wishlist, ['P001', 'P003']),
  saveWishlist: (data: string[]) => writeLocal(LOCAL_KEYS.wishlist, data),
  resetDemo: () => {
    writeLocal(LOCAL_KEYS.empresa, DEMO_EMPRESA);
    writeLocal(LOCAL_KEYS.products, DEMO_PRODUCTS);
    writeLocal(LOCAL_KEYS.customers, DEMO_CUSTOMERS);
    writeLocal(LOCAL_KEYS.suppliers, DEMO_SUPPLIERS);
    writeLocal(LOCAL_KEYS.purchases, DEMO_PURCHASES);
    writeLocal(LOCAL_KEYS.banners, DEMO_BANNERS);
    writeLocal(LOCAL_KEYS.employees, DEMO_EMPLOYEES);
    writeLocal(LOCAL_KEYS.sales, DEMO_SALES);
  },
};

export async function saveEmpresaConfigCloud(empresa: EmpresaConfig): Promise<void> {
  await setDoc(doc(db, 'empresas', empresa.id), empresa, {merge: true});
}

export async function saveProductCloud(empresaId: string, product: Product): Promise<void> {
  await setDoc(doc(db, 'empresas', empresaId, 'productos', product.id), product, {merge: true});
}

export async function deleteProductCloud(empresaId: string, productId: string): Promise<void> {
  await deleteDoc(doc(db, 'empresas', empresaId, 'productos', productId));
}

export async function saveCustomerCloud(empresaId: string, customer: Customer): Promise<void> {
  await setDoc(doc(db, 'empresas', empresaId, 'clientes', customer.id), customer, {merge: true});
}

export async function saveSupplierCloud(empresaId: string, supplier: Supplier): Promise<void> {
  await setDoc(doc(db, 'empresas', empresaId, 'proveedores', supplier.id), supplier, {merge: true});
}

export async function savePurchaseCloud(empresaId: string, purchase: Purchase): Promise<void> {
  await setDoc(doc(db, 'empresas', empresaId, 'compras', purchase.id), purchase, {merge: true});
}

export async function receivePurchaseCloud(
  empresaId: string,
  purchaseId: string,
  productId: string,
  newStock: number
): Promise<void> {
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
  await setDoc(doc(db, 'empresas', empresaId, 'banners', banner.id), banner, {merge: true});
}

export async function deleteBannerCloud(empresaId: string, bannerId: string): Promise<void> {
  await deleteDoc(doc(db, 'empresas', empresaId, 'banners', bannerId));
}

export async function commitSaleCloud(
  empresaId: string,
  sale: Sale,
  updatedStocks: {id: string; stock: number}[]
): Promise<void> {
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
  const fn = httpsCallable<{uid: string}, unknown>(functions, 'deleteUserAccount');
  await fn({uid});
}

export function uploadImageToFirebaseStorage(
  empresaId: string,
  folder: 'productos' | 'banners',
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
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
