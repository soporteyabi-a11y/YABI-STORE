import React, {useEffect, useState} from 'react';
import {
  Check,
  Copy,
  Database,
  Download,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  RefreshCw,
  Smartphone,
  Sun,
} from 'lucide-react';
import {activeBackend} from '../services/yabiDb';
import {renderApiUrl} from '../services/supabaseClient';
import {buildFullSupabaseSql} from '../utils/supabaseSqlExport';
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

interface MobileNativeHubViewProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  empresa: EmpresaConfig;
  userProfile: UserProfile | null;
  dataSource: 'firebase' | 'local';
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  purchases: Purchase[];
  sales: Sale[];
  banners: StoreBanner[];
  employees: UserProfile[];
  tickets: SupportTicket[];
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  onInstallPWA: () => Promise<boolean>;
  onSaveEmpresa: (empresa: EmpresaConfig) => Promise<void>;
  onOpenAuth: () => void;
  onLogout: () => Promise<void>;
  onResetDemo: () => void;
  onNotify: (msg: string, tone?: 'success' | 'info' | 'error') => void;
}

const RN_SNIPPETS: {id: string; title: string; path: string; code: string}[] = [
  {
    id: 'supabase-rn',
    title: 'Configuración Supabase Nativa (Expo + AsyncStorage)',
    path: 'react-native-app/src/config/supabase.ts',
    code: `import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

export const isRnSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseRn = isRnSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;`,
  },
  {
    id: 'firebase',
    title: 'Respaldo Firebase Nativa (onSnapshot + AsyncStorage)',
    path: 'react-native-app/src/config/firebase.ts',
    code: `import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: "AIzaSyBN43iwLvZeMK8Mqc-9Cgvgit--sfys2NY",
  authDomain: "yabi-store.firebaseapp.com",
  databaseURL: "https://yabi-store-default-rtdb.firebaseio.com",
  projectId: "yabi-store",
  storageBucket: "yabi-store.firebasestorage.app",
  messagingSenderId: "944408167941",
  appId: "1:944408167941:web:f6b381be1eab30ef6c3e6c",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);`,
  },
];

