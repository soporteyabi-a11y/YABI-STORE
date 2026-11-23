import {onAuthStateChanged, signInWithEmailAndPassword, signOut} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {auth, db} from '../config/firebase';
import {isRnSupabaseConfigured} from '../config/supabase';
import {
  commitSaleSupabase,
  deleteBannerSupabase,
  receivePurchaseSupabase,
  resolveEmpresaIdSupabase,
  saveBannerSupabase,
  saveCustomerSupabase,
  saveEmpresaConfigSupabase,
  saveProductSupabase,
  savePurchaseSupabase,
  saveSupplierSupabase,
  saveTicketSupabase,
  subscribeEmpresaRealtimeSupabase,
  supabaseRnAuth,
  updateSaleSupabase,
  updateStockSupabase,
  type RnAuthUser,
} from './supabaseDb';

export interface RnEmpresa {
  id: string;
  nombre: string;
  nit?: string;
  ciudad?: string;
  telefono?: string;
  iva?: number;
  plan?: 'Starter' | 'Pro' | 'Enterprise';
  color?: string;
  activa?: boolean;
}

export type RnPaymentMethod = 'Efectivo' | 'Nequi' | 'Tarjeta' | 'Wompi' | 'PSE';

export interface RnProduct {
  id: string;
  nombre: string;
  sku: string;
  cat: string;
  precio: number;
  costo: number;
  stock: number;
  minStock: number;
  proveedor?: string;
  img?: string;
  estado: 'Activo' | 'Inactivo';
}

export interface RnSale {
  id: string;
  orden: string;
  cliente: string;
  productoId: string;
  producto: string;
  precio: number;
  qty: number;
  desc: number;
  total: number;
  pago: RnPaymentMethod;
  fecha: string;
  hora?: string;
  estado: 'Pagada' | 'Pendiente' | 'Cancelada';
  transportadora?: string;
  guia?: string;
  notas?: string;
  origen?: 'POS' | 'Tienda Online';
}

export interface RnPurchase {
  id: string;
  orden: string;
  proveedor: string;
  productoId: string;
  producto: string;
  qty: number;
  costo: number;
  total: number;
  fecha: string;
  estado: 'Pendiente' | 'Recibida';
  notas?: string;
}

export interface RnCustomer {
  id: string;
  nombre: string;
  email: string;
  tel: string;
  ciudad: string;
  dir: string;
  estado: 'Activo' | 'Inactivo';
}

export interface RnSupplier {
  id: string;
  empresa: string;
  nit: string;
  contacto: string;
  email: string;
  tel: string;
  cat: string;
  plazo: string;
  saldo: number;
  estado: 'Activo' | 'Inactivo';
}

export interface RnBanner {
  id: string;
  titulo: string;
  subtitulo: string;
  img: string;
  cta?: string;
  estado: 'Activo' | 'Inactivo';
}

export interface RnTicket {
  id: string;
  empresaId: string;
  asunto: string;
  mensaje: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  estado: 'Abierto' | 'En Proceso' | 'Resuelto' | 'Cerrado';
  fecha: string;
  creadoPor?: string;
  respuesta?: string;
}

export interface RnRealtimeCallbacks {
  onEmpresa?: (empresa: RnEmpresa) => void;
  onProducts: (items: RnProduct[]) => void;
  onSales: (items: RnSale[]) => void;
  onPurchases: (items: RnPurchase[]) => void;
  onCustomers: (items: RnCustomer[]) => void;
  onSuppliers: (items: RnSupplier[]) => void;
  onBanners: (items: RnBanner[]) => void;
  onTickets: (items: RnTicket[]) => void;
}

export const rnActiveBackend: 'supabase' | 'firebase' = isRnSupabaseConfigured
  ? 'supabase'
  : 'firebase';

export const rnAuth = {
  subscribe: (cb: (user: RnAuthUser | null) => void): (() => void) => {
    if (isRnSupabaseConfigured) {
      return supabaseRnAuth.subscribe(cb);
    }
    return onAuthStateChanged(auth, (fbUser) => {
      cb(fbUser ? {uid: fbUser.uid, email: fbUser.email || ''} : null);
    });
  },
  login: async (email: string, password: string): Promise<void> => {
    if (isRnSupabaseConfigured) {
      await supabaseRnAuth.login(email, password);
      return;
    }
    await signInWithEmailAndPassword(auth, email.trim(), password);
  },
  logout: async (): Promise<void> => {
    if (isRnSupabaseConfigured) {
      await supabaseRnAuth.logout();
      return;
    }
    await signOut(auth);
  },
};

export function formatCOP(value: number): string {
  return '$' + Math.round(value || 0).toLocaleString('es-CO');
}

