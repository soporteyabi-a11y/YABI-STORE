import {DEMO_EMPRESA} from '../data/demoSeed';
import type {
  Customer,
  EmpresaConfig,
  Product,
  Purchase,
  Sale,
  StoreBanner,
  Supplier,
  SupportTicket,
  UserProfile,
} from '../types/yabi';
import {renderApiUrl, supabase} from './supabaseClient';
import type {LiveSyncCallbacks} from './yabiDb';

export interface AuthSessionUser {
  uid: string;
  displayName?: string | null;
  email?: string | null;
}

function getClient() {
  if (!supabase) {
    throw new Error('Supabase no configurado (faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY)');
  }
  return supabase;
}

function mapEmpresa(row: Record<string, unknown>): EmpresaConfig {
  return {
    id: String(row.id || 'EMP001'),
    nombre: String(row.nombre || 'YA’BI Store'),
    nit: row.nit ? String(row.nit) : undefined,
    direccion: row.direccion ? String(row.direccion) : undefined,
    ciudad: row.ciudad ? String(row.ciudad) : undefined,
    telefono: row.telefono ? String(row.telefono) : undefined,
    iva: row.iva !== null && row.iva !== undefined ? Number(row.iva) : 0,
    plan: (row.plan as EmpresaConfig['plan']) || 'Pro',
    color: row.color ? String(row.color) : '#00C8FF',
    activa: row.activa !== false,
  };
}

function mapProduct(row: Record<string, unknown>): Product {
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
    estado: (row.estado as Product['estado']) || 'Activo',
    desc: row.descripcion ? String(row.descripcion) : undefined,
    destacado: Boolean(row.destacado),
  };
}

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    nombre: String(row.nombre || ''),
    email: String(row.email || ''),
    tel: String(row.tel || ''),
    ciudad: String(row.ciudad || ''),
    dir: String(row.dir || ''),
    estado: (row.estado as Customer['estado']) || 'Activo',
  };
}

function mapSupplier(row: Record<string, unknown>): Supplier {
  return {
    id: String(row.id),
    empresa: String(row.empresa || ''),
    nit: String(row.nit || ''),
    contacto: String(row.contacto || ''),
    email: String(row.email || ''),
    tel: String(row.tel || ''),
    cat: String(row.cat || 'General'),
    plazo: String(row.plazo || '30 días'),
    saldo: Number(row.saldo || 0),
    estado: (row.estado as Supplier['estado']) || 'Activo',
  };
}

function mapPurchase(row: Record<string, unknown>): Purchase {
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
    estado: (row.estado as Purchase['estado']) || 'Pendiente',
    notas: row.notas ? String(row.notas) : undefined,
  };
}

function mapBanner(row: Record<string, unknown>): StoreBanner {
  return {
    id: String(row.id),
    titulo: String(row.titulo || ''),
    subtitulo: String(row.subtitulo || ''),
    img: String(row.img || ''),
    cta: row.cta ? String(row.cta) : undefined,
    estado: (row.estado as StoreBanner['estado']) || 'Activo',
  };
}

function mapSale(row: Record<string, unknown>): Sale {
  return {
    id: String(row.id),
    orden: String(row.orden || ''),
    clienteId: row.cliente_id ? String(row.cliente_id) : undefined,
    cliente: String(row.cliente || 'Mostrador'),
    productoId: String(row.producto_id || ''),
    producto: String(row.producto || ''),
    items: Array.isArray(row.items) ? (row.items as Sale['items']) : undefined,
    precio: Number(row.precio || 0),
    qty: Number(row.qty || 1),
    desc: Number(row.descuento || 0),
    total: Number(row.total || 0),
    costoTotal: row.costo_total !== null && row.costo_total !== undefined ? Number(row.costo_total) : undefined,
    pago: (row.pago as Sale['pago']) || 'Efectivo',
    fecha: String(row.fecha || '').slice(0, 10),
    hora: row.hora ? String(row.hora) : undefined,
    estado: (row.estado as Sale['estado']) || 'Pagada',
    transportadora: row.transportadora ? String(row.transportadora) : undefined,
    guia: row.guia ? String(row.guia) : undefined,
    vendedor: row.vendedor ? String(row.vendedor) : undefined,
    notas: row.notas ? String(row.notas) : undefined,
    origen: (row.origen as Sale['origen']) || 'POS',
  };
}

