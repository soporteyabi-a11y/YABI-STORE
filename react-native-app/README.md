# YA'BI Store — App Móvil Nativa (React Native + Expo)

Aplicación móvil nativa para iOS y Android con **POS con cámara SKU/QR**, **Ventas/Guías**, **Inventario**, **Compras atómicas**, **Clientes y Proveedores**, **Banners Web**, **Reportes omnicanal** y **Soporte**.

## Conectar con tu proyecto de Supabase
1. Copia `.env.example` a `.env` dentro de `/react-native-app`:
   ```bash
   cp .env.example .env
   ```
2. Completa tus credenciales públicas de Supabase:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-publica
   ```
   *(Si estas variables están vacías, la app móvil opera automáticamente contra el proyecto Firebase `yabi-store`).*

## Ejecutar en tu teléfono o emulador
```bash
cd react-native-app
npm install
npx expo start
```
Escanea el código QR con **Expo Go** (Android/iOS) o compila un APK/AAB nativo con `eas build -p android`.
