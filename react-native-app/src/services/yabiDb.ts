import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {db} from '../config/firebase';

export interface RnProduct {
  id: string;
  nombre: string;
  sku: string;
  cat: string;
  precio: number;
  costo: number;
  stock: number;
  minStock: number;
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
  pago: 'Efectivo' | 'Nequi' | 'Tarjeta' | 'Wompi';
  fecha: string;
  estado: 'Pagada' | 'Pendiente';
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
  onProducts: (items: RnProduct[]) => void,
  onSales: (items: RnSale[]) => void
): () => void {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(collection(db, 'empresas', empresaId, 'productos'), (snap) => {
      onProducts(snap.docs.map((d) => ({id: d.id, ...d.data()}) as RnProduct));
    })
  );

  unsubs.push(
    onSnapshot(collection(db, 'empresas', empresaId, 'ventas'), (snap) => {
      const list = snap.docs
        .map((d) => ({id: d.id, ...d.data()}) as RnSale)
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      onSales(list);
    })
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
