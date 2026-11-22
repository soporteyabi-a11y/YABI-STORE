# Migración YA'BI Store: Firebase -> Supabase + Render

## Paso 1: Crear base de datos en Supabase
1. Abre tu proyecto en Supabase -> **SQL Editor**.
2. Pega y ejecuta el contenido completo de `supabase_schema.sql`.
3. Crea al menos un usuario administrador en **Authentication -> Users** y regístralo en la tabla `public.usuarios` con su `uid` y `empresa_id` (`EMP001`).

## Paso 2: Importar datos actuales desde Firebase
1. En la web de YA'BI Store ve a **Configuración -> Exportar JSON completo**.
2. Copia el archivo `.env.example` a `.env` y completa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
3. Ejecuta:
   ```bash
   cd migration-supabase-render
   npm install
   node import_yabi_json.mjs ../ruta/yabi-store-backup-supabase-EMP001.json
   ```

## Paso 3: Desplegar API en Render
- Conecta este repositorio en Render usando el archivo `render.yaml` (`rootDir: migration-supabase-render`).
- Configura las variables de entorno en Render (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGIN`, `RESEND_API_KEY`, `WOMPI_INTEGRITY_SECRET`).
