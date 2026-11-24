import React, {useState} from 'react';
import {Plus, ShieldCheck, Trash2, UserPlus, X} from 'lucide-react';
import {activeBackend} from '../services/yabiDb';
import type {UserProfile} from '../types/yabi';

interface TeamViewProps {
  employees: UserProfile[];
  currentUserUid?: string;
  isCloudConnected: boolean;
  onCreateEmployee: (payload: {
    nombre: string;
    email: string;
    pass: string;
    rol: 'admin' | 'vendedor' | 'bodega';
  }) => Promise<void>;
  onDeleteEmployee: (uid: string) => Promise<void>;
}

const ROLE_LABELS: Record<UserProfile['rol'], string> = {
  superadmin: 'Super Admin · Acceso total plataforma',
  admin: 'Administrador · Ventas, inventario, compras y equipo',
  vendedor: 'Vendedor · Caja POS, clientes y tienda',
  bodega: 'Bodega · Inventario, compras y recepción',
};

export const TeamView: React.FC<TeamViewProps> = ({
  employees,
  currentUserUid,
  isCloudConnected,
  onCreateEmployee,
  onDeleteEmployee,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [rol, setRol] = useState<'admin' | 'vendedor' | 'bodega'>('vendedor');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim() || pass.length < 6) return;
    setSubmitting(true);
    try {
      await onCreateEmployee({
        nombre: nombre.trim(),
        email: email.trim(),
        pass,
        rol,
      });
      setNombre('');
      setEmail('');
      setPass('');
      setRol('vendedor');
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-8 max-w-4xl">
      <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Equipo y accesos ({employees.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isCloudConnected
              ? activeBackend === 'supabase'
                ? 'Conectado a Supabase Auth + API en Render (/api/employees).'
                : 'Conectado a Cloud Functions (createEmployeeAccount / deleteUserAccount) en yabi-store.'
              : 'Operando en almacenamiento local. Inicia sesión como administrador para crear y gestionar cuentas en la nube.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shrink-0 whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo empleado
        </button>
      </div>

      {/* Team List */}
      <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {employees.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              No hay cuentas de equipo listadas.
            </p>
          ) : (
            employees.map((emp) => {
              const isSelf = emp.uid === currentUserUid;
              return (
                <div
                  key={emp.uid}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-[#0E1A2E]/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {emp.nombre}
                      </p>
                      {isSelf && (
                        <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                          (Tú)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {emp.email} · {ROLE_LABELS[emp.rol] || emp.rol}
                    </p>
                  </div>

                  {!isSelf && emp.rol !== 'superadmin' && (
                    <button
                      type="button"
                      onClick={() => onDeleteEmployee(emp.uid)}
                      className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                      aria-label={`Eliminar cuenta de ${emp.nombre}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Role Summary */}
      <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-5 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          Permisos por rol en YA&apos;BI Store
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-400 pt-1">
          <div className="p-3 rounded-xl bg-slate-50/65 dark:bg-[#070E1A]/45 border border-slate-200/80 dark:border-[#0D1E35]">
            <p className="font-semibold text-slate-900 dark:text-white">Administrador</p>
            <p className="mt-1">Control total de POS, inventario, compras, reportes y equipo.</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50/65 dark:bg-[#070E1A]/45 border border-slate-200/80 dark:border-[#0D1E35]">
            <p className="font-semibold text-slate-900 dark:text-white">Vendedor</p>
            <p className="mt-1">Opera caja POS, consulta catálogo y atiende clientes.</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50/65 dark:bg-[#070E1A]/45 border border-slate-200/80 dark:border-[#0D1E35]">
            <p className="font-semibold text-slate-900 dark:text-white">Bodega</p>
            <p className="mt-1">Gestiona existencias, recepciones de compra y conteos.</p>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Crear cuenta de empleado
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 pb-safe">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nombre completo
                </label>
                <input
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. María Fernanda Ortiz"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Correo de acceso
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vendedor@tunegocio.co"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Contraseña (mín. 6)
                  </label>
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="••••••"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Rol
                  </label>
                  <select
                    value={rol}
                    onChange={(e) => setRol(e.target.value as 'admin' | 'vendedor' | 'bodega')}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="vendedor">Vendedor (POS)</option>
                    <option value="bodega">Bodega (Stock)</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[46px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {submitting ? 'Creando usuario…' : 'Crear cuenta'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
