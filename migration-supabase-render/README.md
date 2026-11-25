# Migración YA'BI Store: Firebase -> Supabase + Render

## Paso 1: Ejecutar el esquema SQL en tu repositorio/proyecto de Supabase
1. Entra a tu proyecto en Supabase -> **SQL Editor** -> **New query**.
2. Pega y ejecuta completo el archivo `supabase_schema.sql` (incluye las 9 tablas, políticas RLS por empresa, funciones atómicas `registrar_venta_pos` / `recibir_compra`, Realtime y el bucket público `yabi-media`).
3. Crea tu cuenta de propietario directamente desde la app (**Conectar cuenta -> Registrar mi tienda (Dueño)**) o manualmente en **Authentication -> Users -> Add user** vinculando tu `uid` como `superadmin` con `plan = 'Oro'`:
   ```sql
   INSERT INTO public.empresas (id, nombre, ciudad, iva, plan)
   VALUES ('EMP001', 'DIGITAL YA''BI', 'Cali', 0, 'Oro')
   ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, plan = 'Oro';

   INSERT INTO public.usuarios (uid, empresa_id, nombre, email, rol)
   VALUES ('PEGAR_UUID_DE_AUTH_USERS', 'EMP001', 'Propietario', 'tu@correo.com', 'superadmin');
   ```

## Paso 2: Importar datos actuales desde Firebase
1. En la app web ve a **Configuración -> Exportar JSON completo**.
2. Copia `.env.example` a `.env` dentro de `/migration-supabase-render` y completa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
3. Ejecuta:
   ```bash
   cd migration-supabase-render
   npm install
   node import_yabi_json.mjs ../ruta/yabi-store-backup-supabase-EMP001.json
   ```

## Paso 3: Conectar Frontend + API en Render
1. **API Backend (Render Web Service)**: usa `render.yaml` (`rootDir: migration-supabase-render`) y define `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGIN`, `RESEND_API_KEY`, `WOMPI_INTEGRITY_SECRET`.
2. **Frontend Web (Vite / Render Static Site)**: configura en tus variables de entorno del build:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_RENDER_API_URL` (URL del Web Service en Render)
   Al detectar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, la web cambia automáticamente de Firebase (`yabi-store`) a **Supabase Auth + Postgres + Realtime + Storage (`yabi-media`)**.
