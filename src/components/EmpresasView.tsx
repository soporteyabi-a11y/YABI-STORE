import React, {useMemo, useState} from 'react';
import {
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Layers,
  MapPin,
  Monitor,
  Phone,
  Plus,
  Power,
  Search,
  ShieldAlert,
  Store,
  Users,
  X,
} from 'lucide-react';
import {localStore} from '../services/yabiDb';
import type {AppTab, EmpresaConfig, Sale, UserProfile} from '../types/yabi';
import {formatCOP} from '../utils/format';

interface EmpresasViewProps {
  empresas: EmpresaConfig[];
  activeEmpresa: EmpresaConfig;
  activeProductsCount: number;
  activeCustomersCount: number;
  activeSales: Sale[];
  employees: UserProfile[];
  userProfile: UserProfile | null;
  isCloudConnected: boolean;
  onSwitchEmpresa: (empresaId: string) => void;
  onSaveEmpresa: (
    empresa: EmpresaConfig,
    options?: {isNew?: boolean; cloneFromCurrent?: boolean}
  ) => Promise<void>;
  onNavigateTab: (tab: AppTab) => void;
}

type AccentPalette = {
  hex: string;
  label: string;
  topBarClass: string;
  dotClass: string;
  ringClass: string;
  swatchClass: string;
};

const COLOR_PRESETS: AccentPalette[] = [
  {
    hex: '#00C8FF',
    label: 'Cian YA’BI',
    topBarClass: 'bg-[#00C8FF]',
    dotClass: 'bg-[#00C8FF]',
    ringClass: 'border-[#00C8FF]/50',
    swatchClass: 'bg-[#00C8FF]',
  },
  {
    hex: '#00E87C',
    label: 'Esmeralda',
    topBarClass: 'bg-[#00E87C]',
    dotClass: 'bg-[#00E87C]',
    ringClass: 'border-[#00E87C]/50',
    swatchClass: 'bg-[#00E87C]',
  },
  {
    hex: '#A855F7',
    label: 'Violeta',
    topBarClass: 'bg-purple-500',
    dotClass: 'bg-purple-500',
    ringClass: 'border-purple-500/50',
    swatchClass: 'bg-purple-500',
  },
  {
    hex: '#F59E0B',
    label: 'Ámbar',
    topBarClass: 'bg-amber-500',
    dotClass: 'bg-amber-500',
    ringClass: 'border-amber-500/50',
    swatchClass: 'bg-amber-500',
  },
  {
    hex: '#F43F5E',
    label: 'Coral',
    topBarClass: 'bg-rose-500',
    dotClass: 'bg-rose-500',
    ringClass: 'border-rose-500/50',
    swatchClass: 'bg-rose-500',
  },
  {
    hex: '#3B82F6',
    label: 'Azul',
    topBarClass: 'bg-blue-500',
    dotClass: 'bg-blue-500',
    ringClass: 'border-blue-500/50',
    swatchClass: 'bg-blue-500',
  },
];

function getPreset(colorHex?: string): AccentPalette {
  const normalized = (colorHex || '#00C8FF').toUpperCase();
  return COLOR_PRESETS.find((p) => p.hex.toUpperCase() === normalized) || COLOR_PRESETS[0];
}

function suggestNextEmpresaId(empresas: EmpresaConfig[]): string {
  let maxNum = 0;
  for (const e of empresas) {
    const match = /^EMP(\d+)$/i.exec(e.id || '');
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n > maxNum) maxNum = n;
    }
  }
  const next = maxNum + 1;
  return `EMP${String(next).padStart(3, '0')}`;
}

