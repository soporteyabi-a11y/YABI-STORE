-- ============================================================================
-- YA'BI STORE — Esquema PostgreSQL para Supabase (Tienda Física POS + Online)
-- Ejecutar completo en Supabase -> SQL Editor
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Empresas
CREATE TABLE IF NOT EXISTS public.empresas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  nit TEXT,
  direccion TEXT,
  ciudad TEXT,
  telefono TEXT,
  iva NUMERIC(5,2) NOT NULL DEFAULT 0,
  plan TEXT NOT NULL DEFAULT 'Pro',
  color TEXT DEFAULT '#00C8FF',
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS direccion TEXT;

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
-- Helpers RLS Multi-Empresa
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_empresa_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.usuarios WHERE uid = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios WHERE uid = auth.uid() AND rol = 'superadmin'
  );
$$;

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
SET search_path = public
AS $$
DECLARE
  v_empresa_id TEXT := p_venta->>'empresa_id';
  v_origen TEXT := COALESCE(p_venta->>'origen', 'POS');
  item JSONB;
BEGIN
  IF v_empresa_id IS NULL OR length(trim(v_empresa_id)) = 0 THEN
    RAISE EXCEPTION 'empresa_id requerido';
  END IF;

  -- Si hay sesión iniciada, exigir pertenencia a la empresa (salvo superadmin)
  IF auth.uid() IS NOT NULL THEN
    IF NOT public.is_superadmin() AND v_empresa_id IS DISTINCT FROM public.current_user_empresa_id() THEN
      RAISE EXCEPTION 'No autorizado para operar en esta empresa';
    END IF;
  ELSIF v_origen <> 'Tienda Online' THEN
    RAISE EXCEPTION 'Autenticación requerida para ventas POS';
  END IF;

  INSERT INTO public.ventas (
    id, empresa_id, orden, cliente_id, cliente, producto_id, producto,
    items, precio, qty, descuento, total, costo_total, pago, fecha, hora,
    estado, transportadora, guia, vendedor, notas, origen
  ) VALUES (
    p_venta->>'id',
    v_empresa_id,
    p_venta->>'orden',
    p_venta->>'cliente_id',
    p_venta->>'cliente',
    p_venta->>'producto_id',
    p_venta->>'producto',
    COALESCE(p_venta->'items', '[]'::jsonb),
    GREATEST(0, COALESCE((p_venta->>'precio')::numeric, 0)),
    GREATEST(1, COALESCE((p_venta->>'qty')::integer, 1)),
    GREATEST(0, COALESCE((p_venta->>'descuento')::numeric, 0)),
    GREATEST(0, COALESCE((p_venta->>'total')::numeric, 0)),
    GREATEST(0, COALESCE((p_venta->>'costo_total')::numeric, 0)),
    p_venta->>'pago',
    COALESCE((p_venta->>'fecha')::date, CURRENT_DATE),
    p_venta->>'hora',
    COALESCE(p_venta->>'estado', 'Pagada'),
    p_venta->>'transportadora',
    p_venta->>'guia',
    p_venta->>'vendedor',
    p_venta->>'notas',
    v_origen
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
      AND empresa_id = v_empresa_id;
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
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR (NOT public.is_superadmin() AND p_empresa_id IS DISTINCT FROM public.current_user_empresa_id()) THEN
    RAISE EXCEPTION 'No autorizado para recibir compras en esta empresa';
  END IF;

  UPDATE public.compras
  SET estado = 'Recibida'
  WHERE id = p_compra_id AND empresa_id = p_empresa_id;

  UPDATE public.productos
  SET stock = GREATEST(0, p_nuevo_stock),
      updated_at = now()
  WHERE id = p_producto_id AND empresa_id = p_empresa_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_dueno_yabi(
  p_empresa_id TEXT DEFAULT 'EMP001',
  p_nombre_tienda TEXT DEFAULT 'DIGITAL YA''BI',
  p_nombre_dueno TEXT DEFAULT 'Propietario',
  p_nit TEXT DEFAULT NULL,
  p_direccion TEXT DEFAULT NULL,
  p_ciudad TEXT DEFAULT NULL,
  p_telefono TEXT DEFAULT NULL,
  p_iva NUMERIC DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_emp_id TEXT := COALESCE(NULLIF(trim(p_empresa_id), ''), 'EMP001');
  v_tienda TEXT := COALESCE(NULLIF(trim(p_nombre_tienda), ''), 'DIGITAL YA''BI');
  v_dueno TEXT := COALESCE(NULLIF(trim(p_nombre_dueno), ''), 'Propietario');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión primero para registrar la tienda.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.usuarios WHERE rol = 'superadmin' AND uid <> v_uid) THEN
    RAISE EXCEPTION 'Ya existe un propietario principal registrado en YA''BI Store.';
  END IF;

  SELECT COALESCE(
    (SELECT email FROM auth.users WHERE id = v_uid),
    NULLIF(trim(COALESCE(auth.jwt() ->> 'email', '')), '')
  ) INTO v_email;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No se encontró el correo del usuario autenticado.';
  END IF;

  INSERT INTO public.empresas (id, nombre, nit, direccion, ciudad, telefono, iva, plan, color, activa)
  VALUES (
    v_emp_id,
    v_tienda,
    NULLIF(trim(COALESCE(p_nit, '')), ''),
    NULLIF(trim(COALESCE(p_direccion, '')), ''),
    NULLIF(trim(COALESCE(p_ciudad, '')), ''),
    NULLIF(trim(COALESCE(p_telefono, '')), ''),
    COALESCE(p_iva, 0),
    'Oro',
    '#00C8FF',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    nit = COALESCE(EXCLUDED.nit, public.empresas.nit),
    direccion = COALESCE(EXCLUDED.direccion, public.empresas.direccion),
    ciudad = COALESCE(EXCLUDED.ciudad, public.empresas.ciudad),
    telefono = COALESCE(EXCLUDED.telefono, public.empresas.telefono),
    iva = EXCLUDED.iva,
    plan = 'Oro',
    activa = true;

  INSERT INTO public.usuarios (uid, empresa_id, nombre, email, rol)
  VALUES (v_uid, v_emp_id, v_dueno, v_email, 'superadmin')
  ON CONFLICT (uid) DO UPDATE SET
    empresa_id = EXCLUDED.empresa_id,
    nombre = EXCLUDED.nombre,
    email = EXCLUDED.email,
    rol = 'superadmin';
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_dueno_yabi(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;

CREATE OR REPLACE FUNCTION public.registrar_suscriptor_yabi(
  p_nombre_tienda TEXT,
  p_nombre_admin TEXT,
  p_plan TEXT DEFAULT 'Pro',
  p_nit TEXT DEFAULT NULL,
  p_direccion TEXT DEFAULT NULL,
  p_ciudad TEXT DEFAULT NULL,
  p_telefono TEXT DEFAULT NULL,
  p_iva NUMERIC DEFAULT 0
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
  v_existing_emp TEXT;
  v_emp_id TEXT;
  v_next_num INTEGER;
  v_plan TEXT := CASE
    WHEN p_plan IN ('Básico', 'Plata', 'Pro', 'Oro') THEN p_plan
    ELSE 'Pro'
  END;
  v_tienda TEXT := NULLIF(trim(COALESCE(p_nombre_tienda, '')), '');
  v_admin TEXT := COALESCE(NULLIF(trim(COALESCE(p_nombre_admin, '')), ''), 'Administrador');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión primero para registrar tu tienda.';
  END IF;

  IF v_tienda IS NULL THEN
    RAISE EXCEPTION 'Nombre de tienda requerido.';
  END IF;

  SELECT empresa_id INTO v_existing_emp FROM public.usuarios WHERE uid = v_uid;
  IF v_existing_emp IS NOT NULL THEN
    RETURN v_existing_emp;
  END IF;

  SELECT COALESCE(
    (SELECT email FROM auth.users WHERE id = v_uid),
    NULLIF(trim(COALESCE(auth.jwt() ->> 'email', '')), '')
  ) INTO v_email;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No se encontró el correo del usuario autenticado.';
  END IF;

  SELECT COALESCE(MAX((regexp_match(id, '^EMP(\d+)$'))[1]::integer), 1) + 1
  INTO v_next_num
  FROM public.empresas
  WHERE id ~ '^EMP\d+$';

  v_emp_id := 'EMP' || lpad(GREATEST(2, v_next_num)::text, 3, '0');

  INSERT INTO public.empresas (id, nombre, nit, direccion, ciudad, telefono, iva, plan, color, activa)
  VALUES (
    v_emp_id,
    v_tienda,
    NULLIF(trim(COALESCE(p_nit, '')), ''),
    NULLIF(trim(COALESCE(p_direccion, '')), ''),
    NULLIF(trim(COALESCE(p_ciudad, '')), ''),
    NULLIF(trim(COALESCE(p_telefono, '')), ''),
    COALESCE(p_iva, 0),
    v_plan,
    '#00C8FF',
    true
  );

  INSERT INTO public.usuarios (uid, empresa_id, nombre, email, rol)
  VALUES (v_uid, v_emp_id, v_admin, v_email, 'admin');

  RETURN v_emp_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_suscriptor_yabi(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;

-- ============================================================================
-- Row Level Security (RLS) Multi-Empresa
-- ============================================================================

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soporte ENABLE ROW LEVEL SECURITY;

-- Catálogo público en Tienda Online (lectura anónima de empresas, productos y banners activos)
DROP POLICY IF EXISTS "Lectura publica empresa storefront" ON public.empresas;
CREATE POLICY "Lectura publica empresa storefront" ON public.empresas
  FOR SELECT USING (activa = true OR id = public.current_user_empresa_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "Catalogo publico productos" ON public.productos;
CREATE POLICY "Catalogo publico productos" ON public.productos
  FOR SELECT USING (estado = 'Activo' OR empresa_id = public.current_user_empresa_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "Catalogo publico banners" ON public.banners;
CREATE POLICY "Catalogo publico banners" ON public.banners
  FOR SELECT USING (estado = 'Activo' OR empresa_id = public.current_user_empresa_id() OR public.is_superadmin());

-- Políticas por empresa autenticada
DROP POLICY IF EXISTS "Acceso empresa propia" ON public.empresas;
CREATE POLICY "Acceso empresa propia" ON public.empresas
  FOR ALL USING (id = public.current_user_empresa_id() OR public.is_superadmin())
  WITH CHECK (id = public.current_user_empresa_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "Acceso usuarios empresa" ON public.usuarios;
CREATE POLICY "Acceso usuarios empresa" ON public.usuarios
  FOR SELECT USING (empresa_id = public.current_user_empresa_id() OR uid = auth.uid() OR public.is_superadmin());

DROP POLICY IF EXISTS "Gestion productos empresa" ON public.productos;
CREATE POLICY "Gestion productos empresa" ON public.productos
  FOR ALL USING (empresa_id = public.current_user_empresa_id() OR public.is_superadmin())
  WITH CHECK (empresa_id = public.current_user_empresa_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "Gestion clientes empresa" ON public.clientes;
CREATE POLICY "Gestion clientes empresa" ON public.clientes
  FOR ALL USING (empresa_id = public.current_user_empresa_id() OR public.is_superadmin())
  WITH CHECK (empresa_id = public.current_user_empresa_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "Gestion proveedores empresa" ON public.proveedores;
CREATE POLICY "Gestion proveedores empresa" ON public.proveedores
  FOR ALL USING (empresa_id = public.current_user_empresa_id() OR public.is_superadmin())
  WITH CHECK (empresa_id = public.current_user_empresa_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "Gestion compras empresa" ON public.compras;
CREATE POLICY "Gestion compras empresa" ON public.compras
  FOR ALL USING (empresa_id = public.current_user_empresa_id() OR public.is_superadmin())
  WITH CHECK (empresa_id = public.current_user_empresa_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "Gestion banners empresa" ON public.banners;
CREATE POLICY "Gestion banners empresa" ON public.banners
  FOR ALL USING (empresa_id = public.current_user_empresa_id() OR public.is_superadmin())
  WITH CHECK (empresa_id = public.current_user_empresa_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "Gestion ventas empresa" ON public.ventas;
CREATE POLICY "Gestion ventas empresa" ON public.ventas
  FOR ALL USING (empresa_id = public.current_user_empresa_id() OR public.is_superadmin())
  WITH CHECK (empresa_id = public.current_user_empresa_id() OR public.is_superadmin());

DROP POLICY IF EXISTS "Gestion soporte empresa" ON public.soporte;
CREATE POLICY "Gestion soporte empresa" ON public.soporte
  FOR ALL USING (empresa_id = public.current_user_empresa_id() OR public.is_superadmin())
  WITH CHECK (empresa_id = public.current_user_empresa_id() OR public.is_superadmin());

-- ============================================================================
-- Storage Bucket para Productos y Banners (yabi-media)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('yabi-media', 'yabi-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Lectura publica media yabi" ON storage.objects;
CREATE POLICY "Lectura publica media yabi" ON storage.objects
  FOR SELECT USING (bucket_id = 'yabi-media');

DROP POLICY IF EXISTS "Subida media empresa yabi" ON storage.objects;
CREATE POLICY "Subida media empresa yabi" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'yabi-media'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_superadmin()
      OR (storage.foldername(name))[1] = 'empresas' AND (storage.foldername(name))[2] = public.current_user_empresa_id()
    )
  );

DROP POLICY IF EXISTS "Eliminacion media empresa yabi" ON storage.objects;
CREATE POLICY "Eliminacion media empresa yabi" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'yabi-media'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_superadmin()
      OR (storage.foldername(name))[1] = 'empresas' AND (storage.foldername(name))[2] = public.current_user_empresa_id()
    )
  );

-- Habilitar Realtime (equivalente a onSnapshot)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['empresas','productos','ventas','compras','clientes','proveedores','banners','soporte','usuarios']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;