function mapTicket(row: Record<string, unknown>): SupportTicket {
  return {
    id: String(row.id),
    empresaId: String(row.empresa_id || 'EMP001'),
    asunto: String(row.asunto || 'Soporte'),
    mensaje: String(row.mensaje || ''),
    prioridad: (row.prioridad as SupportTicket['prioridad']) || 'Media',
    estado: (row.estado as SupportTicket['estado']) || 'Abierto',
    fecha: String(row.fecha || '').slice(0, 10),
    creadoPor: row.creado_por ? String(row.creado_por) : undefined,
    respuesta: row.respuesta ? String(row.respuesta) : undefined,
  };
}

function mapEmployee(row: Record<string, unknown>): UserProfile {
  const uid = String(row.uid || '');
  return {
    uid,
    id: uid,
    nombre: String(row.nombre || ''),
    email: String(row.email || ''),
    rol: (row.rol as UserProfile['rol']) || 'vendedor',
    empresaId: String(row.empresa_id || 'EMP001'),
  };
}

export const supabaseAuth = {
  subscribe: (cb: (user: AuthSessionUser | null) => void): (() => void) => {
    const sb = getClient();
    const toUser = (u: {id: string; email?: string; user_metadata?: Record<string, unknown>} | null): AuthSessionUser | null =>
      u
        ? {
            uid: u.id,
            displayName: (u.user_metadata?.nombre as string | undefined) || u.email || null,
            email: u.email || null,
          }
        : null;

    sb.auth.getSession().then(({data}) => cb(toUser(data.session?.user ?? null)));
    const {data} = sb.auth.onAuthStateChange((_event, session) => {
      cb(toUser(session?.user ?? null));
    });
    return () => data.subscription.unsubscribe();
  },
  login: async (email: string, pass: string) => {
    const sb = getClient();
    const {data, error} = await sb.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });
    if (error) throw error;
    return data;
  },
  logout: async () => {
    const sb = getClient();
    await sb.auth.signOut();
  },
  resetPassword: async (email: string) => {
    const sb = getClient();
    const {error} = await sb.auth.resetPasswordForEmail(email.trim());
    if (error) throw error;
  },
};

export async function loadUserContextSupabase(uid: string): Promise<{
  profile: UserProfile | null;
  empresa: EmpresaConfig;
}> {
  const sb = getClient();
  const {data: userRow} = await sb
    .from('usuarios')
    .select('*')
    .eq('uid', uid)
    .maybeSingle();

  const profile = userRow ? mapEmployee(userRow) : null;
  const empresaId =
    profile?.empresaId && profile.empresaId !== '__super__' && profile.empresaId !== '__default__'
      ? profile.empresaId
      : 'EMP001';

  const {data: empRow} = await sb
    .from('empresas')
    .select('*')
    .eq('id', empresaId)
    .maybeSingle();

  const empresa = empRow ? mapEmpresa(empRow) : {...DEMO_EMPRESA, id: empresaId};
  return {profile, empresa};
}

export function subscribeEmpresasListSupabase(
  isSuperAdmin: boolean,
  assignedEmpresaId: string,
  onEmpresas: (list: EmpresaConfig[]) => void
): () => void {
  const sb = getClient();
  let disposed = false;

  const hydrate = async () => {
    try {
      const q = isSuperAdmin
        ? sb.from('empresas').select('*').order('id', {ascending: true})
        : sb.from('empresas').select('*').eq('id', assignedEmpresaId);
      const {data, error} = await q;
      if (!disposed && !error && data) {
        onEmpresas(data.map(mapEmpresa));
      }
    } catch {
      // ignore transient fetch issues
    }
  };

  hydrate();

  const channel = sb
    .channel(`yabi-empresas-list-${isSuperAdmin ? 'super' : assignedEmpresaId}`)
    .on('postgres_changes', {event: '*', schema: 'public', table: 'empresas'}, () => hydrate())
    .subscribe();

  return () => {
    disposed = true;
    sb.removeChannel(channel);
  };
}