export const MobileNativeHubView: React.FC<MobileNativeHubViewProps> = ({
  darkMode,
  onToggleDarkMode,
  empresa,
  userProfile,
  dataSource,
  products,
  customers,
  suppliers,
  purchases,
  sales,
  banners,
  employees,
  tickets,
  isInstallable,
  isInstalled,
  isIOS,
  onInstallPWA,
  onSaveEmpresa,
  onOpenAuth,
  onLogout,
  onResetDemo,
  onNotify,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState<EmpresaConfig>(empresa);
  const [savingEmp, setSavingEmp] = useState(false);

  useEffect(() => {
    setEmpForm(empresa);
  }, [empresa]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      onNotify('Código copiado al portapapeles', 'success');
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      onNotify('No se pudo copiar automáticamente', 'error');
    }
  };

  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmp(true);
    try {
      await onSaveEmpresa(empForm);
    } finally {
      setSavingEmp(false);
    }
  };

  const handleExportMigrationBundle = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      sourceProject: 'yabi-store',
      empresa,
      collections: {
        productos: products,
        clientes: customers,
        proveedores: suppliers,
        compras: purchases,
        ventas: sales,
        banners,
        usuarios: employees,
        soporte: tickets,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yabi-store-backup-supabase-${empresa.id}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify('Respaldo JSON completo descargado para migrar a Supabase / Render', 'success');
  };

  const generateSqlText = () =>
    buildFullSupabaseSql({
      empresa,
      products,
      customers,
      suppliers,
      purchases,
      banners,
      sales,
      tickets,
    });

  const handleCopyFullSql = async () => {
    const sql = generateSqlText();
    await handleCopy('full-sql', sql);
    onNotify('SQL completo (tablas + datos) copiado. Pégalo en Supabase -> SQL Editor.', 'success');
  };

  const handleDownloadFullSql = () => {
    const sql = generateSqlText();
    const blob = new Blob([sql], {type: 'application/sql;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yabi-store-supabase-${empresa.id}-${new Date().toISOString().slice(0, 10)}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify('Archivo .SQL completo descargado para Supabase SQL Editor', 'success');
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-8 max-w-5xl">
      {/* Account & Cloud Sync */}
      <div className="bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Motor: {activeBackend === 'supabase' ? 'Supabase Postgres + Realtime' : 'Firebase yabi-store'} · Empresa: {empresa.id} · Estado:{' '}
            {dataSource === 'firebase'
              ? activeBackend === 'supabase'
                ? 'Conectado a Supabase Realtime'
                : 'Tiempo real onSnapshot'
              : 'Modo Demo / Offline'}
          </p>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {userProfile ? userProfile.nombre : empresa.nombre}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {userProfile
              ? `${userProfile.email} · Rol ${userProfile.rol}`
              : 'Trabajando en modo demostración local. Conecta tu cuenta de YA’BI Store para sincronizar en tiempo real.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {userProfile ? (
            <button
              type="button"
              onClick={onLogout}
              className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-[#0D1E35] text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0E1A2E] flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onResetDemo}
                className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0E1A2E] flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reiniciar demo
              </button>
              <button
                type="button"
                onClick={onOpenAuth}
                className="min-h-[44px] px-4 rounded-xl bg-sky-600 dark:bg-[#00C8FF] text-white dark:text-[#050A14] text-sm font-semibold flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Conectar cuenta
              </button>
            </>
          )}
        </div>
      </div>

      {/* Supabase / Render Full Migration Backup */}
      <div className="bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-[#00E87C] flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Conexión y migración a Supabase + Render
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                    activeBackend === 'supabase'
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : 'bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/30'
                  }`}
                >
                  {activeBackend === 'supabase'
                    ? 'Supabase activo'
                    : 'Listo para activar con VITE_SUPABASE_URL'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Genera el archivo <span className="font-mono text-[#00C8FF]">.sql</span> listo para pegar directamente en <strong>Supabase → SQL Editor</strong> ({products.length} productos, {sales.length} ventas, {purchases.length} compras, {customers.length} clientes, {suppliers.length} proveedores y {tickets.length} tickets). No pegues el JSON en el SQL Editor; el JSON es solo para el script CLI.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyFullSql}
              className="min-h-[44px] px-4 rounded-xl bg-[#00C8FF] hover:bg-[#33D6FF] text-[#050A14] text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {copiedId === 'full-sql' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedId === 'full-sql' ? 'SQL Copiado' : 'Copiar SQL completo'}
            </button>
            <button
              type="button"
              onClick={handleDownloadFullSql}
              className="min-h-[44px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Descargar .SQL
            </button>
            <button
              type="button"
              onClick={handleExportMigrationBundle}
              className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#0E1A2E] text-sm font-medium flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              JSON CLI
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070E1A] border border-slate-200 dark:border-[#0D1E35]">
            <p className="font-semibold text-slate-800 dark:text-white">1. Copiar / Descargar SQL</p>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">
              Pulsa <strong>Copiar SQL completo</strong> y pégalo en <strong>Supabase → SQL Editor → Run</strong> (crea las 9 tablas, RLS, bucket <span className="font-mono">yabi-media</span> y tus datos).
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070E1A] border border-slate-200 dark:border-[#0D1E35]">
            <p className="font-semibold text-slate-800 dark:text-white">2. Usuario Administrador</p>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">
              En <strong>Authentication → Users</strong> crea tu cuenta y vincula su UUID en <span className="font-mono text-[#00C8FF]">public.usuarios</span>.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070E1A] border border-slate-200 dark:border-[#0D1E35]">
            <p className="font-semibold text-slate-800 dark:text-white">3. Variables Frontend &amp; Render</p>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">
              Define <span className="font-mono">VITE_SUPABASE_URL</span>, <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> y{' '}
              <span className="font-mono">{renderApiUrl ? renderApiUrl : 'VITE_RENDER_API_URL'}</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Company Settings */}
      <form
        onSubmit={handleSaveEmpresa}
        className="bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-2xl p-5 space-y-4"
      >
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Datos fiscales y configuración de empresa
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Se imprime en los recibos POS y se sincroniza en <span className="font-mono">empresas/{empresa.id}</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Nombre comercial
            </label>
            <input
              value={empForm.nombre}
              onChange={(e) => setEmpForm({...empForm, nombre: e.target.value})}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              NIT
            </label>
            <input
              value={empForm.nit || ''}
              onChange={(e) => setEmpForm({...empForm, nit: e.target.value})}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] font-mono text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Ciudad
            </label>
            <input
              value={empForm.ciudad || ''}
              onChange={(e) => setEmpForm({...empForm, ciudad: e.target.value})}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Teléfono
            </label>
            <input
              value={empForm.telefono || ''}
              onChange={(e) => setEmpForm({...empForm, telefono: e.target.value})}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Régimen fiscal (IVA)
            </label>
            <div className="flex gap-2">
              <select
                value={Number(empForm.iva ?? 0) > 0 ? 'responsable' : 'no_responsable'}
                onChange={(e) => {
                  const isResp = e.target.value === 'responsable';
                  setEmpForm({
                    ...empForm,
                    iva: isResp ? (Number(empForm.iva) > 0 ? Number(empForm.iva) : 19) : 0,
                  });
                }}
                className="flex-1 h-11 px-3 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm text-slate-900 dark:text-white"
              >
                <option value="no_responsable">No responsable de IVA (0%)</option>
                <option value="responsable">Responsable de IVA</option>
              </select>
              {Number(empForm.iva ?? 0) > 0 && (
                <input
                  type="number"
                  min={1}
                  max={30}
                  aria-label="Porcentaje de IVA"
                  value={empForm.iva ?? 19}
                  onChange={(e) => setEmpForm({...empForm, iva: Math.max(0, Number(e.target.value))})}
                  className="w-20 h-11 px-2.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] font-mono text-sm text-slate-900 dark:text-white text-center"
                />
              )}
            </div>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={savingEmp}
              className="w-full min-h-[44px] rounded-xl bg-sky-600 dark:bg-[#00C8FF] text-white dark:text-[#050A14] text-sm font-semibold"
            >
              {savingEmp ? 'Guardando…' : 'Guardar configuración'}
            </button>
          </div>
        </div>
      </form>

      {/* Appearance & PWA Install Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Tema de interfaz (PC y Móvil)
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cambia entre modo claro para exteriores y modo oscuro para caja nocturna.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="min-h-[46px] px-4 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm font-medium text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2.5"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
            {darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          </button>
        </div>

        <div className="bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Instalación directa (PWA Móvil y PC)
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isInstalled
                ? 'La aplicación ya está instalada en modo independiente.'
                : isIOS
                ? 'En iPhone/iPad abre Compartir en Safari y selecciona "Agregar a inicio".'
                : 'Instala YA’BI Store en Android, Windows o macOS para operar como app nativa.'}
            </p>
          </div>
          {!isInstalled && isInstallable ? (
            <button
              type="button"
              onClick={onInstallPWA}
              className="min-h-[46px] px-4 rounded-xl bg-sky-600 dark:bg-[#00C8FF] text-white dark:text-[#050A14] text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Instalar App en este dispositivo
            </button>
          ) : (
            <div className="min-h-[46px] px-4 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2">
              <Monitor className="w-4 h-4 text-[#00C8FF]" />
              <span>
                {isInstalled ? 'Ejecutando como App instalada' : 'Usa el menú del navegador → Instalar aplicación'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* React Native Expo Companion Project */}
      <div className="bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00C8FF]/10 text-[#00C8FF] flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Proyecto nativo React Native (Expo) sincronizado en tiempo real
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Código fuente completo en <span className="font-mono">/react-native-app</span> compatible con <strong>Supabase Realtime</strong> (<span className="font-mono">EXPO_PUBLIC_SUPABASE_URL</span>) y respaldo Firebase: POS con escáner de cámara, Ventas/Guías, Inventario, Compras atómicas, Clientes/Proveedores, Banners, Reportes omnicanal y Soporte.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {RN_SNIPPETS.map((snippet) => (
            <div
              key={snippet.id}
              className="rounded-xl border border-slate-200 dark:border-[#0D1E35] overflow-hidden"
            >
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#070E1A] border-b border-slate-200 dark:border-[#0D1E35] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {snippet.title}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 truncate">{snippet.path}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(snippet.id, snippet.code)}
                  className="min-h-[34px] px-3 rounded-lg border border-slate-200 dark:border-[#0D1E35] text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0"
                >
                  {copiedId === snippet.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 text-[11px] font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0B1525] overflow-x-auto leading-relaxed">
                <code>{snippet.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
