import schemaSql from '../../migration-supabase-render/supabase_schema.sql?raw';
import type {
  Customer,
  EmpresaConfig,
  Product,
  Purchase,
  Sale,
  StoreBanner,
  Supplier,
  SupportTicket,
} from '../types/yabi';

function sqlStr(val: string | undefined | null): string {
  if (val === undefined || val === null || val === '') return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function sqlStrReq(val: string | undefined | null, fallback = ''): string {
  const safe = val !== undefined && val !== null && val !== '' ? String(val) : fallback;
  return `'${safe.replace(/'/g, "''")}'`;
}

function sqlNum(val: number | undefined | null, fallback = 0): string {
  const n = Number(val);
  return Number.isFinite(n) ? String(n) : String(fallback);
}

function sqlInt(val: number | undefined | null, fallback = 0): string {
  const n = Number(val);
  return Number.isFinite(n) ? String(Math.round(n)) : String(fallback);
}

function sqlBool(val: boolean | undefined): string {
  return val ? 'true' : 'false';
}

function sqlDate(val: string | undefined | null): string {
  if (!val) return 'CURRENT_DATE';
  const trimmed = String(val).trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `'${trimmed}'::date`;
  }
  return 'CURRENT_DATE';
}

function sqlJsonb(val: unknown): string {
  const serialized = JSON.stringify(val ?? []);
  return `'${serialized.replace(/'/g, "''")}'::jsonb`;
}

function sqlImg(val: string | undefined | null): string {
  if (!val) return 'NULL';
  const trimmed = String(val).trim();
  if (!trimmed) return 'NULL';
  // Base64 images make SQL queries exceed Supabase SQL Editor's size limit; keep URLs/paths only
  if (trimmed.startsWith('data:') && trimmed.length > 2000) {
    return 'NULL';
  }
  return sqlStr(trimmed);
}

export const SUPABASE_SCHEMA_SQL = schemaSql;

