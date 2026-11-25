import React from 'react';
import {Check, Crown} from 'lucide-react';
import type {EmpresaConfig} from '../types/yabi';
import {formatCOP} from '../utils/format';

interface SubscriptionViewProps {
  empresa: EmpresaConfig;
  productsCount: number;
  employeesCount: number;
  isOwner?: boolean;
  unlinkedAccount?: boolean;
  onClaimOwner?: () => Promise<void>;
  onChangePlan: (plan: NonNullable<EmpresaConfig['plan']>) => Promise<void>;
}

const PLANS: {
  id: NonNullable<EmpresaConfig['plan']>;
  price: number;
  desc: string;
  features: string[];
}[] = [
  {
    id: 'Básico',
    price: 49000,
    desc: 'Ideal para emprendedores y puntos de venta únicos.',
    features: ['Hasta 150 productos', '1 usuario / caja', 'Recibos térmicos 80mm', 'Exportación CSV'],
  },
  {
    id: 'Plata',
    price: 89000,
    desc: 'Para comercios en crecimiento con tienda online.',
    features: ['Hasta 600 productos', '3 empleados', 'Tienda Online + Banners', 'Órdenes de compra'],
  },
  {
    id: 'Pro',
    price: 149000,
    desc: 'Sincronización multidispositivo PC + Móvil Nativo.',
    features: [
      'Productos ilimitados',
      'Hasta 10 empleados',
      'App móvil PWA + React Native',
      'Soporte prioritario WhatsApp',
    ],
  },
  {
    id: 'Oro',
    price: 249000,
    desc: 'Operación multi-bodega y respaldo avanzado.',
    features: [
      'Todo lo del plan Pro',
      'Empleados ilimitados',
      'Respaldo JSON para Supabase/Render',
      'Acompañamiento técnico dedicado',
    ],
  },
];

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  empresa,
  productsCount,
  employeesCount,
  isOwner = false,
  unlinkedAccount = false,
  onClaimOwner,
  onChangePlan,
}) => {
  const [claiming, setClaiming] = React.useState(false);
  const activePlan = empresa.plan || 'Oro';
  const currentPrice = isOwner ? 0 : PLANS.find((p) => p.id === activePlan)?.price || 249000;

  return (
    <div className="space-y-6 pb-24 lg:pb-8 max-w-6xl">
      {unlinkedAccount && onClaimOwner && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
            <p className="font-bold">Tu cuenta aún no está vinculada en la tabla usuarios de Supabase</p>
            <p>
              Si ya ejecutaste el SQL de <strong>Configuración → Copiar Solo Tablas (20 KB)</strong>, pulsa este botón para activar <strong>DIGITAL YA&apos;BI</strong> como Propietario con <strong>Plan Oro ($0/mes)</strong>.
            </p>
          </div>
          <button
            type="button"
            disabled={claiming}
            onClick={async () => {
              setClaiming(true);
              try {
                await onClaimOwner();
              } finally {
                setClaiming(false);
              }
            }}
            className="min-h-[40px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-[#050A14] text-xs font-bold shrink-0 whitespace-nowrap"
          >
            {claiming ? 'Activando…' : 'Activar Plan Oro Dueño ($0)'}
          </button>
        </div>
      )}

      {/* Current Plan Summary */}
      <div className="rounded-2xl bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] border-t-2 border-t-[#00C8FF] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#00C8FF]/10 text-[#00C8FF] flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {empresa.nombre} · ID {empresa.id}
            </p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Plan actual: <span className="text-sky-600 dark:text-[#00C8FF]">{activePlan.toUpperCase()}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Uso actual: {productsCount} productos en catálogo · {employeesCount} usuarios activos
              {isOwner ? ' · Cuenta Propietario (exenta de cobro)' : ''}
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-slate-400">
            {isOwner ? 'Licencia de Propietario' : 'Facturación mensual'}
          </p>
          <p className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-[#00E87C]">
            {formatCOP(currentPrice)} / mes
          </p>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === activePlan;
          const displayPrice = isOwner ? 0 : plan.price;
          return (
            <div
              key={plan.id}
              className={`rounded-2xl bg-white/65 dark:bg-[#0B1525]/45 border p-5 flex flex-col justify-between gap-5 ${
                isCurrent
                  ? 'border-[#00C8FF] ring-1 ring-[#00C8FF]/30'
                  : 'border-slate-200/80 dark:border-[#0D1E35]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {plan.id}
                  </h3>
                  {isCurrent && (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-[#00C8FF]">
                      Activo
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatCOP(displayPrice)}
                    <span className="text-xs font-sans font-normal text-slate-400"> /mes</span>
                  </p>
                  {isOwner && (
                    <span className="text-[11px] font-mono line-through text-slate-400">
                      {formatCOP(plan.price)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{plan.desc}</p>
                <ul className="space-y-2 pt-2 border-t border-slate-200/70 dark:border-[#0D1E35]">
                  {plan.features.map((feat) => (
                    <li
                      key={feat}
                      className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-[#00E87C] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                disabled={isCurrent}
                onClick={() => onChangePlan(plan.id)}
                className={`w-full min-h-[42px] rounded-xl text-xs font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-slate-100/70 dark:bg-[#070E1A]/55 text-slate-400 cursor-default'
                    : 'bg-sky-600 dark:bg-[#00C8FF] text-white dark:text-[#050A14] hover:opacity-90'
                }`}
              >
                {isCurrent
                  ? 'Plan activo'
                  : isOwner
                  ? `Activar ${plan.id} ($0)`
                  : `Cambiar a ${plan.id}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
