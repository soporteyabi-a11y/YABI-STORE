import {isRnSupabaseConfigured} from '../config/supabase';
import {sqliteStore} from './sqliteStore';
import {
  commitSaleSupabase,
  deleteBannerSupabase,
  listEmpresasSupabase,
  receivePurchaseSupabase,
  resolveEmpresaIdSupabase,
  resolveUserContextSupabase,
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
  direccion?: string;
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
  pendingSync?: boolean;
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

export interface RnOfflineSnapshot {
  empresa?: RnEmpresa;
  products?: RnProduct[];
  sales?: RnSale[];
  purchases?: RnPurchase[];
  customers?: RnCustomer[];
  suppliers?: RnSupplier[];
  banners?: RnBanner[];
  tickets?: RnTicket[];
}

export const rnActiveBackend = 'supabase' as const;
export {isRnSupabaseConfigured};

function isNetworkFailure(err: unknown): boolean {
  const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('offline')
  );
}

export async function loadRnOfflineCache(empresaId: string): Promise<RnOfflineSnapshot | null> {
  return sqliteStore.loadEmpresaSnapshot(empresaId);
}

export async function saveRnOfflineCache(
  empresaId: string,
  patch: RnOfflineSnapshot
): Promise<void> {
  await sqliteStore.saveEmpresaSnapshot(empresaId, patch);
}

export async function getRnOfflineQueueCount(): Promise<number> {
  return sqliteStore.getQueueCount();
}

export async function enqueueRnOfflineSale(
  empresaId: string,
  sale: RnSale,
  stockUpdates: {id: string; stock: number}[]
): Promise<number> {
  await sqliteStore.recordOfflineSaleLocal(empresaId, sale, stockUpdates);
  return sqliteStore.getQueueCount();
}

export async function flushRnOfflineSales(): Promise<number> {
  if (!isRnSupabaseConfigured) return 0;
  const queue = await sqliteStore.getQueuedOps();
  if (queue.length === 0) return 0;

  let synced = 0;

  for (const op of queue) {
    try {
      if (op.opType === 'commitSale') {
        const p = op.payload as {sale: RnSale; stockUpdates: {id: string; stock: number}[]};
        await commitSaleSupabase(op.empresaId, {...p.sale, pendingSync: false}, p.stockUpdates);
        await sqliteStore.markOpSynced(op.id, op.empresaId, p.sale.id);
      } else if (op.opType === 'updateSale') {
        const p = op.payload as {saleId: string; patch: Partial<RnSale>};
        await updateSaleSupabase(op.empresaId, p.saleId, p.patch);
        await sqliteStore.markOpSynced(op.id, op.empresaId);
      } else if (op.opType === 'saveProduct') {
        await saveProductSupabase(op.empresaId, op.payload as RnProduct);
        await sqliteStore.markOpSynced(op.id, op.empresaId);
      } else if (op.opType === 'updateStock') {
        const p = op.payload as {productId: string; stock: number};
        await updateStockSupabase(op.empresaId, p.productId, p.stock);
        await sqliteStore.markOpSynced(op.id, op.empresaId);
      } else if (op.opType === 'savePurchase') {
        await savePurchaseSupabase(op.empresaId, op.payload as RnPurchase);
        await sqliteStore.markOpSynced(op.id, op.empresaId);
      } else if (op.opType === 'receivePurchase') {
        const p = op.payload as {purchaseId: string; productId: string; newStock: number};
        await receivePurchaseSupabase(op.empresaId, p.purchaseId, p.productId, p.newStock);
        await sqliteStore.markOpSynced(op.id, op.empresaId);
      } else if (op.opType === 'saveCustomer') {
        await saveCustomerSupabase(op.empresaId, op.payload as RnCustomer);
        await sqliteStore.markOpSynced(op.id, op.empresaId);
      } else if (op.opType === 'saveSupplier') {
        await saveSupplierSupabase(op.empresaId, op.payload as RnSupplier);
        await sqliteStore.markOpSynced(op.id, op.empresaId);
      } else if (op.opType === 'saveBanner') {
        await saveBannerSupabase(op.empresaId, op.payload as RnBanner);
        await sqliteStore.markOpSynced(op.id, op.empresaId);
      } else if (op.opType === 'deleteBanner') {
        const p = op.payload as {bannerId: string};
        await deleteBannerSupabase(op.empresaId, p.bannerId);
        await sqliteStore.markOpSynced(op.id, op.empresaId);
      } else if (op.opType === 'saveTicket') {
        await saveTicketSupabase(op.payload as RnTicket);
        await sqliteStore.markOpSynced(op.id, op.empresaId);
      } else if (op.opType === 'saveEmpresa') {
        await saveEmpresaConfigSupabase(op.payload as RnEmpresa);
        await sqliteStore.markOpSynced(op.id, op.empresaId);
      }
      synced++;
    } catch {
      // keep remaining ops in SQLite queue until connection recovers
    }
  }

  return synced;
}

export const flushRnOfflineQueue = flushRnOfflineSales;