export function buildFullSupabaseSql(params: {
  empresa: EmpresaConfig;
  extraEmpresas?: EmpresaConfig[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  purchases: Purchase[];
  banners: StoreBanner[];
  sales: Sale[];
  tickets: SupportTicket[];
}): string {
  const {
    empresa,
    extraEmpresas = [],
    products,
    customers,
    suppliers,
    purchases,
    banners,
    sales,
    tickets,
  } = params;
  const empresaId = empresa.id || 'EMP001';
  const productIds = new Set(products.map((p) => p.id));

  const allEmpresasMap = new Map<string, EmpresaConfig>();
  allEmpresasMap.set(empresaId, {...empresa, id: empresaId});
  for (const extra of extraEmpresas) {
    if (extra.id && !allEmpresasMap.has(extra.id)) {
      allEmpresasMap.set(extra.id, extra);
    }
  }

  const lines: string[] = [
    schemaSql.trim(),
    '',
    '-- ============================================================================',
    `-- DATOS INICIALES YA'BI STORE (${empresaId}) — Generado para Supabase SQL Editor`,
    '-- ============================================================================',
    '',
  ];

  for (const empRow of allEmpresasMap.values()) {
    const eid = empRow.id || 'EMP001';
    lines.push(
      `INSERT INTO public.empresas (id, nombre, nit, direccion, ciudad, telefono, iva, plan, color, activa)`,
      `VALUES (${sqlStrReq(eid, 'EMP001')}, ${sqlStrReq(empRow.nombre, "YA'BI Store")}, ${sqlStr(empRow.nit)}, ${sqlStr(empRow.direccion)}, ${sqlStr(empRow.ciudad)}, ${sqlStr(empRow.telefono)}, ${sqlNum(empRow.iva, 0)}, ${sqlStrReq(empRow.plan, 'Pro')}, ${sqlStrReq(empRow.color, '#00C8FF')}, ${sqlBool(empRow.activa !== false)})`,
      `ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, nit = EXCLUDED.nit, direccion = EXCLUDED.direccion, ciudad = EXCLUDED.ciudad, telefono = EXCLUDED.telefono, iva = EXCLUDED.iva, plan = EXCLUDED.plan, color = EXCLUDED.color, activa = EXCLUDED.activa;`
    );
  }
  lines.push('');

  if (products.length > 0) {
    lines.push('-- Productos');
    for (const p of products) {
      const estado = p.estado === 'Inactivo' ? 'Inactivo' : 'Activo';
      lines.push(
        `INSERT INTO public.productos (id, empresa_id, nombre, sku, cat, precio, costo, stock, min_stock, proveedor, img, estado, descripcion, destacado) VALUES (${sqlStrReq(p.id)}, ${sqlStrReq(empresaId)}, ${sqlStrReq(p.nombre, 'Producto')}, ${sqlStrReq(p.sku, p.id)}, ${sqlStrReq(p.cat, 'General')}, ${sqlNum(p.precio, 0)}, ${sqlNum(p.costo, 0)}, ${sqlInt(p.stock, 0)}, ${sqlInt(p.minStock, 5)}, ${sqlStr(p.proveedor)}, ${sqlImg(p.img)}, ${sqlStrReq(estado)}, ${sqlStr(p.desc)}, ${sqlBool(p.destacado)}) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, sku = EXCLUDED.sku, cat = EXCLUDED.cat, precio = EXCLUDED.precio, costo = EXCLUDED.costo, stock = EXCLUDED.stock, min_stock = EXCLUDED.min_stock, proveedor = EXCLUDED.proveedor, img = COALESCE(EXCLUDED.img, public.productos.img), estado = EXCLUDED.estado, descripcion = EXCLUDED.descripcion, destacado = EXCLUDED.destacado;`
      );
    }
    lines.push('');
  }

  if (customers.length > 0) {
    lines.push('-- Clientes');
    for (const c of customers) {
      const estado = c.estado === 'Inactivo' ? 'Inactivo' : 'Activo';
      lines.push(
        `INSERT INTO public.clientes (id, empresa_id, nombre, email, tel, ciudad, dir, estado) VALUES (${sqlStrReq(c.id)}, ${sqlStrReq(empresaId)}, ${sqlStrReq(c.nombre, 'Cliente')}, ${sqlStr(c.email)}, ${sqlStr(c.tel)}, ${sqlStr(c.ciudad)}, ${sqlStr(c.dir)}, ${sqlStrReq(estado)}) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, email = EXCLUDED.email, tel = EXCLUDED.tel, ciudad = EXCLUDED.ciudad, dir = EXCLUDED.dir, estado = EXCLUDED.estado;`
      );
    }
    lines.push('');
  }

  if (suppliers.length > 0) {
    lines.push('-- Proveedores');
    for (const s of suppliers) {
      const estado = s.estado === 'Inactivo' ? 'Inactivo' : 'Activo';
      lines.push(
        `INSERT INTO public.proveedores (id, empresa_id, empresa, nit, contacto, email, tel, cat, plazo, saldo, estado) VALUES (${sqlStrReq(s.id)}, ${sqlStrReq(empresaId)}, ${sqlStrReq(s.empresa, 'Proveedor')}, ${sqlStr(s.nit)}, ${sqlStr(s.contacto)}, ${sqlStr(s.email)}, ${sqlStr(s.tel)}, ${sqlStr(s.cat)}, ${sqlStrReq(s.plazo, '30 días')}, ${sqlNum(s.saldo, 0)}, ${sqlStrReq(estado)}) ON CONFLICT (id) DO UPDATE SET empresa = EXCLUDED.empresa, nit = EXCLUDED.nit, contacto = EXCLUDED.contacto, email = EXCLUDED.email, tel = EXCLUDED.tel, cat = EXCLUDED.cat, plazo = EXCLUDED.plazo, saldo = EXCLUDED.saldo, estado = EXCLUDED.estado;`
      );
    }
    lines.push('');
  }

  if (purchases.length > 0) {
    lines.push('-- Compras');
    for (const c of purchases) {
      const estado = c.estado === 'Recibida' ? 'Recibida' : 'Pendiente';
      const safeProdId = c.productoId && productIds.has(c.productoId) ? sqlStr(c.productoId) : 'NULL';
      const safeQty = Math.max(1, Number(c.qty) || 1);
      lines.push(
        `INSERT INTO public.compras (id, empresa_id, orden, proveedor, producto_id, producto, qty, costo, total, fecha, estado, notas) VALUES (${sqlStrReq(c.id)}, ${sqlStrReq(empresaId)}, ${sqlStrReq(c.orden, c.id)}, ${sqlStrReq(c.proveedor, 'Proveedor')}, ${safeProdId}, ${sqlStrReq(c.producto, 'Producto')}, ${sqlInt(safeQty, 1)}, ${sqlNum(c.costo, 0)}, ${sqlNum(c.total, 0)}, ${sqlDate(c.fecha)}, ${sqlStrReq(estado)}, ${sqlStr(c.notas)}) ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado, qty = EXCLUDED.qty, total = EXCLUDED.total, notas = EXCLUDED.notas;`
      );
    }
    lines.push('');
  }

  if (banners.length > 0) {
    lines.push('-- Banners');
    for (const b of banners) {
      const estado = b.estado === 'Inactivo' ? 'Inactivo' : 'Activo';
      lines.push(
        `INSERT INTO public.banners (id, empresa_id, titulo, subtitulo, img, cta, estado) VALUES (${sqlStrReq(b.id)}, ${sqlStrReq(empresaId)}, ${sqlStrReq(b.titulo, 'Banner')}, ${sqlStr(b.subtitulo)}, ${sqlImg(b.img)}, ${sqlStr(b.cta)}, ${sqlStrReq(estado)}) ON CONFLICT (id) DO UPDATE SET titulo = EXCLUDED.titulo, subtitulo = EXCLUDED.subtitulo, img = COALESCE(EXCLUDED.img, public.banners.img), cta = EXCLUDED.cta, estado = EXCLUDED.estado;`
      );
    }
    lines.push('');
  }

  if (sales.length > 0) {
    lines.push('-- Ventas');
    for (const v of sales) {
      const estado =
        v.estado === 'Pendiente' || v.estado === 'Cancelada' ? v.estado : 'Pagada';
      const origen = v.origen === 'Tienda Online' ? 'Tienda Online' : 'POS';
      lines.push(
        `INSERT INTO public.ventas (id, empresa_id, orden, cliente_id, cliente, producto_id, producto, items, precio, qty, descuento, total, costo_total, pago, fecha, hora, estado, transportadora, guia, vendedor, notas, origen) VALUES (${sqlStrReq(v.id)}, ${sqlStrReq(empresaId)}, ${sqlStrReq(v.orden, v.id)}, ${sqlStr(v.clienteId)}, ${sqlStrReq(v.cliente, 'Mostrador')}, ${sqlStr(v.productoId)}, ${sqlStrReq(v.producto, 'Producto')}, ${sqlJsonb(v.items || [])}, ${sqlNum(v.precio, 0)}, ${sqlInt(Math.max(1, v.qty || 1), 1)}, ${sqlNum(v.desc, 0)}, ${sqlNum(v.total, 0)}, ${sqlNum(v.costoTotal, 0)}, ${sqlStrReq(v.pago, 'Efectivo')}, ${sqlDate(v.fecha)}, ${sqlStr(v.hora)}, ${sqlStrReq(estado)}, ${sqlStr(v.transportadora)}, ${sqlStr(v.guia)}, ${sqlStr(v.vendedor)}, ${sqlStr(v.notas)}, ${sqlStrReq(origen)}) ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado, transportadora = EXCLUDED.transportadora, guia = EXCLUDED.guia, notas = EXCLUDED.notas;`
      );
    }
    lines.push('');
  }

  if (tickets.length > 0) {
    lines.push('-- Soporte');
    for (const t of tickets) {
      const prioridad =
        t.prioridad === 'Alta' || t.prioridad === 'Baja' ? t.prioridad : 'Media';
      const estado =
        t.estado === 'En Proceso' || t.estado === 'Resuelto' || t.estado === 'Cerrado'
          ? t.estado
          : 'Abierto';
      lines.push(
        `INSERT INTO public.soporte (id, empresa_id, asunto, mensaje, prioridad, estado, fecha, creado_por, respuesta) VALUES (${sqlStrReq(t.id)}, ${sqlStrReq(t.empresaId || empresaId)}, ${sqlStrReq(t.asunto, 'Soporte')}, ${sqlStrReq(t.mensaje, '')}, ${sqlStrReq(prioridad)}, ${sqlStrReq(estado)}, ${sqlDate(t.fecha)}, ${sqlStr(t.creadoPor)}, ${sqlStr(t.respuesta)}) ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado, respuesta = EXCLUDED.respuesta;`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
