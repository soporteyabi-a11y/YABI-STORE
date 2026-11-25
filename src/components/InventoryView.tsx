import React, {useMemo, useState} from 'react';
import {AlertTriangle, Edit3, Minus, Plus, Search, Trash2, Upload, X} from 'lucide-react';
import type {Product} from '../types/yabi';
import {uploadImageToStorage} from '../services/yabiDb';
import {formatCOP, genId} from '../utils/format';
import {ProductImage} from './ProductImage';

interface InventoryViewProps {
  empresaId: string;
  isCloudConnected: boolean;
  products: Product[];
  onSaveProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onAdjustStock: (productId: string, delta: number) => Promise<void>;
  onNotify: (msg: string, tone?: 'success' | 'info' | 'error') => void;
}

const EMPTY_FORM: Omit<Product, 'id'> = {
  nombre: '',
  sku: '',
  cat: 'Ropa',
  precio: 0,
  costo: 0,
  stock: 0,
  minStock: 5,
  proveedor: '',
  estado: 'Activo',
  desc: '',
  destacado: false,
};

export const InventoryView: React.FC<InventoryViewProps> = ({
  empresaId,
  isCloudConnected,
  products,
  onSaveProduct,
  onDeleteProduct,
  onAdjustStock,
  onNotify,
}) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low' | 'out'>('all');
  const [editing, setEditing] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<Omit<Product, 'id'>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadPct(5);
    try {
      if (isCloudConnected) {
        const url = await uploadImageToStorage(empresaId, 'productos', file, (pct) =>
          setUploadPct(pct)
        );
        setForm((prev) => ({...prev, img: url}));
        onNotify('Imagen subida a Supabase Storage', 'success');
      } else {
        const reader = new FileReader();
        reader.onload = () => setForm((prev) => ({...prev, img: String(reader.result || '')}));
        reader.readAsDataURL(file);
        onNotify('Imagen cargada en modo local', 'info');
      }
    } catch {
      onNotify('Error al subir imagen a Supabase Storage', 'error');
    } finally {
      setUploadPct(null);
    }
  };

  const metrics = useMemo(() => {
    const activeCount = products.filter((p) => p.estado === 'Activo').length;
    const lowCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
    const outCount = products.filter((p) => p.stock <= 0).length;
    const inventoryValue = products.reduce((sum, p) => sum + p.costo * p.stock, 0);
    return {activeCount, lowCount, outCount, inventoryValue};
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (filterMode === 'low' && !(p.stock > 0 && p.stock <= p.minStock)) return false;
      if (filterMode === 'out' && p.stock > 0) return false;
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.cat.toLowerCase().includes(q)
      );
    });
  }, [products, search, filterMode]);

  const openCreate = () => {
    setEditing(null);
    setForm({...EMPTY_FORM, sku: `SKU-${String(products.length + 1).padStart(3, '0')}`});
    setIsModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      nombre: p.nombre,
      sku: p.sku,
      cat: p.cat,
      precio: p.precio,
      costo: p.costo,
      stock: p.stock,
      minStock: p.minStock,
      proveedor: p.proveedor || '',
      img: p.img,
      estado: p.estado,
      desc: p.desc || '',
      destacado: p.destacado || false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.sku.trim()) return;
    setSaving(true);
    try {
      const payload: Product = {
        ...form,
        id: editing ? editing.id : genId('P'),
        precio: Math.max(0, Number(form.precio) || 0),
        costo: Math.max(0, Number(form.costo) || 0),
        stock: Math.max(0, Number(form.stock) || 0),
        minStock: Math.max(0, Number(form.minStock) || 0),
      };
      await onSaveProduct(payload);
      setIsModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Productos activos</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {metrics.activeCount}
          </p>
        </div>
        <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Stock bajo</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {metrics.lowCount}
          </p>
        </div>
        <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Agotados</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400 mt-1">
            {metrics.outCount}
          </p>
        </div>
        <div className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Costo en bodega</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1 truncate">
            {formatCOP(metrics.inventoryValue)}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, SKU o categoría…"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200/80 dark:border-[#0D1E35] bg-white/65 dark:bg-[#0B1525]/45 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center p-1 bg-slate-100/70 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-xl">
            {(
              [
                {id: 'all', label: 'Todos'},
                {id: 'low', label: 'Stock bajo'},
                {id: 'out', label: 'Agotados'},
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  filterMode === tab.id
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
            onClick={openCreate}
            className="min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
        </div>
      </div>

      {/* Desktop High-Density Table */}
      <div className="hidden md:block bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-medium">Producto</th>
                <th className="py-3 px-4 font-medium">SKU / Categoría</th>
                <th className="py-3 px-4 font-medium text-right">Costo</th>
                <th className="py-3 px-4 font-medium text-right">Precio</th>
                <th className="py-3 px-4 font-medium text-center">Stock</th>
                <th className="py-3 px-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    No hay productos registrados en esta vista.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isLow = p.stock > 0 && p.stock <= p.minStock;
                  const isOut = p.stock <= 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-[#0E1A2E]/40">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <ProductImage
                            src={p.img}
                            alt={p.nombre}
                            category={p.cat}
                            className="w-10 h-10 rounded-lg shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate max-w-[260px]">
                              {p.nombre}
                            </p>
                            {p.proveedor && (
                              <p className="text-xs text-slate-400 truncate">{p.proveedor}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono text-slate-700 dark:text-slate-300">{p.sku}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{p.cat}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {formatCOP(p.costo)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                        {formatCOP(p.precio)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onAdjustStock(p.id, -1)}
                            disabled={p.stock <= 0}
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                            aria-label="Restar stock"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span
                            className={`w-12 text-center font-mono tabular-nums font-semibold ${
                              isOut
                                ? 'text-red-600 dark:text-red-400'
                                : isLow
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {p.stock}
                          </span>
                          <button
                            type="button"
                            onClick={() => onAdjustStock(p.id, 1)}
                            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            aria-label="Sumar stock"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            aria-label="Editar producto"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProduct(p.id)}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            aria-label="Eliminar producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Touch Card List */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((p) => {
          const isLow = p.stock > 0 && p.stock <= p.minStock;
          const isOut = p.stock <= 0;
          return (
            <div
              key={p.id}
              className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-3.5 space-y-3"
            >
              <div className="flex items-start gap-3">
                <ProductImage
                  src={p.img}
                  alt={p.nombre}
                  category={p.cat}
                  className="w-14 h-14 rounded-xl shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {p.sku} · {p.cat}
                  </p>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {p.nombre}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                      {formatCOP(p.precio)}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 font-mono tabular-nums">
                      Costo {formatCOP(p.costo)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Editar"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs">
                  {(isLow || isOut) && (
                    <AlertTriangle
                      className={`w-3.5 h-3.5 ${isOut ? 'text-red-500' : 'text-amber-500'}`}
                    />
                  )}
                  <span
                    className={
                      isOut
                        ? 'text-red-600 dark:text-red-400 font-medium'
                        : isLow
                        ? 'text-amber-600 dark:text-amber-400 font-medium'
                        : 'text-slate-500 dark:text-slate-400'
                    }
                  >
                    {isOut ? 'Sin existencias' : isLow ? `Stock bajo (mín. ${p.minStock})` : 'Stock disponible'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onAdjustStock(p.id, -1)}
                    disabled={p.stock <= 0}
                    className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-40"
                    aria-label="Restar 1"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-9 text-center font-mono font-bold tabular-nums text-sm text-slate-900 dark:text-white">
                    {p.stock}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAdjustStock(p.id, 1)}
                    className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
                    aria-label="Sumar 1"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {editing ? 'Editar producto' : 'Nuevo producto'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto pb-safe">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nombre del producto
                  </label>
                  <input
                    required
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({...form, nombre: e.target.value})}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Código SKU
                  </label>
                  <input
                    required
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({...form, sku: e.target.value.toUpperCase()})}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Categoría
                  </label>
                  <select
                    value={form.cat}
                    onChange={(e) => setForm({...form, cat: e.target.value})}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    {['Ropa', 'Calzado', 'Alimentos', 'Accesorios', 'Hogar', 'Tecnología'].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Precio venta (COP)
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={form.precio}
                    onChange={(e) => setForm({...form, precio: Number(e.target.value)})}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Costo compra (COP)
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={form.costo}
                    onChange={(e) => setForm({...form, costo: Number(e.target.value)})}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Stock actual
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={form.stock}
                    onChange={(e) => setForm({...form, stock: Number(e.target.value)})}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Alerta mínimo
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={form.minStock}
                    onChange={(e) => setForm({...form, minStock: Number(e.target.value)})}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Foto del producto (Supabase Storage o cámara)
                  </label>
                  <div className="flex items-center gap-3">
                    <ProductImage
                      src={form.img}
                      alt={form.nombre || 'Vista previa'}
                      category={form.cat}
                      className="w-14 h-14 rounded-xl shrink-0"
                    />
                    <label className="flex-1 min-h-[46px] px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 cursor-pointer hover:border-sky-500">
                      <Upload className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>
                        {uploadPct !== null
                          ? `Subiendo ${uploadPct}%…`
                          : form.img
                          ? 'Cambiar imagen'
                          : 'Subir foto o tomar con cámara'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                {editing && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onDeleteProduct(editing.id);
                      setIsModalOpen(false);
                    }}
                    className="min-h-[46px] px-4 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-medium"
                  >
                    Eliminar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 min-h-[46px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold"
                >
                  {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
