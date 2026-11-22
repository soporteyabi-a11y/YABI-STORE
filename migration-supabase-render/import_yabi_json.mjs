import fs from 'node:fs';
import path from 'node:path';
import {createClient} from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const inputFile = process.argv[2];

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.');
  process.exit(1);
}

if (!inputFile) {
  console.error('Uso: node import_yabi_json.mjs <ruta-del-archivo-backup.json>');
  process.exit(1);
}

const raw = fs.readFileSync(path.resolve(inputFile), 'utf8');
const backup = JSON.parse(raw);
const empresa = backup.empresa;
const cols = backup.collections || {};
const empresaId = empresa?.id || 'EMP001';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {autoRefreshToken: false, persistSession: false},
});

async function run() {
  console.log(`Iniciando migración a Supabase para empresa ${empresaId} (${empresa?.nombre})...`);

  if (empresa) {
    const {error} = await supabase.from('empresas').upsert({
      id: empresa.id,
      nombre: empresa.nombre,
      nit: empresa.nit || null,
      ciudad: empresa.ciudad || null,
      telefono: empresa.telefono || null,
      iva: Number(empresa.iva ?? 19),
      plan: empresa.plan || 'Pro',
      color: empresa.color || '#00C8FF',
      activa: empresa.activa !== false,
    });
    if (error) throw error;
    console.log('✓ Empresa sincronizada');
  }

  const productos = (cols.productos || []).map((p) => ({
    id: p.id,
    empresa_id: empresaId,
    nombre: p.nombre,
    sku: p.sku,
    cat: p.cat || 'General',
    precio: Number(p.precio) || 0,
    costo: Number(p.costo) || 0,
    stock: Number(p.stock) || 0,
    min_stock: Number(p.minStock ?? 5),
    proveedor: p.proveedor || null,
    img: p.img || null,
    estado: p.estado || 'Activo',
    descripcion: p.desc || null,
    destacado: Boolean(p.destacado),
  }));
  if (productos.length) {
    const {error} = await supabase.from('productos').upsert(productos);
    if (error) throw error;
    console.log(`✓ ${productos.length} productos migrados`);
  }

  const clientes = (cols.clientes || []).map((c) => ({
    id: c.id,
    empresa_id: empresaId,
    nombre: c.nombre,
    email: c.email || null,
    tel: c.tel || null,
    ciudad: c.ciudad || null,
    dir: c.dir || null,
    estado: c.estado || 'Activo',
  }));
  if (clientes.length) {
    const {error} = await supabase.from('clientes').upsert(clientes);
    if (error) throw error;
    console.log(`✓ ${clientes.length} clientes migrados`);
  }

  const proveedores = (cols.proveedores || []).map((s) => ({
    id: s.id,
    empresa_id: empresaId,
    empresa: s.empresa,
    nit: s.nit || null,
    contacto: s.contacto || null,
    email: s.email || null,
    tel: s.tel || null,
    cat: s.cat || null,
    plazo: s.plazo || '30 días',
    saldo: Number(s.saldo) || 0,
    estado: s.estado || 'Activo',
  }));
  if (proveedores.length) {
    const {error} = await supabase.from('proveedores').upsert(proveedores);
    if (error) throw error;
    console.log(`✓ ${proveedores.length} proveedores migrados`);
  }

  const compras = (cols.compras || []).map((c) => ({
    id: c.id,
    empresa_id: empresaId,
    orden: c.orden,
    proveedor: c.proveedor,
    producto_id: c.productoId || null,
    producto: c.producto,
    qty: Number(c.qty) || 1,
    costo: Number(c.costo) || 0,
    total: Number(c.total) || 0,
    fecha: c.fecha,
    estado: c.estado || 'Pendiente',
    notas: c.notas || null,
  }));
  if (compras.length) {
    const {error} = await supabase.from('compras').upsert(compras);
    if (error) throw error;
    console.log(`✓ ${compras.length} compras migradas`);
  }

  const banners = (cols.banners || []).map((b) => ({
    id: b.id,
    empresa_id: empresaId,
    titulo: b.titulo,
    subtitulo: b.subtitulo || null,
    img: b.img || null,
    cta: b.cta || null,
    estado: b.estado || 'Activo',
  }));
  if (banners.length) {
    const {error} = await supabase.from('banners').upsert(banners);
    if (error) throw error;
    console.log(`✓ ${banners.length} banners migrados`);
  }

  const ventas = (cols.ventas || []).map((v) => ({
    id: v.id,
    empresa_id: empresaId,
    orden: v.orden,
    cliente_id: v.clienteId || null,
    cliente: v.cliente,
    producto_id: v.productoId || null,
    producto: v.producto,
    items: v.items || [],
    precio: Number(v.precio) || 0,
    qty: Number(v.qty) || 1,
    descuento: Number(v.desc) || 0,
    total: Number(v.total) || 0,
    costo_total: Number(v.costoTotal) || 0,
    pago: v.pago,
    fecha: v.fecha,
    hora: v.hora || null,
    estado: v.estado || 'Pagada',
    transportadora: v.transportadora || null,
    guia: v.guia || null,
    vendedor: v.vendedor || null,
    notas: v.notas || null,
    origen: v.origen || 'POS',
  }));
  if (ventas.length) {
    const {error} = await supabase.from('ventas').upsert(ventas);
    if (error) throw error;
    console.log(`✓ ${ventas.length} ventas migradas`);
  }

  const soporte = (cols.soporte || []).map((t) => ({
    id: t.id,
    empresa_id: t.empresaId || empresaId,
    asunto: t.asunto,
    mensaje: t.mensaje,
    prioridad: t.prioridad || 'Media',
    estado: t.estado || 'Abierto',
    fecha: t.fecha,
    creado_por: t.creadoPor || null,
    respuesta: t.respuesta || null,
  }));
  if (soporte.length) {
    const {error} = await supabase.from('soporte').upsert(soporte);
    if (error) throw error;
    console.log(`✓ ${soporte.length} tickets de soporte migrados`);
  }

  console.log('Migración completada con éxito.');
}

run().catch((err) => {
  console.error('Error durante la migración:', err);
  process.exit(1);
});
