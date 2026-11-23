# YA'BI Store — App Móvil Nativa (React Native + Expo)

Aplicación móvil nativa para iOS y Android conectada en tiempo real con **Supabase** (o Firebase `yabi-store`) con:
- **POS móvil con cámara SKU/QR**, descuento, cálculo de cambio en efectivo y **comprobante compartible por WhatsApp** (`No responsable de IVA` o `Responsable de IVA`).
- **Ventas y Despachos** (guías de envío, estado y reenvío de comprobante).
- **Inventario con cámara** y ajuste rápido de stock.
- **Compras atómicas** (`recibir_compra`).
- **Clientes y Proveedores**, **Banners Web**, **Reportes omnicanal**, **Soporte** y **Datos Fiscales**.

## Paso 1: Configurar `.env` con Supabase
1. Entra a `/react-native-app` y copia `.env.example` a `.env`:
   ```bash
   cd react-native-app
   cp .env.example .env
   ```
2. Completa tus mismas variables públicas de Supabase:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-publica
   ```
   *(Si estas variables se dejan vacías, la app móvil opera automáticamente contra Firebase `yabi-store`).*

## Paso 2: Probar en tu teléfono con Expo Go
```bash
cd react-native-app
npm install
npx expo start
```
Escanea el código QR con la app **Expo Go** (Android o iOS) conectada a la misma red Wi-Fi (o usa `npx expo start --tunnel` si estás en redes distintas).

## Paso 3: Generar APK instalable para Android (EAS Build)
```bash
npm install -g eas-cli
eas login
cd react-native-app
eas build -p android --profile preview
```
Al terminar la compilación en la nube, Expo te entrega un enlace/QR para descargar e instalar el `.apk` directo en tu celular Android.