export const rnAuth = {
  subscribe: (cb: (user: RnAuthUser | null) => void): (() => void) => {
    if (!isRnSupabaseConfigured) {
      cb(null);
      return () => {};
    }
    return supabaseRnAuth.subscribe(cb);
  },
  login: async (email: string, password: string): Promise<void> => {
    await supabaseRnAuth.login(email, password);
  },
  logout: async (): Promise<void> => {
    await supabaseRnAuth.logout();
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
    empresa.direccion ? `Dir: ${empresa.direccion}` : '',
    empresa.ciudad ? empresa.ciudad : '',
    empresa.telefono ? `Tel: ${empresa.telefono}` : '',
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

export async function resolveUserContext(uid: string): Promise<{
  empresaId: string;
  isSuperAdmin: boolean;
}> {
  return resolveUserContextSupabase(uid);
}

export async function resolveEmpresaId(uid: string): Promise<string> {
  return resolveEmpresaIdSupabase(uid);
}

export async function listAccessibleEmpresas(
  isSuperAdmin: boolean,
  assignedEmpresaId: string
): Promise<RnEmpresa[]> {
  return listEmpresasSupabase(isSuperAdmin, assignedEmpresaId);
}

export function subscribeEmpresaRealtime(
  empresaId: string,
  callbacks: RnRealtimeCallbacks
): () => void {
  return subscribeEmpresaRealtimeSupabase(empresaId, callbacks);
}

export async function updateStock(
  empresaId: string,
  productId: string,
  stock: number
): Promise<void> {
  try {
    await updateStockSupabase(empresaId, productId, stock);
  } catch (err) {
    if (isNetworkFailure(err)) {
      await sqliteStore.enqueueOp(empresaId, 'updateStock', {productId, stock});
      return;
    }
    throw err;
  }
}

export async function saveProduct(empresaId: string, product: RnProduct): Promise<void> {
  try {
    await saveProductSupabase(empresaId, product);
  } catch (err) {
    if (isNetworkFailure(err)) {
      await sqliteStore.enqueueOp(empresaId, 'saveProduct', product);
      return;
    }
    throw err;
  }
}

export async function commitSale(
  empresaId: string,
  sale: RnSale,
  stockUpdates: {id: string; stock: number}[]
): Promise<{queuedOffline: boolean}> {
  try {
    await commitSaleSupabase(empresaId, sale, stockUpdates);
    return {queuedOffline: false};
  } catch (err) {
    if (isNetworkFailure(err)) {
      await enqueueRnOfflineSale(empresaId, sale, stockUpdates);
      return {queuedOffline: true};
    }
    throw err;
  }
}

export async function updateSale(
  empresaId: string,
  saleId: string,
  patch: Partial<RnSale>
): Promise<void> {
  try {
    await updateSaleSupabase(empresaId, saleId, patch);
  } catch (err) {
    if (isNetworkFailure(err)) {
      await sqliteStore.enqueueOp(empresaId, 'updateSale', {saleId, patch});
      return;
    }
    throw err;
  }
}

export async function savePurchase(empresaId: string, purchase: RnPurchase): Promise<void> {
  try {
    await savePurchaseSupabase(empresaId, purchase);
  } catch (err) {
    if (isNetworkFailure(err)) {
      await sqliteStore.enqueueOp(empresaId, 'savePurchase', purchase);
      return;
    }
    throw err;
  }
}

export async function receivePurchase(
  empresaId: string,
  purchaseId: string,
  productId: string,
  newStock: number
): Promise<void> {
  try {
    await receivePurchaseSupabase(empresaId, purchaseId, productId, newStock);
  } catch (err) {
    if (isNetworkFailure(err)) {
      await sqliteStore.enqueueOp(empresaId, 'receivePurchase', {
        purchaseId,
        productId,
        newStock,
      });
      return;
    }
    throw err;
  }
}

export async function saveCustomer(empresaId: string, customer: RnCustomer): Promise<void> {
  try {
    await saveCustomerSupabase(empresaId, customer);
  } catch (err) {
    if (isNetworkFailure(err)) {
      await sqliteStore.enqueueOp(empresaId, 'saveCustomer', customer);
      return;
    }
    throw err;
  }
}

export async function saveSupplier(empresaId: string, supplier: RnSupplier): Promise<void> {
  try {
    await saveSupplierSupabase(empresaId, supplier);
  } catch (err) {
    if (isNetworkFailure(err)) {
      await sqliteStore.enqueueOp(empresaId, 'saveSupplier', supplier);
      return;
    }
    throw err;
  }
}

export async function saveBanner(empresaId: string, banner: RnBanner): Promise<void> {
  try {
    await saveBannerSupabase(empresaId, banner);
  } catch (err) {
    if (isNetworkFailure(err)) {
      await sqliteStore.enqueueOp(empresaId, 'saveBanner', banner);
      return;
    }
    throw err;
  }
}

export async function deleteBanner(empresaId: string, bannerId: string): Promise<void> {
  try {
    await deleteBannerSupabase(empresaId, bannerId);
  } catch (err) {
    if (isNetworkFailure(err)) {
      await sqliteStore.enqueueOp(empresaId, 'deleteBanner', {bannerId});
      return;
    }
    throw err;
  }
}

export async function saveTicket(ticket: RnTicket): Promise<void> {
  try {
    await saveTicketSupabase(ticket);
  } catch (err) {
    if (isNetworkFailure(err)) {
      await sqliteStore.enqueueOp(ticket.empresaId, 'saveTicket', ticket);
      return;
    }
    throw err;
  }
}

export async function saveEmpresaConfig(empresa: RnEmpresa): Promise<void> {
  try {
    await saveEmpresaConfigSupabase(empresa);
  } catch (err) {
    if (isNetworkFailure(err)) {
      await sqliteStore.enqueueOp(empresa.id, 'saveEmpresa', empresa);
      return;
    }
    throw err;
  }
}
