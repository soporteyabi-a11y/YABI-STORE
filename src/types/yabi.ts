export type AppTab =
  | 'dashboard'
  | 'team'
  | 'customers'
  | 'inventory'
  | 'suppliers'
  | 'banners'
  | 'sales'
  | 'purchases'
  | 'pos'
  | 'reports'
  | 'subscription'
  | 'config'
  | 'support'
  | 'storefront';

export type PaymentMethod = 'Efectivo' | 'Nequi' | 'Tarjeta' | 'Wompi' | 'PSE';

export interface Product {
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
  desc?: string;
  destacado?: boolean;
}

export interface Customer {
  id: string;
  nombre: string;
  email: string;
  tel: string;
  ciudad: string;
  dir: string;
  estado: 'Activo' | 'Inactivo';
}

export interface Supplier {
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

export interface Purchase {
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

export interface StoreBanner {
  id: string;
  titulo: string;
  subtitulo: string;
  img: string;
  cta?: string;
  estado: 'Activo' | 'Inactivo';
}

export interface SaleItem {
  productoId: string;
  nombre: string;
  sku: string;
  precio: number;
  costo: number;
  qty: number;
}

export interface Sale {
  id: string;
  orden: string;
  clienteId?: string;
  cliente: string;
  productoId: string;
  producto: string;
  items?: SaleItem[];
  precio: number;
  qty: number;
  desc: number;
  total: number;
  costoTotal?: number;
  pago: PaymentMethod;
  fecha: string;
  hora?: string;
  estado: 'Pagada' | 'Pendiente' | 'Cancelada';
  transportadora?: string;
  guia?: string;
  vendedor?: string;
  notas?: string;
  origen?: 'POS' | 'Tienda Online';
  pendingSync?: boolean;
}

export interface SupportTicket {
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

export interface EmailLog {
  id: string;
  para: string;
  asunto: string;
  tipo: 'Recibo' | 'Alerta' | 'Soporte';
  fecha: string;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export interface UserProfile {
  uid: string;
  id?: string;
  nombre: string;
  email: string;
  rol: 'superadmin' | 'admin' | 'vendedor' | 'bodega';
  empresaId: string;
}

export interface EmpresaConfig {
  id: string;
  nombre: string;
  nit?: string;
  ciudad?: string;
  telefono?: string;
  iva?: number;
  plan?: 'Básico' | 'Plata' | 'Pro' | 'Oro';
  color?: string;
  activa?: boolean;
}

export interface ToastMessage {
  id: string;
  text: string;
  tone: 'success' | 'info' | 'error';
}
