import AsyncStorage from '@react-native-async-storage/async-storage';
import {isRnSupabaseConfigured} from '../config/supabase';
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

interface RnQueuedSale {
  empresaId: string;
  sale: RnSale;
  stockUpdates: {id: string; stock: number}[];
}

export const rnActiveBackend = 'supabase' as const;
export {isRnSupabaseConfigured};

const RN_CACHE_PREFIX = 'yabi_rn_cache_v1_';
const RN_OFFLINE_SALES_KEY = 'yabi_rn_offline_sales_v1';

export async function loadRnOfflineCache(empresaId: string): Promise<RnOfflineSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(`${RN_CACHE_PREFIX}${empresaId}`);
    return raw ? (JSON.parse(raw) as RnOfflineSnapshot) : null;
  } catch {
    return null;
  }
}

export async function saveRnOfflineCache(
  empresaId: string,
  patch: RnOfflineSnapshot
): Promise<void> {
  try {
    const existing = (await loadRnOfflineCache(empresaId)) || {};
    await AsyncStorage.setItem(
      `${RN_CACHE_PREFIX}${empresaId}`,
      JSON.stringify({...existing, ...patch})
    );
  } catch {
    // ignore storage errors on low-space devices
  }
}

export async function getRnOfflineSalesQueue(): Promise<RnQueuedSale[]> {
  try {
    const raw = await AsyncStorage.getItem(RN_OFFLINE_SALES_KEY);
    return raw ? (JSON.parse(raw) as RnQueuedSale[]) : [];
  } catch {
    return [];
  }
}

export async function enqueueRnOfflineSale(
  empresaId: string,
  sale: RnSale,
  stockUpdates: {id: string; stock: number}[]
): Promise<number> {
  const queue = await getRnOfflineSalesQueue();
  const next: RnQueuedSale[] = [...queue, {empresaId, sale: {...sale, pendingSync: true}, stockUpdates}];
  try {
    await AsyncStorage.setItem(RN_OFFLINE_SALES_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
  return next.length;
}

export async function flushRnOfflineSales(): Promise<number> {
  if (!isRnSupabaseConfigured) return 0;
  const queue = await getRnOfflineSalesQueue();
  if (queue.length === 0) return 0;

  let synced = 0;
  const remaining: RnQueuedSale[] = [];

  for (const item of queue) {
    try {
      await commitSaleSupabase(item.empresaId, {...item.sale, pendingSync: false}, item.stockUpdates);
      synced++;
    } catch {
      remaining.push(item);
    }
  }

  try {
    await AsyncStorage.setItem(RN_OFFLINE_SALES_KEY, JSON.stringify(remaining));
  } catch {
    // ignore storage quota errors
  }
  return synced;
}

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
  return updateStockSupabase(empresaId, productId, stock);
}

export async function saveProduct(empresaId: string, product: RnProduct): Promise<void> {
  return saveProductSupabase(empresaId, product);
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
    const message = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    const isNetworkError =
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('offline');
    if (isNetworkError) {
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
  return updateSaleSupabase(empresaId, saleId, patch);
}

export async function savePurchase(empresaId: string, purchase: RnPurchase): Promise<void> {
  return savePurchaseSupabase(empresaId, purchase);
}

export async function receivePurchase(
  empresaId: string,
  purchaseId: string,
  productId: string,
  newStock: number
): Promise<void> {
  return receivePurchaseSupabase(empresaId, purchaseId, productId, newStock);
}

export async function saveCustomer(empresaId: string, customer: RnCustomer): Promise<void> {
  return saveCustomerSupabase(empresaId, customer);
}

export async function saveSupplier(empresaId: string, supplier: RnSupplier): Promise<void> {
  return saveSupplierSupabase(empresaId, supplier);
}

export async function saveBanner(empresaId: string, banner: RnBanner): Promise<void> {
  return saveBannerSupabase(empresaId, banner);
}

export async function deleteBanner(empresaId: string, bannerId: string): Promise<void> {
  return deleteBannerSupabase(empresaId, bannerId);
}

export async function saveTicket(ticket: RnTicket): Promise<void> {
  return saveTicketSupabase(ticket);
}

export async function saveEmpresaConfig(empresa: RnEmpresa): Promise<void> {
  return saveEmpresaConfigSupabase(empresa);
}