export function subscribeEmpresaRealtimeSupabase(
  empresaId: string,
  isSuperAdmin: boolean,
  callbacks: LiveSyncCallbacks
): () => void {
  const sb = getClient();
  let disposed = false;

  const hydrate = async () => {
    try {
      const [
        empRes,
        prodRes,
        custRes,
        supRes,
        purRes,
        banRes,
        saleRes,
        empUsersRes,
        tktRes,
      ] = await Promise.all([
        sb.from('empresas').select('*').eq('id', empresaId).maybeSingle(),
        sb.from('productos').select('*').eq('empresa_id', empresaId),
        sb.from('clientes').select('*').eq('empresa_id', empresaId),
        sb.from('proveedores').select('*').eq('empresa_id', empresaId),
        sb.from('compras').select('*').eq('empresa_id', empresaId).order('fecha', {ascending: false}),
        sb.from('banners').select('*').eq('empresa_id', empresaId),
        sb.from('ventas').select('*').eq('empresa_id', empresaId).order('fecha', {ascending: false}),
        isSuperAdmin
          ? sb.from('usuarios').select('*')
          : sb.from('usuarios').select('*').eq('empresa_id', empresaId),
        isSuperAdmin
          ? sb.from('soporte').select('*').order('fecha', {ascending: false})
          : sb.from('soporte').select('*').eq('empresa_id', empresaId).order('fecha', {ascending: false}),
      ]);

      if (disposed) return;
      if (empRes.data) callbacks.onEmpresa(mapEmpresa(empRes.data));
      if (prodRes.data) callbacks.onProducts(prodRes.data.map(mapProduct));
      if (custRes.data) callbacks.onCustomers(custRes.data.map(mapCustomer));
      if (supRes.data) callbacks.onSuppliers(supRes.data.map(mapSupplier));
      if (purRes.data) callbacks.onPurchases(purRes.data.map(mapPurchase));
      if (banRes.data) callbacks.onBanners(banRes.data.map(mapBanner));
      if (saleRes.data) callbacks.onSales(saleRes.data.map(mapSale));
      if (empUsersRes.data) callbacks.onEmployees(empUsersRes.data.map(mapEmployee));
      if (tktRes.data) callbacks.onTickets(tktRes.data.map(mapTicket));

      const anyErr =
        empRes.error || prodRes.error || saleRes.error || custRes.error || purRes.error;
      callbacks.onSyncStatus(!anyErr);
    } catch {
      if (!disposed) callbacks.onSyncStatus(false);
    }
  };

  hydrate();

  const channel = sb
    .channel(`yabi-realtime-${empresaId}`)
    .on(
      'postgres_changes',
      {event: '*', schema: 'public', table: 'empresas', filter: `id=eq.${empresaId}`},
      () => hydrate()
    )
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
    .on('postgres_changes', {event: '*', schema: 'public', table: 'soporte'}, () => hydrate())
    .on('postgres_changes', {event: '*', schema: 'public', table: 'usuarios'}, () => hydrate())
    .subscribe((status) => {
      if (!disposed && status === 'SUBSCRIBED') {
        callbacks.onSyncStatus(true);
      }
    });

  return () => {
    disposed = true;
    sb.removeChannel(channel);
  };
}

export async function saveSaleSupabase(empresaId: string, sale: Sale): Promise<void> {
  const sb = getClient();
  const {error} = await sb.from('ventas').upsert({
    id: sale.id,
    empresa_id: empresaId,
    orden: sale.orden,
    cliente_id: sale.clienteId || null,
    cliente: sale.cliente,
    producto_id: sale.productoId || null,
    producto: sale.producto,
    items: sale.items || [],
    precio: sale.precio,
    qty: sale.qty,
    descuento: sale.desc,
    total: sale.total,
    costo_total: sale.costoTotal || 0,
    pago: sale.pago,
    fecha: sale.fecha,
    hora: sale.hora || null,
    estado: sale.estado,
    transportadora: sale.transportadora || null,
    guia: sale.guia || null,
    vendedor: sale.vendedor || null,
    notas: sale.notas || null,
    origen: sale.origen || 'POS',
  });
  if (error) throw error;
}

export async function commitSaleSupabase(
  empresaId: string,
  sale: Sale,
  updatedStocks: {id: string; stock: number}[]
): Promise<void> {
  const sb = getClient();
  const {error} = await sb.rpc('registrar_venta_pos', {
    p_venta: {
      id: sale.id,
      empresa_id: empresaId,
      orden: sale.orden,
      cliente_id: sale.clienteId || null,
      cliente: sale.cliente,
      producto_id: sale.productoId || null,
      producto: sale.producto,
      items: sale.items || [],
      precio: sale.precio,
      qty: sale.qty,
      descuento: sale.desc,
      total: sale.total,
      costo_total: sale.costoTotal || 0,
      pago: sale.pago,
      fecha: sale.fecha,
      hora: sale.hora || null,
      estado: sale.estado,
      transportadora: sale.transportadora || null,
      guia: sale.guia || null,
      vendedor: sale.vendedor || null,
      notas: sale.notas || null,
      origen: sale.origen || 'POS',
    },
    p_stock_updates: updatedStocks,
  });
  if (error) throw error;
}