export const EmpresasView: React.FC<EmpresasViewProps> = ({
  empresas,
  activeEmpresa,
  activeProductsCount,
  activeCustomersCount,
  activeSales,
  employees,
  userProfile,
  isCloudConnected,
  onSwitchEmpresa,
  onSaveEmpresa,
  onNavigateTab,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIsNew, setEditingIsNew] = useState(false);
  const [cloneTemplate, setCloneTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EmpresaConfig>({
    id: 'EMP002',
    nombre: '',
    nit: '',
    direccion: '',
    ciudad: '',
    telefono: '',
    iva: 0,
    plan: 'Pro',
    color: '#00C8FF',
    activa: true,
  });

  const canManageMultiEmpresa = !userProfile || userProfile.rol === 'superadmin';
  const canEditActive =
    canManageMultiEmpresa || userProfile?.rol === 'admin';

  const activeList = useMemo(() => {
    const merged = empresas.length > 0 ? empresas : [activeEmpresa];
    return merged.map((emp) => {
      const isCurrent = emp.id === activeEmpresa.id;
      const empStaffCount = employees.filter((u) => u.empresaId === emp.id).length;

      if (isCurrent) {
        const validSales = activeSales.filter((s) => s.estado !== 'Cancelada');
        return {
          empresa: emp,
          isCurrent: true,
          productsCount: activeProductsCount,
          customersCount: activeCustomersCount,
          salesCount: validSales.length,
          revenue: validSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0),
          staffCount: empStaffCount,
          metricsExact: true,
        };
      }

      if (!isCloudConnected) {
        const snap = localStore.getEmpresaSnapshot(emp);
        const localStaff = localStore.getEmployees(emp.id).length;
        return {
          empresa: emp,
          isCurrent: false,
          productsCount: snap.productsCount,
          customersCount: snap.customersCount,
          salesCount: snap.salesCount,
          revenue: snap.revenue,
          staffCount: localStaff,
          metricsExact: true,
        };
      }

      return {
        empresa: emp,
        isCurrent: false,
        productsCount: 0,
        customersCount: 0,
        salesCount: 0,
        revenue: 0,
        staffCount: empStaffCount,
        metricsExact: false,
      };
    });
  }, [
    empresas,
    activeEmpresa,
    activeProductsCount,
    activeCustomersCount,
    activeSales,
    employees,
    isCloudConnected,
  ]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeList.filter(({empresa}) => {
      const isActive = empresa.activa !== false;
      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'suspended' && isActive) return false;
      if (!q) return true;
      return (
        empresa.nombre.toLowerCase().includes(q) ||
        empresa.id.toLowerCase().includes(q) ||
        (empresa.nit || '').toLowerCase().includes(q) ||
        (empresa.ciudad || '').toLowerCase().includes(q) ||
        (empresa.direccion || '').toLowerCase().includes(q)
      );
    });
  }, [activeList, search, statusFilter]);

  const totals = useMemo(() => {
    const totalEmpresas = activeList.length;
    const activasCount = activeList.filter((i) => i.empresa.activa !== false).length;
    const suspendidasCount = totalEmpresas - activasCount;
    const totalRevenue = activeList.reduce((acc, i) => acc + i.revenue, 0);
    const totalSales = activeList.reduce((acc, i) => acc + i.salesCount, 0);
    return {totalEmpresas, activasCount, suspendidasCount, totalRevenue, totalSales};
  }, [activeList]);

  const openCreateModal = () => {
    const nextId = suggestNextEmpresaId(empresas.length > 0 ? empresas : [activeEmpresa]);
    setEditingIsNew(true);
    setCloneTemplate(false);
    setForm({
      id: nextId,
      nombre: '',
      nit: '',
      direccion: '',
      ciudad: activeEmpresa.ciudad || '',
      telefono: '',
      iva: 0,
      plan: 'Pro',
      color: COLOR_PRESETS[(empresas.length || 1) % COLOR_PRESETS.length].hex,
      activa: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (emp: EmpresaConfig) => {
    setEditingIsNew(false);
    setCloneTemplate(false);
    setForm({
      ...emp,
      iva: Number(emp.iva ?? 0),
      plan: emp.plan || 'Pro',
      color: emp.color || '#00C8FF',
      activa: emp.activa !== false,
    });
    setModalOpen(true);
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = form.id
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');
    if (!cleanId || !form.nombre.trim()) return;

    setSaving(true);
    try {
      await onSaveEmpresa(
        {
          ...form,
          id: cleanId,
          nombre: form.nombre.trim(),
          nit: form.nit?.trim() || '',
          direccion: form.direccion?.trim() || '',
          ciudad: form.ciudad?.trim() || '',
          telefono: form.telefono?.trim() || '',
          iva: Number(form.iva ?? 0),
          activa: form.activa !== false,
        },
        {isNew: editingIsNew, cloneFromCurrent: editingIsNew && cloneTemplate}
      );
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (emp: EmpresaConfig) => {
    const nextActive = emp.activa === false;
    await onSaveEmpresa({...emp, activa: nextActive}, {isNew: false});
  };

  const activePreset = getPreset(activeEmpresa.color);

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* Consolidated Multi-Empresa KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Empresas / Sedes</span>
            <Building2 className="w-4 h-4 text-[#00C8FF]" />
          </div>
          <p className="mt-2 text-2xl font-display font-extrabold text-slate-900 dark:text-white font-mono">
            {totals.totalEmpresas}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {totals.activasCount} activas · {totals.suspendidasCount} suspendidas
          </p>
        </div>

        <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Operando ahora</span>
            <span className={`w-2.5 h-2.5 rounded-full ${activePreset.dotClass}`} />
          </div>
          <p className="mt-2 text-base font-bold text-slate-900 dark:text-white truncate">
            {activeEmpresa.nombre}
          </p>
          <p className="mt-1 text-[11px] font-mono text-sky-600 dark:text-[#00C8FF] truncate">
            {activeEmpresa.id} · Plan {(activeEmpresa.plan || 'Pro').toUpperCase()}
          </p>
        </div>

        <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">
              {isCloudConnected ? 'Ingresos sede activa' : 'Ingresos consolidados'}
            </span>
            <Layers className="w-4 h-4 text-emerald-500 dark:text-[#00E87C]" />
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-display font-extrabold text-slate-900 dark:text-white font-mono">
            {formatCOP(totals.totalRevenue)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {totals.totalSales} venta(s) acumuladas
          </p>
        </div>

        <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Modo multi-empresa</span>
            <ArrowRightLeft className="w-4 h-4 text-purple-500" />
          </div>
          <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
            {canManageMultiEmpresa ? 'Control Global' : 'Sede Asignada'}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {isCloudConnected
              ? userProfile?.rol === 'superadmin'
                ? 'Superadmin en tiempo real'
                : `Rol ${userProfile?.rol || 'usuario'}`
              : 'Aislamiento local por empresa'}
          </p>
        </div>
      </div>

      {/* Search, Filter & Create Toolbar */}
      <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, código (EMP001), NIT o ciudad…"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50/65 dark:bg-[#070E1A]/50 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50/65 dark:bg-[#070E1A]/50 p-1">
            {(
              [
                {id: 'all', label: 'Todas'},
                {id: 'active', label: 'Activas'},
                {id: 'suspended', label: 'Suspendidas'},
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatusFilter(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === opt.id
                    ? 'bg-sky-600 dark:bg-[#00C8FF] text-white dark:text-[#050A14]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {canManageMultiEmpresa ? (
          <button
            type="button"
            onClick={openCreateModal}
            className="min-h-[44px] px-4 rounded-xl bg-sky-600 dark:bg-[#00C8FF] hover:bg-sky-500 dark:hover:bg-[#33D6FF] text-white dark:text-[#050A14] text-sm font-bold flex items-center justify-center gap-2 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nueva empresa
          </button>
        ) : (
          <div className="px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-600 dark:text-amber-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Cuenta vinculada únicamente a {activeEmpresa.id}</span>
          </div>
        )}
      </div>

      {/* Empresas Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-12 text-center">
          <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            No se encontraron empresas con ese filtro
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Prueba otra búsqueda o crea una nueva empresa para comenzar a operar por separado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(
            ({
              empresa: emp,
              isCurrent,
              productsCount,
              customersCount,
              salesCount,
              revenue,
              staffCount,
              metricsExact,
            }) => {
              const preset = getPreset(emp.color);
              const isActiva = emp.activa !== false;
              const ivaPct = Number(emp.iva ?? 0);
              const canSwitch = canManageMultiEmpresa && !isCurrent;
              const canEdit = canManageMultiEmpresa || (canEditActive && isCurrent);
              const canSuspend =
                canManageMultiEmpresa &&
                !isCurrent &&
                (totals.activasCount > 1 || !isActiva);

              return (
                <article
                  key={emp.id}
                  className={`bg-white/65 dark:bg-[#0B1525]/45 border rounded-2xl overflow-hidden flex flex-col justify-between transition-colors ${
                    isCurrent
                      ? `${preset.ringClass} shadow-sm`
                      : 'border-slate-200/80 dark:border-[#0D1E35]'
                  } ${!isActiva ? 'opacity-75' : ''}`}
                >
                  {/* Accent Stripe */}
                  <div className={`h-1.5 w-full ${preset.topBarClass}`} />

                  <div className="p-5 space-y-4 flex-1">
                    {/* Top Row: ID, Plan & Active Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#070E1A] border border-slate-200 dark:border-[#0D1E35] font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">
                            {emp.id}
                          </span>
                          <span className="px-2 py-0.5 rounded-md border border-purple-500/35 bg-purple-500/10 text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-300">
                            {emp.plan || 'Pro'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                              isActiva
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-[#00E87C]'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isActiva ? 'Activa' : 'Suspendida'}
                          </span>
                        </div>
                        <h3 className="mt-2 text-lg font-display font-bold text-slate-900 dark:text-white truncate">
                          {emp.nombre}
                        </h3>
                      </div>

                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 dark:bg-[#00C8FF]/15 text-sky-700 dark:text-[#00C8FF] text-[11px] font-bold shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          En uso
                        </span>
                      )}
                    </div>

                    {/* Company Details */}
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <p className="font-mono">
                        NIT: <span className="text-slate-800 dark:text-slate-200">{emp.nit || 'Sin registrar'}</span>
                      </p>
                      {(emp.direccion || emp.ciudad) && (
                        <p className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">
                            {[emp.direccion, emp.ciudad].filter(Boolean).join(' · ')}
                          </span>
                        </p>
                      )}
                      {emp.telefono && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{emp.telefono}</span>
                        </p>
                      )}
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Régimen:{' '}
                        <span className="text-slate-800 dark:text-slate-200">
                          {ivaPct > 0 ? `Responsable de IVA (${ivaPct}%)` : 'No responsable de IVA (0%)'}
                        </span>
                      </p>
                    </div>

                    {/* Metrics Box */}
                    {metricsExact ? (
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="p-2.5 rounded-xl bg-slate-50/65 dark:bg-[#070E1A]/45 border border-slate-200/80 dark:border-[#0D1E35]">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">Productos</p>
                          <p className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                            {productsCount}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50/65 dark:bg-[#070E1A]/45 border border-slate-200/80 dark:border-[#0D1E35]">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">Ventas</p>
                          <p className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                            {salesCount}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50/65 dark:bg-[#070E1A]/45 border border-slate-200/80 dark:border-[#0D1E35]">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">Ingresos</p>
                          <p className="text-xs font-mono font-bold text-emerald-600 dark:text-[#00E87C] mt-0.5 truncate">
                            {formatCOP(revenue)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50/65 dark:bg-[#070E1A]/45 border border-slate-200/80 dark:border-[#0D1E35] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#00C8FF]" />
                          {staffCount} usuario(s) asignados
                        </span>
                        <span className="text-[11px] font-medium text-sky-600 dark:text-[#00C8FF]">
                          Entra para sincronizar
                        </span>
                      </div>
                    )}

                    {metricsExact && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {customersCount} cliente(s) · {staffCount} miembro(s) de equipo
                      </p>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="px-5 py-3.5 border-t border-slate-200/70 dark:border-[#0D1E35] bg-slate-50/40 dark:bg-[#070E1A]/35 flex flex-wrap items-center gap-2">
                    {isCurrent ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onNavigateTab('pos')}
                          className="flex-1 min-h-[38px] px-3 rounded-xl bg-sky-600 dark:bg-[#00C8FF] text-white dark:text-[#050A14] text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <Monitor className="w-3.5 h-3.5" />
                          Abrir POS
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateTab('storefront')}
                          className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-[#0D1E35] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#00C8FF] flex items-center gap-1.5"
                        >
                          <Store className="w-3.5 h-3.5 text-[#00C8FF]" />
                          Tienda
                        </button>
                      </>
                    ) : (
                      canSwitch && (
                        <button
                          type="button"
                          onClick={() => onSwitchEmpresa(emp.id)}
                          disabled={!isActiva}
                          className="flex-1 min-h-[38px] px-3 rounded-xl bg-sky-600 dark:bg-[#00C8FF] hover:bg-sky-500 dark:hover:bg-[#33D6FF] disabled:opacity-45 text-white dark:text-[#050A14] text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Entrar a operar
                        </button>
                      )
                    )}

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => openEditModal(emp)}
                        aria-label={`Editar ${emp.nombre}`}
                        className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-[#0D1E35] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#00C8FF] flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar
                      </button>
                    )}

                    {canSuspend && (
                      <button
                        type="button"
                        onClick={() => handleToggleActive(emp)}
                        aria-label={isActiva ? `Suspender ${emp.nombre}` : `Activar ${emp.nombre}`}
                        title={isActiva ? 'Suspender empresa' : 'Reactivar empresa'}
                        className={`min-h-[38px] px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center ${
                          isActiva
                            ? 'border-rose-500/30 text-rose-500 hover:bg-rose-500/10'
                            : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}

      {/* Create / Edit Empresa Modal (Opaque Surface) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/65 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-[#0D1E35] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-[#00C8FF]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingIsNew ? 'Crear nueva empresa / sucursal' : `Editar ${form.nombre}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="p-5 space-y-4 overflow-y-auto pb-safe">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Código ID *
                  </label>
                  <input
                    required
                    disabled={!editingIsNew}
                    value={form.id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        id: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
                      })
                    }
                    placeholder="EMP002"
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] disabled:opacity-60 font-mono text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Nombre comercial *
                  </label>
                  <input
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({...form, nombre: e.target.value})}
                    placeholder="Ej: YA’BI Sucursal Norte"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    NIT / Documento
                  </label>
                  <input
                    value={form.nit || ''}
                    onChange={(e) => setForm({...form, nit: e.target.value})}
                    placeholder="901.000.123-4"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] font-mono text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    value={form.telefono || ''}
                    onChange={(e) => setForm({...form, telefono: e.target.value})}
                    placeholder="+57 300 000 0000"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Dirección
                  </label>
                  <input
                    value={form.direccion || ''}
                    onChange={(e) => setForm({...form, direccion: e.target.value})}
                    placeholder="Calle / Carrera / Local"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Ciudad
                  </label>
                  <input
                    value={form.ciudad || ''}
                    onChange={(e) => setForm({...form, ciudad: e.target.value})}
                    placeholder="Cali, Medellín, Bogotá…"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Régimen fiscal (IVA)
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={Number(form.iva ?? 0) > 0 ? 'responsable' : 'no_responsable'}
                      onChange={(e) => {
                        const isResp = e.target.value === 'responsable';
                        setForm({
                          ...form,
                          iva: isResp ? (Number(form.iva) > 0 ? Number(form.iva) : 19) : 0,
                        });
                      }}
                      className="flex-1 h-11 px-3 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm text-slate-900 dark:text-white"
                    >
                      <option value="no_responsable">No responsable de IVA (0%)</option>
                      <option value="responsable">Responsable de IVA</option>
                    </select>
                    {Number(form.iva ?? 0) > 0 && (
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={form.iva ?? 19}
                        onChange={(e) =>
                          setForm({...form, iva: Math.max(0, Number(e.target.value))})
                        }
                        className="w-16 h-11 px-2 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] font-mono text-sm text-center text-slate-900 dark:text-white"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Plan asignado
                  </label>
                  <select
                    value={form.plan || 'Pro'}
                    onChange={(e) =>
                      setForm({...form, plan: e.target.value as EmpresaConfig['plan']})
                    }
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm text-slate-900 dark:text-white"
                  >
                    <option value="Básico">Básico</option>
                    <option value="Plata">Plata</option>
                    <option value="Pro">Pro</option>
                    <option value="Oro">Oro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  Color identificador
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {COLOR_PRESETS.map((preset) => {
                    const selected =
                      (form.color || '#00C8FF').toUpperCase() === preset.hex.toUpperCase();
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setForm({...form, color: preset.hex})}
                        aria-label={preset.label}
                        className={`h-9 px-3 rounded-xl border flex items-center gap-2 text-xs font-medium transition-colors ${
                          selected
                            ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-[#070E1A] text-slate-900 dark:text-white'
                            : 'border-slate-200 dark:border-[#0D1E35] text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full ${preset.swatchClass}`} />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {editingIsNew && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cloneTemplate}
                    onChange={(e) => setCloneTemplate(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-[#00C8FF]"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    <strong>Copiar catálogo actual como plantilla</strong> ({activeProductsCount} productos y {activeCustomersCount} clientes de {activeEmpresa.id}). Si lo dejas sin marcar, iniciará en cero.
                  </span>
                </label>
              )}

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] cursor-pointer">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Empresa activa para operar en POS y Tienda Online
                </span>
                <input
                  type="checkbox"
                  checked={form.activa !== false}
                  onChange={(e) => setForm({...form, activa: e.target.checked})}
                  className="rounded border-slate-300 text-[#00C8FF]"
                />
              </label>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-[#0D1E35] text-sm font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 min-h-[44px] rounded-xl bg-sky-600 dark:bg-[#00C8FF] hover:bg-sky-500 dark:hover:bg-[#33D6FF] text-white dark:text-[#050A14] text-sm font-bold"
                >
                  {saving ? 'Guardando…' : editingIsNew ? 'Crear empresa' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
