import {supabaseRn} from '../config/supabase';
import type {
  RnBanner,
  RnCustomer,
  RnPaymentMethod,
  RnProduct,
  RnPurchase,
  RnRealtimeCallbacks,
  RnSale,
  RnSupplier,
  RnTicket,
} from './yabiDb';

export interface RnAuthUser {
  uid: string;
  email: string;
}

function getSb() {
  if (!supabaseRn) {
    throw new Error('Supabase no configurado en Expo (.env EXPO_PUBLIC_SUPABASE_URL/ANON_KEY)');
  }
  return supabaseRn;
}

function mapProduct(row: Record<string, unknown>): RnProduct {
  return {
    id: String(row.id),
    nombre: String(row.nombre || ''),
    sku: String(row.sku || ''),
    cat: String(row.cat || 'General'),
    precio: Number(row.precio || 0),
    costo: Number(row.costo || 0),
    stock: Number(row.stock || 0),
    minStock: Number(row.min_stock ?? 5),
    proveedor: row.proveedor ? String(row.proveedor) : undefined,
    img: row.img ? String(row.img) : undefined,
    estado: (row.estado as RnProduct['estado']) || 'Activo',
  };
}

function mapSale(row: Record<string, unknown>): RnSale {
  return {
    id: String(row.id),
    orden: String(row.orden || ''),
    cliente: String(row.cliente || 'Mostrador'),
    productoId: String(row.producto_id || ''),
    producto: String(row.producto || ''),
    precio: Number(row.precio || 0),
    qty: Number(row.qty || 1),
    desc: Number(row.descuento || 0),
    total: Number(row.total || 0),
    pago: (row.pago as RnPaymentMethod) || 'Efectivo',
    fecha: String(row.fecha || '').slice(0, 10),
    hora: row.hora ? String(row.hora) : undefined,
    estado: (row.estado as RnSale['estado']) || 'Pagada',
    transportadora: row.transportadora ? String(row.transportadora) : undefined,
    guia: row.guia ? String(row.guia) : undefined,
    notas: row.notas ? String(row.notas) : undefined,
    origen: (row.origen as RnSale['origen']) || 'POS',
  };
}

function mapPurchase(row: Record<string, unknown>): RnPurchase {
  return {
    id: String(row.id),
    orden: String(row.orden || ''),
    proveedor: String(row.proveedor || ''),
    productoId: String(row.producto_id || ''),
    producto: String(row.producto || ''),
    qty: Number(row.qty || 1),
    costo: Number(row.costo || 0),
    total: Number(row.total || 0),
    fecha: String(row.fecha || '').slice(0, 10),
    estado: (row.estado as RnPurchase['estado']) || 'Pendiente',
    notas: row.notas ? String(row.notas) : undefined,
  };
}

function mapCustomer(row: Record<string, unknown>): RnCustomer {
  return {
    id: String(row.id),
    nombre: String(row.nombre || ''),
    email: String(row.email || ''),
    tel: String(row.tel || ''),
    ciudad: String(row.ciudad || ''),
    dir: String(row.dir || ''),
    estado: (row.estado as RnCustomer['estado']) || 'Activo',
  };
}

function mapSupplier(row: Record<string, unknown>): RnSupplier {
  return {
    id: String(row.id),
    empresa: String(row.empresa || ''),
    nit: String(row.nit || ''),
    contacto: String(row.contacto || ''),
    email: String(row.email || ''),
    tel: String(row.tel || ''),
    cat: String(row.cat || 'General'),
    plazo: String(row.plazo || 'Contado'),
    saldo: Number(row.saldo || 0),
    estado: (row.estado as RnSupplier['estado']) || 'Activo',
  };
}

function mapBanner(row: Record<string, unknown>): RnBanner {
  return {
    id: String(row.id),
    titulo: String(row.titulo || ''),
    subtitulo: String(row.subtitulo || ''),
    img: String(row.img || ''),
    cta: row.cta ? String(row.cta) : undefined,
    estado: (row.estado as RnBanner['estado']) || 'Activo',
  };
}

function mapTicket(row: Record<string, unknown>): RnTicket {
  return {
    id: String(row.id),
    empresaId: String(row.empresa_id || 'EMP001'),
    asunto: String(row.asunto || 'Soporte'),
    mensaje: String(row.mensaje || ''),
    prioridad: (row.prioridad as RnTicket['prioridad']) || 'Media',
    estado: (row.estado as RnTicket['estado']) || 'Abierto',
    fecha: String(row.fecha || '').slice(0, 10),
    creadoPor: row.creado_por ? String(row.creado_por) : undefined,
    respuesta: row.respuesta ? String(row.respuesta) : undefined,
  };
}

