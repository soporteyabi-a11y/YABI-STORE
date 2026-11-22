-- ============================================================================
-- YA'BI STORE — Esquema PostgreSQL para Supabase (Tienda Física POS + Online)
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Empresas
CREATE TABLE IF NOT EXISTS public.empresas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  nit TEXT,
  ciudad TEXT,
  telefono TEXT,
  iva NUMERIC(5,2) NOT NULL DEFAULT 19,
  plan TEXT NOT NULL DEFAULT 'Pro',
  color TEXT DEFAULT '#00C8FF',
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Usuarios / Empleados (vinculado a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.usuarios (
  uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id TEXT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('superadmin', 'admin', 'vendedor', 'bodega')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Productos
CREATE TABLE IF NOT EXISTS public.productos (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  sku TEXT NOT NULL,
  cat TEXT NOT NULL DEFAULT 'General',
  precio NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  proveedor TEXT,
  img TEXT,
  estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  descripcion TEXT,
  destacado BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT,
  tel TEXT,
  ciudad TEXT,
  dir TEXT,
  estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Proveedores
CREATE TABLE IF NOT EXISTS public.proveedores (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  empresa TEXT NOT NULL,
  nit TEXT,
  contacto TEXT,
  email TEXT,
  tel TEXT,
  cat TEXT,
  plazo TEXT DEFAULT '30 días',
  saldo NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Compras
CREATE TABLE IF NOT EXISTS public.compras (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  orden TEXT NOT NULL,
  proveedor TEXT NOT NULL,
  producto_id TEXT REFERENCES public.productos(id) ON DELETE SET NULL,
  producto TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  costo NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Recibida')),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Banners Tienda Online
CREATE TABLE IF NOT EXISTS public.banners (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  img TEXT,
  cta TEXT,
  estado TEXT NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Ventas (Tienda Física POS + Tienda Online)
CREATE TABLE IF NOT EXISTS public.ventas (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  orden TEXT NOT NULL,
  cliente_id TEXT,
  cliente TEXT NOT NULL,
  producto_id TEXT,
  producto TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  precio NUMERIC(12,2) NOT NULL DEFAULT 0,
  qty INTEGER NOT NULL DEFAULT 1,
  descuento NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_total NUMERIC(12,2) DEFAULT 0,
  pago TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TEXT,
  estado TEXT NOT NULL DEFAULT 'Pagada' CHECK (estado IN ('Pagada', 'Pendiente', 'Cancelada')),
  transportadora TEXT,
  guia TEXT,
  vendedor TEXT,
  notas TEXT,
  origen TEXT NOT NULL DEFAULT 'POS' CHECK (origen IN ('POS', 'Tienda Online')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Tickets de Soporte
CREATE TABLE IF NOT EXISTS public.soporte (
  id TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  asunto TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  prioridad TEXT NOT NULL DEFAULT 'Media' CHECK (prioridad IN ('Alta', 'Media', 'Baja')),
  estado TEXT NOT NULL DEFAULT 'Abierto' CHECK (estado IN ('Abierto', 'En Proceso', 'Resuelto', 'Cerrado')),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  creado_por TEXT,
  respuesta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_productos_empresa_sku ON public.productos (empresa_id, sku);
CREATE INDEX IF NOT EXISTS idx_ventas_empresa_fecha ON public.ventas (empresa_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_compras_empresa_fecha ON public.compras (empresa_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_soporte_empresa ON public.soporte (empresa_id);

-- ============================================================================
-- Funciones Atómicas (equivalentes a Firestore writeBatch)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.registrar_venta_pos(
  p_venta JSONB,
  p_stock_updates JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item JSONB;
BEGIN
  INSERT INTO public.ventas (
    id, empresa_id, orden, cliente_id, cliente, producto_id, producto,
    items, precio, qty, descuento, total, costo_total, pago, fecha, hora,
    estado, transportadora, guia, vendedor, notas, origen
  ) VALUES (
    p_venta->>'id',
    p_venta->>'empresa_id',
    p_venta->>'orden',
    p_venta->>'cliente_id',
    p_venta->>'cliente',
    p_venta->>'producto_id',
    p_venta->>'producto',
    COALESCE(p_venta->'items', '[]'::jsonb),
    COALESCE((p_venta->>'precio')::numeric, 0),
    COALESCE((p_venta->>'qty')::integer, 1),
    COALESCE((p_venta->>'descuento')::numeric, 0),
    COALESCE((p_venta->>'total')::numeric, 0),
    COALESCE((p_venta->>'costo_total')::numeric, 0),
    p_venta->>'pago',
    COALESCE((p_venta->>'fecha')::date, CURRENT_DATE),
    p_venta->>'hora',
    COALESCE(p_venta->>'estado', 'Pagada'),
    p_venta->>'transportadora',
    p_venta->>'guia',
    p_venta->>'vendedor',
    p_venta->>'notas',
    COALESCE(p_venta->>'origen', 'POS')
  )
  ON CONFLICT (id) DO UPDATE SET
    estado = EXCLUDED.estado,
    transportadora = EXCLUDED.transportadora,
    guia = EXCLUDED.guia;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(p_stock_updates, '[]'::jsonb))
  LOOP
    UPDATE public.productos
    SET stock = GREATEST(0, (item->>'stock')::integer),
        updated_at = now()
    WHERE id = item->>'id'
      AND empresa_id = p_venta->>'empresa_id';
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.recibir_compra(
  p_empresa_id TEXT,
  p_compra_id TEXT,
  p_producto_id TEXT,
  p_nuevo_stock INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.compras
  SET estado = 'Recibida'
  WHERE id = p_compra_id AND empresa_id = p_empresa_id;

  UPDATE public.productos
  SET stock = GREATEST(0, p_nuevo_stock),
      updated_at = now()
  WHERE id = p_producto_id AND empresa_id = p_empresa_id;
END;
$$;

-- ============================================================================
-- Row Level Security (RLS) Multi-Empresa
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_empresa_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT empresa_id FROM public.usuarios WHERE uid = auth.uid() LIMIT 1;
$$;

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soporte ENABLE ROW LEVEL SECURITY;

-- Catálogo público en Tienda Online (lectura anónima de productos y banners activos)
CREATE POLICY "Catalogo publico productos" ON public.productos
  FOR SELECT USING (estado = 'Activo' OR empresa_id = public.current_user_empresa_id());

CREATE POLICY "Catalogo publico banners" ON public.banners
  FOR SELECT USING (estado = 'Activo' OR empresa_id = public.current_user_empresa_id());

-- Políticas por empresa autenticada
CREATE POLICY "Acceso empresa propia" ON public.empresas
  FOR ALL USING (id = public.current_user_empresa_id());

CREATE POLICY "Acceso usuarios empresa" ON public.usuarios
  FOR SELECT USING (empresa_id = public.current_user_empresa_id() OR uid = auth.uid());

CREATE POLICY "Gestion productos empresa" ON public.productos
  FOR ALL USING (empresa_id = public.current_user_empresa_id());

CREATE POLICY "Gestion clientes empresa" ON public.clientes
  FOR ALL USING (empresa_id = public.current_user_empresa_id());

CREATE POLICY "Gestion proveedores empresa" ON public.proveedores
  FOR ALL USING (empresa_id = public.current_user_empresa_id());

CREATE POLICY "Gestion compras empresa" ON public.compras
  FOR ALL USING (empresa_id = public.current_user_empresa_id());

CREATE POLICY "Gestion banners empresa" ON public.banners
  FOR ALL USING (empresa_id = public.current_user_empresa_id());

CREATE POLICY "Gestion ventas empresa" ON public.ventas
  FOR ALL USING (empresa_id = public.current_user_empresa_id());

CREATE POLICY "Gestion soporte empresa" ON public.soporte
  FOR ALL USING (empresa_id = public.current_user_empresa_id());

-- Habilitar Realtime (equivalente a onSnapshot)
ALTER PUBLICATION supabase_realtime ADD TABLE public.productos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ventas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.compras;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.proveedores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.banners;
ALTER PUBLICATION supabase_realtime ADD TABLE public.soporte;
