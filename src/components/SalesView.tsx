import React, {useMemo, useState} from 'react';
import {Printer, Search, Truck, X} from 'lucide-react';
import type {Sale} from '../types/yabi';
import {formatCOP} from '../utils/format';

interface SalesViewProps {
  sales: Sale[];
  onUpdateSale: (sale: Sale) => Promise<void>;
  onInspectSale: (sale: Sale) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  sales,
  onUpdateSale,
  onInspectSale,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todas' | Sale['estado']>('Todas');
  const [trackingSale, setTrackingSale] = useState<Sale | null>(null);
  const [transportadora, setTransportadora] = useState('');
  const [guia, setGuia] = useState('');
  const [saving, setSaving] = useState(false);

  const metrics = useMemo(() => {
    const valid = sales.filter((s) => s.estado !== 'Cancelada');
    const totalBilled = valid.reduce((sum, s) => sum + s.total, 0);
    const paid = sales.filter((s) => s.estado === 'Pagada');
    const pending = sales.filter((s) => s.estado === 'Pendiente');
    const canceled = sales.filter((s) => s.estado === 'Cancelada');
    return {
      totalBilled,
      paidCount: paid.length,
      paidSum: paid.reduce((sum, s) => sum + s.total, 0),
      pendingCount: pending.length,
      pendingSum: pending.reduce((sum, s) => sum + s.total, 0),
      canceledCount: canceled.length,
    };
  }, [sales]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      const matchStatus = statusFilter === 'Todas' || s.estado === statusFilter;
      if (!matchStatus) return false;
      if (!q) return true;
      return (
        s.orden.toLowerCase().includes(q) ||
        s.cliente.toLowerCase().includes(q) ||
        s.producto.toLowerCase().includes(q) ||
        (s.guia || '').toLowerCase().includes(q)
      );
    });
  }, [sales, search, statusFilter]);

  const openTrackingModal = (sale: Sale) => {
    setTrackingSale(sale);
    setTransportadora(sale.transportadora || 'Servientrega');
    setGuia(sale.guia || '');
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingSale) return;
    setSaving(true);
    try {
      await onUpdateSale({
        ...trackingSale,
        transportadora: transportadora.trim() || undefined,
        guia: guia.trim() || undefined,
      });
      setTrackingSale(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] border-t-2 border-t-[#00C8FF] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total facturado
          </p>
          <p className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatCOP(metrics.totalBilled)}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] border-t-2 border-t-[#00E87C] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pagadas ({metrics.paidCount})
          </p>
          <p className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-[#00E87C]">
            {formatCOP(metrics.paidSum)}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] border-t-2 border-t-amber-400 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pendientes ({metrics.pendingCount})
          </p>
          <p className="mt-1 text-xl font-bold font-mono tabular-nums text-amber-500">
            {formatCOP(metrics.pendingSum)}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] border-t-2 border-t-[#FF4D6D] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Canceladas
          </p>
          <p className="mt-1 text-xl font-bold font-mono tabular-nums text-rose-500">
            {metrics.canceledCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar orden, cliente, producto o guía…"
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-white dark:bg-[#0B1525] text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['Todas', 'Pagada', 'Pendiente', 'Cancelada'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`min-h-[38px] px-3.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors border ${
                statusFilter === st
                  ? 'bg-sky-600 dark:bg-[#00C8FF] border-transparent text-white dark:text-[#050A14] font-semibold'
                  : 'bg-white dark:bg-[#0B1525] border-slate-200 dark:border-[#0D1E35] text-slate-600 dark:text-slate-300'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#0D1E35] text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3">Orden</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-3 py-3 text-center">Cant.</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Transporte / Guía</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#0D1E35] text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    No hay órdenes que coincidan con el filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-[#0E1A2E]/50">
                    <td className="px-4 py-3.5 font-mono font-semibold text-sky-600 dark:text-[#00C8FF] whitespace-nowrap">
                      {s.orden}
                      <p className="text-[11px] font-sans font-normal text-slate-400">
                        {s.fecha} {s.hora ? `· ${s.hora}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-900 dark:text-white">{s.cliente}</p>
                      <p className="text-xs text-slate-400">
                        {s.pago} · {s.origen || 'POS'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 max-w-[220px] truncate">
                      {s.producto}
                    </td>
                    <td className="px-3 py-3.5 text-center font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {s.qty}
                    </td>
                    <td className="px-4 py-3.5 font-mono tabular-nums font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatCOP(s.total)}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => openTrackingModal(s)}
                        className="text-left group"
                      >
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 group-hover:text-[#00C8FF]">
                          {s.transportadora || 'Asignar envío'}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400">
                          {s.guia || 'Sin guía'}
                        </p>
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={s.estado}
                        aria-label={`Estado de orden ${s.orden}`}
                        onChange={(e) =>
                          onUpdateSale({...s, estado: e.target.value as Sale['estado']})
                        }
                        className={`h-8 px-2.5 rounded-lg border text-xs font-semibold bg-transparent ${
                          s.estado === 'Pagada'
                            ? 'border-emerald-500/40 text-emerald-600 dark:text-[#00E87C]'
                            : s.estado === 'Pendiente'
                            ? 'border-amber-500/40 text-amber-600 dark:text-amber-400'
                            : 'border-rose-500/40 text-rose-600 dark:text-[#FF4D6D]'
                        }`}
                      >
                        <option value="Pagada" className="bg-white dark:bg-[#0B1525]">
                          Pagada
                        </option>
                        <option value="Pendiente" className="bg-white dark:bg-[#0B1525]">
                          Pendiente
                        </option>
                        <option value="Cancelada" className="bg-white dark:bg-[#0B1525]">
                          Cancelada
                        </option>
                      </select>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openTrackingModal(s)}
                          title="Editar guía de envío"
                          className="min-h-[36px] min-w-[36px] rounded-lg border border-slate-200 dark:border-[#0D1E35] text-slate-600 dark:text-slate-300 hover:border-[#00C8FF] hover:text-[#00C8FF] inline-flex items-center justify-center"
                        >
                          <Truck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onInspectSale(s)}
                          title="Imprimir / Ver recibo"
                          className="min-h-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-[#0D1E35] text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-[#00C8FF] hover:text-[#00C8FF] inline-flex items-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Recibo
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tracking / Guía Modal */}
      {trackingSale && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-[#0D1E35] flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Despacho y guía · {trackingSale.orden}
              </h3>
              <button
                type="button"
                onClick={() => setTrackingSale(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTracking} className="p-5 space-y-3 pb-safe">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Transportadora
                </label>
                <select
                  value={transportadora}
                  onChange={(e) => setTransportadora(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm text-slate-900 dark:text-white"
                >
                  <option value="Servientrega">Servientrega</option>
                  <option value="Coordinadora">Coordinadora</option>
                  <option value="Interrapidísimo">Interrapidísimo</option>
                  <option value="Envía">Envía</option>
                  <option value="Domicilio propio">Domicilio propio</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Número de guía
                </label>
                <input
                  value={guia}
                  onChange={(e) => setGuia(e.target.value)}
                  placeholder="Ej. SV-992014"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] font-mono text-sm text-slate-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full min-h-[46px] rounded-xl bg-sky-600 dark:bg-[#00C8FF] text-white dark:text-[#050A14] text-sm font-semibold"
              >
                {saving ? 'Guardando…' : 'Guardar envío'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