export const supabaseRnAuth = {
  subscribe: (cb: (user: RnAuthUser | null) => void): (() => void) => {
    const sb = getSb();
    const mapUser = (u: {id: string; email?: string} | null): RnAuthUser | null =>
      u ? {uid: u.id, email: u.email || ''} : null;

    sb.auth.getSession().then(({data}) => cb(mapUser(data.session?.user ?? null)));
    const {data} = sb.auth.onAuthStateChange((_event, session) => {
      cb(mapUser(session?.user ?? null));
    });
    return () => data.subscription.unsubscribe();
  },
  login: async (email: string, password: string) => {
    const sb = getSb();
    const {error} = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
  },
  logout: async () => {
    const sb = getSb();
    await sb.auth.signOut();
  },
};

export async function resolveEmpresaIdSupabase(uid: string): Promise<string> {
  const sb = getSb();
  const {data} = await sb
    .from('usuarios')
    .select('empresa_id')
    .eq('uid', uid)
    .maybeSingle();
  const emp = data?.empresa_id ? String(data.empresa_id) : '';
  return emp && emp !== '__super__' && emp !== '__default__' ? emp : 'EMP001';
}

export function subscribeEmpresaRealtimeSupabase(
  empresaId: string,
  callbacks: RnRealtimeCallbacks
): () => void {
  const sb = getSb();
  let disposed = false;

  const hydrate = async () => {
    try {
      const [prodRes, saleRes, purRes, custRes, supRes, banRes, tktRes] = await Promise.all([
        sb.from('productos').select('*').eq('empresa_id', empresaId),
        sb.from('ventas').select('*').eq('empresa_id', empresaId).order('fecha', {ascending: false}),
        sb.from('compras').select('*').eq('empresa_id', empresaId).order('fecha', {ascending: false}),
        sb.from('clientes').select('*').eq('empresa_id', empresaId),
        sb.from('proveedores').select('*').eq('empresa_id', empresaId),
        sb.from('banners').select('*').eq('empresa_id', empresaId),
        sb.from('soporte').select('*').eq('empresa_id', empresaId).order('fecha', {ascending: false}),
      ]);
      if (disposed) return;
      if (prodRes.data) callbacks.onProducts(prodRes.data.map(mapProduct));
      if (saleRes.data) callbacks.onSales(saleRes.data.map(mapSale));
      if (purRes.data) callbacks.onPurchases(purRes.data.map(mapPurchase));
      if (custRes.data) callbacks.onCustomers(custRes.data.map(mapCustomer));
      if (supRes.data) callbacks.onSuppliers(supRes.data.map(mapSupplier));
      if (banRes.data) callbacks.onBanners(banRes.data.map(mapBanner));
      if (tktRes.data) callbacks.onTickets(tktRes.data.map(mapTicket));
    } catch {
      // keep previous snapshot on transient mobile network drop
    }
  };

  hydrate();

  const channel = sb
    .channel(`yabi-rn-${empresaId}`)
    .on(
      'postgres_changes',
      {event: '*', schema: 'public', table: 'productos', filter: `empresa_id=eq.${empresaId}`},
      () => hydrate()
    )
    .on(
      'postgres_changes',
      {event: '*', schema: 'public', table: 'ventas', filter: `empresa_id=eq.${empresaId}`},
      () => hydrate()
    )
    .on(
      'postgres_changes',
      {event: '*', schema: 'public', table: 'compras', filter: `empresa_id=eq.${empresaId}`},
      () => hydrate()
    )
    .on(
      'postgres_changes',
      {event: '*', schema: 'public', table: 'clientes', filter: `empresa_id=eq.${empresaId}`},
      () => hydrate()
    )
    .on(
      'postgres_changes',
      {event: '*', schema: 'public', table: 'proveedores', filter: `empresa_id=eq.${empresaId}`},
      () => hydrate()
    )
    .on(
      'postgres_changes',
      {event: '*', schema: 'public', table: 'banners', filter: `empresa_id=eq.${empresaId}`},
      () => hydrate()
    )
    .on(
      'postgres_changes',
      {event: '*', schema: 'public', table: 'soporte', filter: `empresa_id=eq.${empresaId}`},
      () => hydrate()
    )
    .subscribe();

  return () => {
    disposed = true;
    sb.removeChannel(channel);
  };
}

export async function updateStockSupabase(
  empresaId: string,
  productId: string,
  stock: number
): Promise<void> {
  const sb = getSb();
  const {error} = await sb
    .from('productos')
    .update({stock: Math.max(0, stock)})
    .eq('id', productId)
    .eq('empresa_id', empresaId);
  if (error) throw error;
}

export async function saveProductSupabase(empresaId: string, product: RnProduct): Promise<void> {
  const sb = getSb();
  const {error} = await sb.from('productos').upsert({
    id: product.id,
    empresa_id: empresaId,
    nombre: product.nombre,
    sku: product.sku,
    cat: product.cat,
    precio: product.precio,
    costo: product.costo,
    stock: product.stock,
    min_stock: product.minStock,
    proveedor: product.proveedor || null,
    img: product.img || null,
    estado: product.estado,
  });
  if (error) throw error;
}

