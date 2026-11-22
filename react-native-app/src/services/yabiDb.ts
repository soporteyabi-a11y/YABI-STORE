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
import {db} from '../config/firebase';

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
  onProducts: (items: RnProduct[]) => void;
  onSales: (items: RnSale[]) => void;
  onPurchases: (items: RnPurchase[]) => void;
  onCustomers: (items: RnCustomer[]) => void;
  onSuppliers: (items: RnSupplier[]) => void;
  onBanners: (items: RnBanner[]) => void;
  onTickets: (items: RnTicket[]) => void;
}

export function formatCOP(value: number): string {
  return '$' + Math.round(value || 0).toLocaleString('es-CO');
}

export async function resolveEmpresaId(uid: string): Promise<string> {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  if (!snap.exists()) return 'EMP001';
  const emp = snap.data()?.empresaId;
  return emp && emp !== '__super__' && emp !== '__default__' ? emp : 'EMP001';
}

export function subscribeEmpresaRealtime(
  empresaId: string,
  callbacks: RnRealtimeCallbacks
): () => void {
  const unsubs: Unsubscribe[] = [];

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
  await setDoc(doc(db, 'empresas', empresaId, 'productos', productId), {stock}, {merge: true});
}

export async function saveProduct(empresaId: string, product: RnProduct): Promise<void> {
  await setDoc(doc(db, 'empresas', empresaId, 'productos', product.id), product, {merge: true});
}

export async function commitSale(
  empresaId: string,
  sale: RnSale,
  stockUpdates: {id: string; stock: number}[]
): Promise<void> {
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
  await setDoc(doc(db, 'empresas', empresaId, 'ventas', saleId), patch, {merge: true});
}

export async function savePurchase(empresaId: string, purchase: RnPurchase): Promise<void> {
  await setDoc(doc(db, 'empresas', empresaId, 'compras', purchase.id), purchase, {merge: true});
}

export async function receivePurchase(
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

export async function saveCustomer(empresaId: string, customer: RnCustomer): Promise<void> {
  await setDoc(doc(db, 'empresas', empresaId, 'clientes', customer.id), customer, {merge: true});
}

export async function saveSupplier(empresaId: string, supplier: RnSupplier): Promise<void> {
  await setDoc(doc(db, 'empresas', empresaId, 'proveedores', supplier.id), supplier, {merge: true});
}

export async function saveBanner(empresaId: string, banner: RnBanner): Promise<void> {
  await setDoc(doc(db, 'empresas', empresaId, 'banners', banner.id), banner, {merge: true});
}

export async function deleteBanner(empresaId: string, bannerId: string): Promise<void> {
  await deleteDoc(doc(db, 'empresas', empresaId, 'banners', bannerId));
}

export async function saveTicket(ticket: RnTicket): Promise<void> {
  await setDoc(doc(db, 'soporte', ticket.id), ticket, {merge: true});
}