export function formatReceiptText(
  sale: RnSale,
  empresa: RnEmpresa,
  cashReceived?: number
): string {
  const ivaPct = Number(empresa.iva ?? 0);
  const baseGravable = ivaPct > 0 ? Math.round(sale.total / (1 + ivaPct / 100)) : sale.total;
  const ivaValor = ivaPct > 0 ? Math.max(0, sale.total - baseGravable) : 0;
  const change = cashReceived && cashReceived > sale.total ? cashReceived - sale.total : 0;

  return [
    empresa.nombre,
    empresa.nit ? `NIT: ${empresa.nit}` : '',
    empresa.ciudad ? empresa.ciudad : '',
    `Comprobante ${sale.orden} · ${sale.fecha} ${sale.hora || ''}`,
    `Canal: ${sale.origen || 'POS'}`,
    `Cliente: ${sale.cliente}`,
    `Pago: ${sale.pago} (${sale.estado})`,
    sale.notas ? `Entrega: ${sale.notas}` : '',
    sale.transportadora ? `Envío: ${sale.transportadora}${sale.guia ? ` · Guía ${sale.guia}` : ''}` : '',
    '----------------------------',
    `${sale.qty}x ${sale.producto} — ${formatCOP(sale.total + (sale.desc || 0))}`,
    '----------------------------',
    sale.desc > 0 ? `Descuento: -${formatCOP(sale.desc)}` : '',
    ...(ivaPct > 0
      ? [`Base gravable: ${formatCOP(baseGravable)}`, `IVA (${ivaPct}%): ${formatCOP(ivaValor)}`]
      : ['Régimen: No responsable de IVA']),
    `TOTAL PAGADO: ${formatCOP(sale.total)}`,
    change > 0 ? `Efectivo: ${formatCOP(cashReceived || 0)} · Cambio: ${formatCOP(change)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function resolveEmpresaId(uid: string): Promise<string> {
  if (isRnSupabaseConfigured) {
    return resolveEmpresaIdSupabase(uid);
  }
  const snap = await getDoc(doc(db, 'usuarios', uid));
  if (!snap.exists()) return 'EMP001';
  const emp = snap.data()?.empresaId;
  return emp && emp !== '__super__' && emp !== '__default__' ? emp : 'EMP001';
}

export function subscribeEmpresaRealtime(
  empresaId: string,
  callbacks: RnRealtimeCallbacks
): () => void {
  if (isRnSupabaseConfigured) {
    return subscribeEmpresaRealtimeSupabase(empresaId, callbacks);
  }

  const unsubs: Unsubscribe[] = [];

  if (callbacks.onEmpresa) {
    const onEmp = callbacks.onEmpresa;
    unsubs.push(
      onSnapshot(doc(db, 'empresas', empresaId), (snap) => {
        if (snap.exists()) {
          const d = snap.data() as Record<string, unknown>;
          onEmp({
            id: snap.id,
            nombre: String(d.nombre || "DIGITAL YA'BI"),
            nit: d.nit ? String(d.nit) : undefined,
            ciudad: d.ciudad ? String(d.ciudad) : undefined,
            telefono: d.telefono ? String(d.telefono) : undefined,
            iva: d.iva !== null && d.iva !== undefined ? Number(d.iva) : 0,
            plan: (d.plan as RnEmpresa['plan']) || 'Pro',
            color: d.color ? String(d.color) : '#00C8FF',
            activa: d.activa !== false,
          });
        }
      })
    );
  }

  unsubs.push(
    onSnapshot(collection(db, 'empresas', empresaId, 'productos'), (snap) => {
      callbacks.onProducts(snap.docs.map((d) => ({id: d.id, ...d.data()}) as RnProduct));
    })
  );

  unsubs.push(
    onSnapshot(collection(db, 'empresas', empresaId, 'ventas'), (snap) => {
      const list = snap.docs
        .map((d) => ({id: d.id, ...d.data()}) as RnSale)
        .sort((a, b) => (b.fecha + (b.hora || '')).localeCompare(a.fecha + (a.hora || '')));
      callbacks.onSales(list);
    })
  );

  unsubs.push(
    onSnapshot(collection(db, 'empresas', empresaId, 'compras'), (snap) => {
      const list = snap.docs
        .map((d) => ({id: d.id, ...d.data()}) as RnPurchase)
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      callbacks.onPurchases(list);
    })
  );

  unsubs.push(
    onSnapshot(collection(db, 'empresas', empresaId, 'clientes'), (snap) => {
      callbacks.onCustomers(snap.docs.map((d) => ({id: d.id, ...d.data()}) as RnCustomer));
    })
  );

  unsubs.push(
    onSnapshot(collection(db, 'empresas', empresaId, 'proveedores'), (snap) => {
      callbacks.onSuppliers(snap.docs.map((d) => ({id: d.id, ...d.data()}) as RnSupplier));
    })
  );

  unsubs.push(
    onSnapshot(collection(db, 'empresas', empresaId, 'banners'), (snap) => {
      callbacks.onBanners(snap.docs.map((d) => ({id: d.id, ...d.data()}) as RnBanner));
    })
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'soporte'), where('empresaId', '==', empresaId)),
      (snap) => {
        const list = snap.docs
          .map((d) => {
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
              prioridad: (raw.prioridad as RnTicket['prioridad']) || 'Media',
              estado: (raw.estado as RnTicket['estado']) || 'Abierto',
              fecha: fechaStr,
              creadoPor: raw.creadoPor ? String(raw.creadoPor) : undefined,
              respuesta: raw.respuesta ? String(raw.respuesta) : undefined,
            };
          })
          .sort((a, b) => b.fecha.localeCompare(a.fecha));
        callbacks.onTickets(list);
      },
      () => {
        // ignore permission edge cases for restricted roles
      }
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}

export async function updateStock(
  empresaId: string,
  productId: string,
  stock: number
): Promise<void> {
  if (isRnSupabaseConfigured) return updateStockSupabase(empresaId, productId, stock);
  await setDoc(doc(db, 'empresas', empresaId, 'productos', productId), {stock}, {merge: true});
}

export async function saveProduct(empresaId: string, product: RnProduct): Promise<void> {
  if (isRnSupabaseConfigured) return saveProductSupabase(empresaId, product);
  await setDoc(doc(db, 'empresas', empresaId, 'productos', product.id), product, {merge: true});
}

export async function commitSale(
  empresaId: string,
  sale: RnSale,
  stockUpdates: {id: string; stock: number}[]
): Promise<void> {
  if (isRnSupabaseConfigured) return commitSaleSupabase(empresaId, sale, stockUpdates);
  const batch = writeBatch(db);
  batch.set(doc(db, 'empresas', empresaId, 'ventas', sale.id), sale);
  for (const item of stockUpdates) {
    batch.set(
      doc(db, 'empresas', empresaId, 'productos', item.id),
      {stock: item.stock},
      {merge: true}
    );
  }
  await batch.commit();
}

export async function updateSale(
  empresaId: string,
  saleId: string,
  patch: Partial<RnSale>
): Promise<void> {
  if (isRnSupabaseConfigured) return updateSaleSupabase(empresaId, saleId, patch);
  await setDoc(doc(db, 'empresas', empresaId, 'ventas', saleId), patch, {merge: true});
}

export async function savePurchase(empresaId: string, purchase: RnPurchase): Promise<void> {
  if (isRnSupabaseConfigured) return savePurchaseSupabase(empresaId, purchase);
  await setDoc(doc(db, 'empresas', empresaId, 'compras', purchase.id), purchase, {merge: true});
}

export async function receivePurchase(
  empresaId: string,
  purchaseId: string,
  productId: string,
  newStock: number
): Promise<void> {
  if (isRnSupabaseConfigured) {
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

export async function saveCustomer(empresaId: string, customer: RnCustomer): Promise<void> {
  if (isRnSupabaseConfigured) return saveCustomerSupabase(empresaId, customer);
  await setDoc(doc(db, 'empresas', empresaId, 'clientes', customer.id), customer, {merge: true});
}

export async function saveSupplier(empresaId: string, supplier: RnSupplier): Promise<void> {
  if (isRnSupabaseConfigured) return saveSupplierSupabase(empresaId, supplier);
  await setDoc(doc(db, 'empresas', empresaId, 'proveedores', supplier.id), supplier, {merge: true});
}

export async function saveBanner(empresaId: string, banner: RnBanner): Promise<void> {
  if (isRnSupabaseConfigured) return saveBannerSupabase(empresaId, banner);
  await setDoc(doc(db, 'empresas', empresaId, 'banners', banner.id), banner, {merge: true});
}

export async function deleteBanner(empresaId: string, bannerId: string): Promise<void> {
  if (isRnSupabaseConfigured) return deleteBannerSupabase(empresaId, bannerId);
  await deleteDoc(doc(db, 'empresas', empresaId, 'banners', bannerId));
}

export async function saveTicket(ticket: RnTicket): Promise<void> {
  if (isRnSupabaseConfigured) return saveTicketSupabase(ticket);
  await setDoc(doc(db, 'soporte', ticket.id), ticket, {merge: true});
}

export async function saveEmpresaConfig(empresa: RnEmpresa): Promise<void> {
  if (isRnSupabaseConfigured) return saveEmpresaConfigSupabase(empresa);
  await setDoc(
    doc(db, 'empresas', empresa.id),
    {...empresa, iva: Number(empresa.iva ?? 0)},
    {merge: true}
  );
}
