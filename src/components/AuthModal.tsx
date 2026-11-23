import React, {useState} from 'react';
import {KeyRound, LogIn, X} from 'lucide-react';
import {activeBackend, yabiAuth} from '../services/yabiDb';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onNotify: (msg: string, tone?: 'success' | 'info' | 'error') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({open, onClose, onSuccess, onNotify}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const backendLabel = activeBackend === 'supabase' ? 'Supabase + Render' : 'Firebase (yabi-store)';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña de YA’BI Store.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await yabiAuth.login(email, password);
      onNotify(`Conectado a tu cuenta YA’BI Store (${backendLabel})`, 'success');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const code = (err as {code?: string})?.code || '';
      const msg = (err as {message?: string})?.message || '';
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        msg.toLowerCase().includes('invalid login credentials')
      ) {
        setError('Credenciales incorrectas. Verifica tu correo o contraseña.');
      } else if (code === 'auth/user-not-found') {
        setError('No existe una cuenta registrada con este correo.');
      } else {
        setError(`No se pudo iniciar sesión en ${backendLabel}. Verifica tu conexión.`);
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
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-[#0E1A2E]"
            aria-label="Cerrar inicio de sesión"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@tunegocio.co"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

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
              <LogIn className="w-4 h-4" />
              {loading ? 'Verificando…' : 'Iniciar sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
