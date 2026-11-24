import React, {useMemo, useState} from 'react';
import {Download, Receipt} from 'lucide-react';
import type {Product, Sale} from '../types/yabi';
import {downloadCSV, formatCOP} from '../utils/format';

interface ReportsViewProps {
  sales: Sale[];
  products: Product[];
  onInspectSale: (sale: Sale) => void;
  onNotify: (msg: string, tone?: 'success' | 'info' | 'error') => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  sales,
  products,
  onInspectSale,
  onNotify,
}) => {
  const [channelFilter, setChannelFilter] = useState<'all' | 'POS' | 'Tienda Online'>('all');

  const filteredSales = useMemo(() => {
    if (channelFilter === 'all') return sales;
    return sales.filter((s) => (s.origen || 'POS') === channelFilter);
  }, [sales, channelFilter]);

  const stats = useMemo(() => {
    const revenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalCost = filteredSales.reduce((sum, s) => {
      if (typeof s.costoTotal === 'number') return sum + s.costoTotal;
      const prod = products.find((p) => p.id === s.productoId);
      return sum + (prod ? prod.costo * s.qty : Math.round(s.total * 0.55));
    }, 0);
    const profit = Math.max(0, revenue - totalCost);
    const marginPct = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    const avgTicket = filteredSales.length > 0 ? Math.round(revenue / filteredSales.length) : 0;

    const byPayment = new Map<string, number>();
    for (const s of filteredSales) {
      byPayment.set(s.pago, (byPayment.get(s.pago) || 0) + s.total);
    }

    const byProduct = new Map<string, {name: string; qty: number; total: number}>();
    for (const s of filteredSales) {
      if (s.items && s.items.length > 0) {
        for (const it of s.items) {
          const cur = byProduct.get(it.nombre) || {name: it.nombre, qty: 0, total: 0};
          cur.qty += it.qty;
          cur.total += it.precio * it.qty;
          byProduct.set(it.nombre, cur);
        }
      } else {
        const cur = byProduct.get(s.producto) || {name: s.producto, qty: 0, total: 0};
        cur.qty += s.qty;
        cur.total += s.total;
        byProduct.set(s.producto, cur);
      }
    }

    const topProducts = Array.from(byProduct.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const paymentBreakdown = Array.from(byPayment.entries()).sort((a, b) => b[1] - a[1]);

    return {revenue, profit, marginPct, avgTicket, topProducts, paymentBreakdown};
  }, [filteredSales, products]);

  const handleExportCSV = () => {
    downloadCSV(
      `yabi-store-ventas-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Orden', 'Fecha', 'Hora', 'Canal', 'Cliente', 'Producto', 'Cantidad', 'Pago', 'Total COP', 'Estado'],
      filteredSales.map((s) => [
        s.orden,
        s.fecha,
        s.hora || '',
        s.origen || 'POS',
        s.cliente,
        s.producto,
        s.qty,
        s.pago,
        s.total,
        s.estado,
      ])
    );
    onNotify('Reporte CSV descargado para contabilidad', 'success');
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center p-1 bg-slate-100/70 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-xl w-fit">
          {(
            [
              {id: 'all', label: 'Todos los canales'},
              {id: 'POS', label: 'Caja POS'},
              {id: 'Tienda Online', label: 'Tienda Online'},
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setChannelFilter(tab.id)}
              className={`min-h-[38px] px-3.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                channelFilter === tab.id
                  ? 'bg-white/90 dark:bg-[#0F1E34]/80 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="min-h-[44px] px-4 rounded-xl border border-slate-200/80 dark:border-[#0D1E35] bg-white/65 dark:bg-[#0B1525]/45 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50/80 dark:hover:bg-[#0E1A2E]/60 flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          Exportar CSV
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Ingresos totales</p>
          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1 truncate">
            {formatCOP(stats.revenue)}
          </p>
        </div>
        <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Utilidad estimada</p>
          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1 truncate">
            {formatCOP(stats.profit)}
          </p>
        </div>
        <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Margen bruto</p>
          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {stats.marginPct}%
          </p>
        </div>
        <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Ticket promedio</p>
          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1 truncate">
            {formatCOP(stats.avgTicket)}
          </p>
        </div>
      </div>

      {/* Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Recaudo por método de pago
          </h3>
          {stats.paymentBreakdown.length === 0 ? (
            <p className="text-xs text-slate-500">Sin ventas registradas.</p>
          ) : (
            <div className="space-y-3">
              {stats.paymentBreakdown.map(([method, amount]) => {
                const pct = stats.revenue > 0 ? Math.round((amount / stats.revenue) * 100) : 0;
                return (
                  <div key={method} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{method}</span>
                      <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                        {formatCOP(amount)} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sky-600"
                        style={{width: `${pct}%`}}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Productos más vendidos
          </h3>
          {stats.topProducts.length === 0 ? (
            <p className="text-xs text-slate-500">Sin ventas registradas.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.topProducts.map((item) => (
                <div key={item.name} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">{item.qty} uds.</p>
                  </div>
                  <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white shrink-0">
                    {formatCOP(item.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sales Ledger */}
      <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Historial de ventas ({filteredSales.length})
          </h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredSales.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Aún no hay ventas en este filtro.
            </p>
          ) : (
            filteredSales.map((s) => (
              <div
                key={s.id}
                className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-[#0E1A2E]/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {s.orden}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{s.fecha}</span>
                    <span aria-hidden="true">·</span>
                    <span>{s.origen || 'POS'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{s.pago}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate mt-0.5">
                    {s.producto} — {s.cliente}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatCOP(s.total)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onInspectSale(s)}
                    className="min-h-[40px] min-w-[40px] rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="Ver recibo"
                  >
                    <Receipt className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