export async function commitSaleSupabase(
  empresaId: string,
  sale: RnSale,
  stockUpdates: {id: string; stock: number}[]
): Promise<void> {
  const sb = getSb();
  const {error} = await sb.rpc('registrar_venta_pos', {
    p_venta: {
      id: sale.id,
      empresa_id: empresaId,
      orden: sale.orden,
      cliente: sale.cliente,
      producto_id: sale.productoId || null,
      producto: sale.producto,
      precio: sale.precio,
      qty: sale.qty,
      descuento: sale.desc,
      total: sale.total,
      pago: sale.pago,
      fecha: sale.fecha,
      hora: sale.hora || null,
      estado: sale.estado,
      transportadora: sale.transportadora || null,
      guia: sale.guia || null,
      notas: sale.notas || null,
      origen: sale.origen || 'POS',
    },
    p_stock_updates: stockUpdates,
  });
  if (error) throw error;
}

export async function updateSaleSupabase(
  empresaId: string,
  saleId: string,
  patch: Partial<RnSale>
): Promise<void> {
  const sb = getSb();
  const payload: Record<string, unknown> = {};
  if (patch.estado !== undefined) payload.estado = patch.estado;
  if (patch.transportadora !== undefined) payload.transportadora = patch.transportadora || null;
  if (patch.guia !== undefined) payload.guia = patch.guia || null;
  if (patch.notas !== undefined) payload.notas = patch.notas || null;
  const {error} = await sb
    .from('ventas')
    .update(payload)
    .eq('id', saleId)
    .eq('empresa_id', empresaId);
  if (error) throw error;
}

export async function savePurchaseSupabase(empresaId: string, purchase: RnPurchase): Promise<void> {
  const sb = getSb();
  const {error} = await sb.from('compras').upsert({
    id: purchase.id,
    empresa_id: empresaId,
    orden: purchase.orden,
    proveedor: purchase.proveedor,
    producto_id: purchase.productoId || null,
    producto: purchase.producto,
    qty: purchase.qty,
    costo: purchase.costo,
    total: purchase.total,
    fecha: purchase.fecha,
    estado: purchase.estado,
    notas: purchase.notas || null,
  });
  if (error) throw error;
}

export async function receivePurchaseSupabase(
  empresaId: string,
  purchaseId: string,
  productId: string,
  newStock: number
): Promise<void> {
  const sb = getSb();
  const {error} = await sb.rpc('recibir_compra', {
    p_empresa_id: empresaId,
    p_compra_id: purchaseId,
    p_producto_id: productId,
    p_nuevo_stock: newStock,
  });
  if (error) throw error;
}

export async function saveCustomerSupabase(empresaId: string, customer: RnCustomer): Promise<void> {
  const sb = getSb();
  const {error} = await sb.from('clientes').upsert({
    id: customer.id,
    empresa_id: empresaId,
    nombre: customer.nombre,
    email: customer.email || null,
    tel: customer.tel || null,
    ciudad: customer.ciudad || null,
    dir: customer.dir || null,
    estado: customer.estado,
  });
  if (error) throw error;
}

export async function saveSupplierSupabase(empresaId: string, supplier: RnSupplier): Promise<void> {
  const sb = getSb();
  const {error} = await sb.from('proveedores').upsert({
    id: supplier.id,
    empresa_id: empresaId,
    empresa: supplier.empresa,
    nit: supplier.nit || null,
    contacto: supplier.contacto || null,
    email: supplier.email || null,
    tel: supplier.tel || null,
    cat: supplier.cat || null,
    plazo: supplier.plazo || 'Contado',
    saldo: supplier.saldo || 0,
    estado: supplier.estado,
  });
  if (error) throw error;
}

export async function saveBannerSupabase(empresaId: string, banner: RnBanner): Promise<void> {
  const sb = getSb();
  const {error} = await sb.from('banners').upsert({
    id: banner.id,
    empresa_id: empresaId,
    titulo: banner.titulo,
    subtitulo: banner.subtitulo || null,
    img: banner.img || null,
    cta: banner.cta || null,
    estado: banner.estado,
  });
  if (error) throw error;
}

export async function deleteBannerSupabase(empresaId: string, bannerId: string): Promise<void> {
  const sb = getSb();
  const {error} = await sb
    .from('banners')
    .delete()
    .eq('id', bannerId)
    .eq('empresa_id', empresaId);
  if (error) throw error;
}

export async function saveTicketSupabase(ticket: RnTicket): Promise<void> {
  const sb = getSb();
  const {error} = await sb.from('soporte').upsert({
    id: ticket.id,
    empresa_id: ticket.empresaId,
    asunto: ticket.asunto,
    mensaje: ticket.mensaje,
    prioridad: ticket.prioridad,
    estado: ticket.estado,
    fecha: ticket.fecha,
    creado_por: ticket.creadoPor || null,
    respuesta: ticket.respuesta || null,
  });
  if (error) throw error;
}
