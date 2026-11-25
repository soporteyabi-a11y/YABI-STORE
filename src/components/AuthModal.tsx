import React, {useEffect, useState} from 'react';
import {Crown, KeyRound, LogIn, UserPlus, X} from 'lucide-react';
import {isSupabaseConfigured, yabiAuth} from '../services/yabiDb';
import type {EmpresaConfig} from '../types/yabi';

interface AuthModalProps {
  open: boolean;
  defaultEmpresa?: EmpresaConfig;
  onSaveLocalEmpresa?: (updated: EmpresaConfig) => Promise<void>;
  onClose: () => void;
  onSuccess: () => void;
  onNotify: (msg: string, tone?: 'success' | 'info' | 'error') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  defaultEmpresa,
  onSaveLocalEmpresa,
  onClose,
  onSuccess,
  onNotify,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [storeName, setStoreName] = useState(defaultEmpresa?.nombre || "DIGITAL YA'BI");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  useEffect(() => {
    if (open) {
      setStoreName(defaultEmpresa?.nombre || "DIGITAL YA'BI");
      setError('');
      setInfoMsg('');
    }
  }, [open, defaultEmpresa]);

  if (!open) return null;

  const backendLabel = 'Supabase + Render';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    if (mode === 'register') {
      if (!storeName.trim() || !ownerName.trim() || !email.trim() || password.length < 6) {
        setError('Completa tienda, nombre de dueño, correo y una contraseña de al menos 6 caracteres.');
        return;
      }
      setLoading(true);
      try {
        if (!isSupabaseConfigured) {
          if (onSaveLocalEmpresa && defaultEmpresa) {
            await onSaveLocalEmpresa({
              ...defaultEmpresa,
              nombre: storeName.trim(),
              plan: 'Oro',
              activa: true,
            });
          }
          onNotify(
            `${storeName.trim()} activada en Plan Oro ($0) localmente. Agrega VITE_SUPABASE_URL para sincronizar en la nube.`,
            'info'
          );
          onClose();
          return;
        }
        const res = await yabiAuth.registerOwner({
          email: email.trim(),
          password,
          nombreDueno: ownerName.trim(),
          nombreTienda: storeName.trim(),
          nit: defaultEmpresa?.nit,
          direccion: defaultEmpresa?.direccion,
          ciudad: defaultEmpresa?.ciudad,
          telefono: defaultEmpresa?.telefono,
          iva: defaultEmpresa?.iva ?? 0,
        });
        if (res.needsEmailConfirmation) {
          setInfoMsg(
            'Cuenta creada. Revisa tu correo para confirmar el enlace y luego inicia sesión aquí para activar DIGITAL YA’BI con Plan Oro ($0).'
          );
          setMode('login');
          onNotify('Revisa tu correo para confirmar la cuenta de propietario', 'info');
        } else {
          onNotify(`${storeName.trim()} registrada como Propietario con Plan Oro ($0)`, 'success');
          onSuccess();
          onClose();
        }
      } catch (err: unknown) {
        const msg = (err as {message?: string})?.message || '';
        setError(msg || 'No fue posible registrar la cuenta de propietario en Supabase.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para iniciar sesión en la nube.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña de YA’BI Store.');
      return;
    }
    setLoading(true);
    try {
      await yabiAuth.login(email, password);
      onNotify(`Conectado a tu cuenta YA’BI Store (${backendLabel})`, 'success');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as {message?: string})?.message || '';
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setError('Credenciales incorrectas. Verifica tu correo o contraseña.');
      } else {
        setError(msg || `No se pudo iniciar sesión en ${backendLabel}. Verifica tu conexión.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Escribe tu correo primero para enviar el enlace de recuperación.');
      return;
    }
    setLoading(true);
    try {
      await yabiAuth.resetPassword(email);
      onNotify('Correo de recuperación enviado', 'info');
    } catch {
      setError('No pudimos enviar el correo de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/65 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#0D1E35]">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Conectar cuenta YA&apos;BI Store
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Motor activo: {backendLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-[#0E1A2E]"
            aria-label="Cerrar inicio de sesión"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-[#070E1A] border border-slate-200 dark:border-[#0D1E35]">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                mode === 'login'
                  ? 'bg-white dark:bg-[#0B1525] text-sky-600 dark:text-[#00C8FF] shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                mode === 'register'
                  ? 'bg-white dark:bg-[#0B1525] text-sky-600 dark:text-[#00C8FF] shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Registrar Dueño (Gratis)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {infoMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-700 dark:text-emerald-300">
              {infoMsg}
            </div>
          )}

          {mode === 'register' && (
            <>
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center gap-2.5 text-xs text-sky-700 dark:text-[#00C8FF]">
                <Crown className="w-4 h-4 shrink-0" />
                <span>
                  Cuenta <strong>Propietario (superadmin)</strong> con <strong>Plan Oro ($0/mes)</strong> sin cobro de suscripción.
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nombre de tu tienda
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="DIGITAL YA'BI"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tu nombre (Dueño)
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {mode === 'login' && (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-1.5 min-h-[36px]"
              >
                <KeyRound className="w-3.5 h-3.5" />
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          <div className="pt-2 flex gap-3 pb-safe">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[46px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Seguir en local
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 min-h-[46px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {mode === 'register' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              {loading
                ? 'Verificando…'
                : mode === 'register'
                ? 'Crear Plan Oro ($0)'
                : 'Iniciar sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