export async function saveTicketSupabase(ticket: SupportTicket): Promise<void> {
  const sb = getClient();
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

export async function saveEmpresaConfigSupabase(empresa: EmpresaConfig): Promise<void> {
  const sb = getClient();
  const {error} = await sb.from('empresas').upsert({
    id: empresa.id,
    nombre: empresa.nombre,
    nit: empresa.nit || null,
    direccion: empresa.direccion || null,
    ciudad: empresa.ciudad || null,
    telefono: empresa.telefono || null,
    iva: Number(empresa.iva ?? 0),
    plan: empresa.plan || 'Pro',
    color: empresa.color || '#00C8FF',
    activa: empresa.activa !== false,
  });
  if (error) throw error;
}

export async function saveProductSupabase(empresaId: string, product: Product): Promise<void> {
  const sb = getClient();
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
    descripcion: product.desc || null,
    destacado: Boolean(product.destacado),
  });
  if (error) throw error;
}

export async function deleteProductSupabase(empresaId: string, productId: string): Promise<void> {
  const sb = getClient();
  const {error} = await sb
    .from('productos')
    .delete()
    .eq('id', productId)
    .eq('empresa_id', empresaId);
  if (error) throw error;
}

export async function saveCustomerSupabase(empresaId: string, customer: Customer): Promise<void> {
  const sb = getClient();
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

export async function saveSupplierSupabase(empresaId: string, supplier: Supplier): Promise<void> {
  const sb = getClient();
  const {error} = await sb.from('proveedores').upsert({
    id: supplier.id,
    empresa_id: empresaId,
    empresa: supplier.empresa,
    nit: supplier.nit || null,
    contacto: supplier.contacto || null,
    email: supplier.email || null,
    tel: supplier.tel || null,
    cat: supplier.cat || null,
    plazo: supplier.plazo || '30 días',
    saldo: supplier.saldo || 0,
    estado: supplier.estado,
  });
  if (error) throw error;
}

export async function savePurchaseSupabase(empresaId: string, purchase: Purchase): Promise<void> {
  const sb = getClient();
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
  const sb = getClient();
  const {error} = await sb.rpc('recibir_compra', {
    p_empresa_id: empresaId,
    p_compra_id: purchaseId,
    p_producto_id: productId,
    p_nuevo_stock: newStock,
  });
  if (error) throw error;
}

export async function saveBannerSupabase(empresaId: string, banner: StoreBanner): Promise<void> {
  const sb = getClient();
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
  const sb = getClient();
  const {error} = await sb
    .from('banners')
    .delete()
    .eq('id', bannerId)
    .eq('empresa_id', empresaId);
  if (error) throw error;
}

async function getAccessToken(): Promise<string> {
  const sb = getClient();
  const {data} = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Inicia sesión como administrador');
  return token;
}

export async function createEmployeeSupabase(payload: {
  email: string;
  pass: string;
  nombre: string;
  rol: 'admin' | 'vendedor' | 'bodega';
  empresaId: string;
}): Promise<string> {
  if (!renderApiUrl) {
    throw new Error('Configura VITE_RENDER_API_URL para gestionar empleados desde Render');
  }
  const token = await getAccessToken();
  const resp = await fetch(`${renderApiUrl}/api/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.pass,
      nombre: payload.nombre.trim(),
      rol: payload.rol,
      empresaId: payload.empresaId,
    }),
  });
  const data = (await resp.json()) as {uid?: string; error?: string};
  if (!resp.ok || !data.uid) {
    throw new Error(data.error || 'No se pudo crear el empleado en Render');
  }
  return data.uid;
}

export async function deleteEmployeeSupabase(uid: string): Promise<void> {
  if (!renderApiUrl) {
    throw new Error('Configura VITE_RENDER_API_URL para gestionar empleados desde Render');
  }
  const token = await getAccessToken();
  const resp = await fetch(`${renderApiUrl}/api/employees/${encodeURIComponent(uid)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await resp.json()) as {error?: string};
  if (!resp.ok) {
    throw new Error(data.error || 'No se pudo eliminar el empleado');
  }
}

export async function uploadImageToSupabaseStorage(
  empresaId: string,
  folder: 'productos' | 'banners',
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  const sb = getClient();
  if (onProgress) onProgress(25);
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `empresas/${empresaId}/${folder}/${Date.now()}_${cleanName}`;
  const {error} = await sb.storage.from('yabi-media').upload(filePath, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  });
  if (error) throw error;
  if (onProgress) onProgress(100);
  const {data} = sb.storage.from('yabi-media').getPublicUrl(filePath);
  return data.publicUrl;
}
