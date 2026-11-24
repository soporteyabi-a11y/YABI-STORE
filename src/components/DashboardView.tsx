import React, {useMemo} from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  ClipboardList,
  DollarSign,
  Globe,
  Monitor,
  ShoppingCart,
  Store,
  Users,
  Zap,
} from 'lucide-react';
import type {Customer, Product, Purchase, Sale} from '../types/yabi';
import {formatCOP} from '../utils/format';
import {ProductImage} from './ProductImage';

interface DashboardViewProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  purchases: Purchase[];
  onNavigateTab: (
    tab:
      | 'sales'
      | 'customers'
      | 'inventory'
      | 'purchases'
      | 'pos'
      | 'reports'
      | 'storefront'
  ) => void;
  onInspectSale: (sale: Sale) => void;
  onQuickRestock: (product: Product) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sales,
  products,
  customers,
  purchases,
  onNavigateTab,
  onInspectSale,
  onQuickRestock,
}) => {
  const stats = useMemo(() => {
    const validSales = sales.filter((s) => s.estado !== 'Cancelada');
    const paidSales = sales.filter((s) => s.estado === 'Pagada');
    const pendingSales = sales.filter((s) => s.estado === 'Pendiente');
    const paidRevenue = paidSales.reduce((acc, s) => acc + s.total, 0);
    const activeCustomers = customers.filter((c) => c.estado === 'Activo').length;
    const lowStockProducts = products.filter(
      (p) => p.estado === 'Activo' && p.stock <= p.minStock
    );
    const pendingPurchases = purchases.filter((p) => p.estado === 'Pendiente').length;
    const totalAlerts = lowStockProducts.length + pendingPurchases;

    const posSales = validSales.filter((s) => (s.origen || 'POS') === 'POS');
    const webSales = validSales.filter((s) => s.origen === 'Tienda Online');
    const posRevenue = posSales.reduce((acc, s) => acc + s.total, 0);
    const webRevenue = webSales.reduce((acc, s) => acc + s.total, 0);

    const productMap = new Map<string, {name: string; total: number; qty: number}>();
    for (const s of validSales) {
      if (s.items && s.items.length > 0) {
        for (const item of s.items) {
          const prev = productMap.get(item.nombre) || {name: item.nombre, total: 0, qty: 0};
          prev.total += item.precio * item.qty;
          prev.qty += item.qty;
          productMap.set(item.nombre, prev);
        }
      } else {
        const prev = productMap.get(s.producto) || {name: s.producto, total: 0, qty: 0};
        prev.total += s.total;
        prev.qty += s.qty;
        productMap.set(s.producto, prev);
      }
    }

    const salesByProduct = Array.from(productMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    const maxProductTotal = salesByProduct[0]?.total || 1;

    return {
      paidCount: paidSales.length,
      pendingCount: pendingSales.length,
      paidRevenue,
      totalOrders: sales.length,
      activeCustomers,
      totalCustomers: customers.length,
      lowStockProducts,
      pendingPurchases,
      totalAlerts,
      salesByProduct,
      maxProductTotal,
      posCount: posSales.length,
      posRevenue,
      webCount: webSales.length,
      webRevenue,
    };
  }, [sales, products, customers, purchases]);

  const recentActivity = useMemo(() => sales.slice(0, 6), [sales]);

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* 4 KPI Cards with crisp 2px top border accents */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => onNavigateTab('sales')}
          className="text-left rounded-2xl bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] border-t-2 border-t-[#00C8FF] p-4 sm:p-5 transition-colors hover:border-[#00C8FF]/60"
        >
          <div className="w-9 h-9 rounded-xl bg-[#00C8FF]/10 text-[#00C8FF] flex items-center justify-center mb-3">
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Ventas pagadas
          </p>
          <p className="mt-1 text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatCOP(stats.paidRevenue)}
          </p>
          <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-[#00E87C]">
            {stats.paidCount} órdenes
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('sales')}
          className="text-left rounded-2xl bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] border-t-2 border-t-[#00E87C] p-4 sm:p-5 transition-colors hover:border-[#00E87C]/60"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-[#00E87C] flex items-center justify-center mb-3">
            <ClipboardList className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total órdenes
          </p>
          <p className="mt-1 text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {stats.totalOrders}
          </p>
          <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-[#00E87C]">
            {stats.pendingCount} pendientes
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('customers')}
          className="text-left rounded-2xl bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] border-t-2 border-t-[#A855F7] p-4 sm:p-5 transition-colors hover:border-[#A855F7]/60"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-[#A855F7] flex items-center justify-center mb-3">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Clientes activos
          </p>
          <p className="mt-1 text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {stats.activeCustomers}
          </p>
          <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-[#00E87C]">
            de {stats.totalCustomers} totales
          </p>
        </button>

        <button
          type="button"
          onClick={() =>
            onNavigateTab(stats.lowStockProducts.length > 0 ? 'inventory' : 'purchases')
          }
          className="text-left rounded-2xl bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] border-t-2 border-t-[#FF4D6D] p-4 sm:p-5 transition-colors hover:border-[#FF4D6D]/60"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-[#FF4D6D] flex items-center justify-center mb-3">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Alertas
          </p>
          <p className="mt-1 text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {stats.totalAlerts}
          </p>
          <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-[#FF4D6D]">
            {stats.lowStockProducts.length} stock · {stats.pendingPurchases} compras
          </p>
        </button>
      </div>

      {/* Omnichannel Split: Tienda Física (POS) + Tienda en Línea */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="rounded-2xl bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-[#00C8FF]/10 text-sky-600 dark:text-[#00C8FF] flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tienda Física · Caja POS
              </p>
              <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {formatCOP(stats.posRevenue)}{' '}
                <span className="text-xs font-sans font-normal text-slate-400">
                  · {stats.posCount} ventas
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('pos')}
            className="min-h-[38px] px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50/70 dark:bg-[#070E1A]/55 text-xs font-semibold text-slate-800 dark:text-[#00C8FF] hover:border-[#00C8FF] inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            <Monitor className="w-3.5 h-3.5" />
            Abrir POS
          </button>
        </div>

        <div className="rounded-2xl bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-[#00E87C] flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tienda en Línea · Catálogo Web
              </p>
              <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {formatCOP(stats.webRevenue)}{' '}
                <span className="text-xs font-sans font-normal text-slate-400">
                  · {stats.webCount} pedidos
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('storefront')}
            className="min-h-[38px] px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50/70 dark:bg-[#070E1A]/55 text-xs font-semibold text-slate-800 dark:text-[#00E87C] hover:border-[#00E87C] inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            <Globe className="w-3.5 h-3.5" />
            Ver Tienda
          </button>
        </div>
      </div>

      {/* Middle 2-Column Analytical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Ventas por producto */}
        <section className="rounded-2xl bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#00C8FF]" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Ventas por producto
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('reports')}
              className="text-xs font-medium text-sky-600 dark:text-[#00C8FF] hover:underline flex items-center gap-1"
            >
              Reportes
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats.salesByProduct.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aún no hay ventas registradas hoy.
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('pos')}
                className="mt-3 min-h-[40px] px-4 rounded-xl bg-sky-600 dark:bg-[#00C8FF] text-white dark:text-[#050A14] text-xs font-semibold"
              >
                Abrir Punto de Venta
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {stats.salesByProduct.map((item) => {
                const pct = Math.max(8, Math.round((item.total / stats.maxProductTotal) * 100));
                return (
                  <div
                    key={item.name}
                    className="grid grid-cols-[minmax(110px,1fr)_1.4fr_auto] items-center gap-3"
                  >
                    <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                      {item.name}
                    </span>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-[#070E1A] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sky-500 dark:bg-[#00C8FF]"
                        style={{width: `${pct}%`}}
                      />
                    </div>
                    <span className="text-xs font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                      {formatCOP(item.total)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Actividad reciente */}
        <section className="rounded-2xl bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Actividad reciente
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('sales')}
              className="text-xs font-medium text-sky-600 dark:text-[#00C8FF] hover:underline flex items-center gap-1"
            >
              Ver ventas
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Sin movimientos recientes.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#0D1E35]">
              {recentActivity.map((sale) => (
                <button
                  key={sale.id}
                  type="button"
                  onClick={() => onInspectSale(sale)}
                  className="w-full py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 dark:hover:bg-[#0E1A2E]/45 px-2 -mx-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        sale.estado === 'Pagada'
                          ? 'bg-[#00C8FF]'
                          : sale.estado === 'Pendiente'
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {sale.orden} · {sale.cliente} ·{' '}
                      <span className="font-mono tabular-nums font-semibold">
                        {formatCOP(sale.total)}
                      </span>{' '}
                      <span className="text-[11px] text-slate-400">
                        ({sale.origen === 'Tienda Online' ? 'Online' : 'Física'})
                      </span>
                    </span>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
                      sale.estado === 'Pagada'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-[#00E87C]'
                        : sale.estado === 'Pendiente'
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-[#FF4D6D]'
                    }`}
                  >
                    {sale.estado}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Bottom Full-Width Alertas de stock */}
      <section className="rounded-2xl bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-[#0D1E35] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Alertas de stock
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('inventory')}
            className="text-xs font-medium text-sky-600 dark:text-[#00C8FF] hover:underline"
          >
            Gestionar inventario
          </button>
        </div>

        {stats.lowStockProducts.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Todo tu catálogo está por encima del stock mínimo configurado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#0D1E35] text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-3">Producto</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Mínimo</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-5 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#0D1E35] text-sm">
                {stats.lowStockProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-[#0E1A2E]/45">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <ProductImage
                          src={p.img}
                          alt={p.nombre}
                          category={p.cat}
                          className="w-10 h-10 rounded-lg shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {p.nombre}
                          </p>
                          <p className="text-xs font-mono text-slate-400">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums font-bold text-amber-500">
                      {p.stock}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {p.minStock}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {p.proveedor || 'Sin asignar'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onQuickRestock(p)}
                        className="min-h-[36px] px-3 rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-[#00C8FF] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-sky-500/20 whitespace-nowrap"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Reponer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
