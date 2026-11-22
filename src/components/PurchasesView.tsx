import React, {useMemo, useState} from 'react';
import {CheckCircle2, Clock, PackageCheck, Plus, Search, X} from 'lucide-react';
import type {Product, Purchase, Supplier} from '../types/yabi';
import {formatCOP, genId, todayISO} from '../utils/format';

interface PurchasesViewProps {
  purchases: Purchase[];
  products: Product[];
  suppliers: Supplier[];
  onCreatePurchase: (purchase: Purchase) => Promise<void>;
  onReceivePurchase: (purchase: Purchase) => Promise<void>;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  purchases,
  products,
  suppliers,
  onCreatePurchase,
  onReceivePurchase,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pendiente' | 'Recibida'>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [selectedSupplier, setSelectedSupplier] = useState(suppliers[0]?.empresa || '');
  const [qty, setQty] = useState(10);
  const [costoUnit, setCostoUnit] = useState(products[0]?.costo || 0);
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const metrics = useMemo(() => {
    const pending = purchases.filter((p) => p.estado === 'Pendiente');
    const received = purchases.filter((p) => p.estado === 'Recibida');
    const totalInvested = purchases.reduce((sum, p) => sum + p.total, 0);
    return {
      totalCount: purchases.length,
      pendingCount: pending.length,
      receivedCount: received.length,
      totalInvested,
    };
  }, [purchases]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchases.filter((p) => {
      if (statusFilter !== 'all' && p.estado !== statusFilter) return false;
      if (!q) return true;
      return (
        p.orden.toLowerCase().includes(q) ||
        p.producto.toLowerCase().includes(q) ||
        p.proveedor.toLowerCase().includes(q)
      );
    });
  }, [purchases, search, statusFilter]);

  const openModal = () => {
    const firstProd = products[0];
    setSelectedProductId(firstProd?.id || '');
    setCostoUnit(firstProd?.costo || 0);
    setSelectedSupplier(firstProd?.proveedor || suppliers[0]?.empresa || '');
    setQty(10);
    setNotas('');
    setModalOpen(true);
  };

  const handleProductChange = (pid: string) => {
    setSelectedProductId(pid);
    const prod = products.find((p) => p.id === pid);
    if (prod) {
      setCostoUnit(prod.costo);
      if (prod.proveedor) setSelectedSupplier(prod.proveedor);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod || qty <= 0) return;
    setSaving(true);
    try {
      const ordenNum = `OC-${202 + purchases.length}`;
      const purchase: Purchase = {
        id: genId('OC'),
        orden: ordenNum,
        proveedor: selectedSupplier || 'Proveedor General',
        productoId: prod.id,
        producto: prod.nombre,
        qty: Math.max(1, Number(qty)),
        costo: Math.max(0, Number(costoUnit)),
        total: Math.max(1, Number(qty)) * Math.max(0, Number(costoUnit)),
        fecha: todayISO(),
        estado: 'Pendiente',
        notas: notas.trim(),
      };
      await onCreatePurchase(purchase);
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Órdenes registradas</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {metrics.totalCount}
          </p>
        </div>
        <div className="bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Por recibir</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {metrics.pendingCount}
          </p>
        </div>
        <div className="bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Recibidas en bodega</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {metrics.receivedCount}
          </p>
        </div>
        <div className="bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total en compras</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1 truncate">
            {formatCOP(metrics.totalInvested)}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar orden, producto o proveedor…"
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-xl">
            {(
              [
                {id: 'all', label: 'Todas'},
                {id: 'Pendiente', label: 'Pendientes'},
                {id: 'Recibida', label: 'Recibidas'},
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={openModal}
            className="min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nueva compra
          </button>
        </div>
      </div>

      {/* Purchase Orders List */}
      <div className="bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-2xl overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              No hay órdenes de compra en esta vista.
            </p>
          ) : (
            filtered.map((c) => {
              const isPending = c.estado === 'Pendiente';
              return (
                <div
                  key={c.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {c.orden}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{c.fecha}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          isPending
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isPending ? (
                          <Clock className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        {c.estado}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {c.qty}x {c.producto}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      Proveedor: {c.proveedor}
                      {c.notas ? ` · ${c.notas}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                        {formatCOP(c.total)}
                      </p>
                      <p className="text-[11px] font-mono tabular-nums text-slate-400">
                        {formatCOP(c.costo)} c/u
                      </p>
                    </div>

                    {isPending && (
                      <button
                        type="button"
                        onClick={() => onReceivePurchase(c)}
                        className="min-h-[42px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <PackageCheck className="w-4 h-4" />
                        Recibir stock
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Purchase Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Nueva orden de compra
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
                  Producto a reponer
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Proveedor
                </label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.empresa}>
                      {s.empresa}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Costo unitario (COP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={costoUnit}
                    onChange={(e) => setCostoUnit(Number(e.target.value))}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notas
                </label>
                <input
                  type="text"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej. Entrega en bodega principal"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between pt-1 text-sm">
                <span className="text-slate-500">Total orden</span>
                <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatCOP((Number(qty) || 0) * (Number(costoUnit) || 0))}
                </span>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full min-h-[46px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold"
              >
                {saving ? 'Creando orden…' : 'Guardar orden de compra'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
