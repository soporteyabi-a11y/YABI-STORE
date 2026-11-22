import React, {useMemo, useState} from 'react';
import {
  Banknote,
  ChevronUp,
  CreditCard,
  Delete,
  Minus,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  Smartphone,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import type {CartItem, Customer, PaymentMethod, Product} from '../types/yabi';
import {formatCOP} from '../utils/format';
import {ProductImage} from './ProductImage';

interface PosViewProps {
  products: Product[];
  customers: Customer[];
  onCompleteSale: (payload: {
    items: CartItem[];
    customer: Customer | null;
    discount: number;
    paymentMethod: PaymentMethod;
    cashReceived: number;
  }) => Promise<void>;
  onNotify: (msg: string, tone?: 'success' | 'info' | 'error') => void;
}

const PAYMENT_METHODS: {id: PaymentMethod; label: string; icon: React.ComponentType<{className?: string}>}[] = [
  {id: 'Efectivo', label: 'Efectivo', icon: Banknote},
  {id: 'Nequi', label: 'Nequi', icon: Smartphone},
  {id: 'Tarjeta', label: 'Tarjeta', icon: CreditCard},
  {id: 'Wompi', label: 'Wompi', icon: QrCode},
];

export const PosView: React.FC<PosViewProps> = ({
  products,
  customers,
  onCompleteSale,
  onNotify,
}) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[4]?.id || customers[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [discountInput, setDiscountInput] = useState('');
  const [cashInput, setCashInput] = useState('');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [skuCode, setSkuCode] = useState('');
  const [processing, setProcessing] = useState(false);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.filter((p) => p.estado === 'Activo').map((p) => p.cat)));
    return ['Todas', ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (p.estado !== 'Activo') return false;
      if (category !== 'Todas' && p.cat !== category) return false;
      if (!q) return true;
      return (
        p.nombre.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.cat.toLowerCase().includes(q)
      );
    });
  }, [products, category, search]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.precio * item.qty, 0),
    [cart]
  );
  const discount = Math.min(subtotal, Math.max(0, Number(discountInput) || 0));
  const total = Math.max(0, subtotal - discount);
  const cashReceived = Number(cashInput) || 0;
  const change = paymentMethod === 'Efectivo' && cashReceived > total ? cashReceived - total : 0;
  const totalUnits = cart.reduce((sum, i) => sum + i.qty, 0);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      onNotify(`${product.nombre} no tiene stock disponible`, 'error');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          onNotify(`Stock máximo alcanzado para ${product.nombre}`, 'info');
          return prev;
        }
        return prev.map((i) => (i.product.id === product.id ? {...i, qty: i.qty + 1} : i));
      }
      return [...prev, {product, qty: 1}];
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const next = item.qty + delta;
          if (next > item.product.stock) {
            onNotify(`Solo hay ${item.product.stock} unidades disponibles`, 'info');
            return item;
          }
          return {...item, qty: next};
        })
        .filter((item) => item.qty > 0)
    );
  };

  const handleQuickSkuAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const code = skuCode.trim().toLowerCase();
    if (!code) return;
    const match = products.find(
      (p) => p.sku.toLowerCase() === code || p.id.toLowerCase() === code || p.nombre.toLowerCase().includes(code)
    );
    if (!match) {
      onNotify(`No se encontró ningún producto con código "${skuCode}"`, 'error');
      return;
    }
    addToCart(match);
    setSkuCode('');
    setSkuModalOpen(false);
    onNotify(`Agregado: ${match.nombre}`, 'success');
  };

  const appendCashDigit = (val: string) => {
    setCashInput((prev) => {
      const next = (prev === '0' ? '' : prev) + val;
      return next.slice(0, 9);
    });
  };

  const backspaceCash = () => {
    setCashInput((prev) => prev.slice(0, -1));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      onNotify('Agrega al menos un producto al ticket', 'info');
      return;
    }
    if (paymentMethod === 'Efectivo' && cashReceived > 0 && cashReceived < total) {
      onNotify('El efectivo recibido es menor al total a cobrar', 'error');
      return;
    }
    setProcessing(true);
    try {
      const customer = customers.find((c) => c.id === selectedCustomerId) || null;
      await onCompleteSale({
        items: cart,
        customer,
        discount,
        paymentMethod,
        cashReceived: paymentMethod === 'Efectivo' ? cashReceived || total : total,
      });
      setCart([]);
      setDiscountInput('');
      setCashInput('');
      setMobileSheetOpen(false);
    } finally {
      setProcessing(false);
    }
  };

  const renderTicketContent = () => (
    <div className="flex flex-col h-full">
      {/* Customer selector */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
        <select
          value={selectedCustomerId}
          onChange={(e) => setSelectedCustomerId(e.target.value)}
          aria-label="Seleccionar cliente"
          className="flex-1 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none truncate"
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900">
              {c.nombre}
            </option>
          ))}
        </select>
        {cart.length > 0 && (
          <button
            onClick={() => setCart([])}
            className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded-md transition-colors whitespace-nowrap"
          >
            Vaciar
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 min-h-[160px] max-h-[340px] lg:max-h-none">
        {cart.length === 0 ? (
          <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center px-4">
            <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Ticket vacío
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Toca un producto o busca por SKU para iniciar la venta
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.product.id}
              className="flex items-center justify-between gap-2.5 py-2 border-b border-slate-100 dark:border-slate-800/80 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {item.product.nombre}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {formatCOP(item.product.precio)} c/u · {item.product.sku}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => changeQty(item.product.id, -1)}
                  className="min-h-[36px] min-w-[36px] rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Disminuir cantidad"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-7 text-center text-sm font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
                  {item.qty}
                </span>
                <button
                  onClick={() => changeQty(item.product.id, 1)}
                  className="min-h-[36px] min-w-[36px] rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Aumentar cantidad"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => changeQty(item.product.id, -item.qty)}
                  className="min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 ml-0.5"
                  aria-label="Quitar producto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment & Totals */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-3">
        {/* Payment Method Segmented Control */}
        <div className="grid grid-cols-4 gap-1.5">
          {PAYMENT_METHODS.map((pm) => {
            const Icon = pm.icon;
            const active = paymentMethod === pm.id;
            return (
              <button
                key={pm.id}
                type="button"
                onClick={() => setPaymentMethod(pm.id)}
                className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-medium flex flex-col items-center justify-center gap-1 border transition-colors ${
                  active
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate">{pm.label}</span>
              </button>
            );
          })}
        </div>

        {/* Discount & Cash Quick Controls */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              Descuento (COP)
            </label>
            <input
              type="number"
              min={0}
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              placeholder="0"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          {paymentMethod === 'Efectivo' ? (
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Recibido (COP)
              </label>
              <input
                type="number"
                min={0}
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                placeholder={String(total)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          ) : (
            <div className="flex flex-col justify-end">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Confirmación digital
              </span>
              <div className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center text-xs text-slate-600 dark:text-slate-300">
                Cobro exacto {paymentMethod}
              </div>
            </div>
          )}
        </div>

        {/* Tactile Numpad & Denominations for Cash */}
        {paymentMethod === 'Efectivo' && (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-1.5">
              {[20000, 50000, 100000].map((bill) => (
                <button
                  key={bill}
                  type="button"
                  onClick={() => setCashInput(String(bill))}
                  className="min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ${bill / 1000}k
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCashInput(String(total))}
                className="min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Exacto
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => appendCashDigit(key)}
                  className="min-h-[40px] rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-mono font-semibold text-slate-800 dark:text-slate-100 active:scale-[0.97] transition-transform"
                >
                  {key}
                </button>
              ))}
              <button
                type="button"
                onClick={backspaceCash}
                aria-label="Borrar dígito"
                className="min-h-[40px] rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-[0.97] transition-transform"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Totals Summary */}
        <div className="space-y-1 pt-1 text-sm">
          <div className="flex justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Subtotal ({totalUnits} ítems)</span>
            <span className="font-mono tabular-nums">{formatCOP(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-xs">
              <span>Descuento</span>
              <span className="font-mono tabular-nums">-{formatCOP(discount)}</span>
            </div>
          )}
          {paymentMethod === 'Efectivo' && change > 0 && (
            <div className="flex justify-between text-sky-600 dark:text-sky-400 text-xs font-medium">
              <span>Cambio a devolver</span>
              <span className="font-mono tabular-nums">{formatCOP(change)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-1">
            <span className="font-semibold text-slate-900 dark:text-white">Total a cobrar</span>
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {formatCOP(total)}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={cart.length === 0 || processing}
          onClick={handleCheckout}
          className="w-full min-h-[48px] rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 text-white font-semibold text-sm transition-colors active:scale-[0.99]"
        >
          {processing ? 'Registrando venta…' : `Cobrar ${formatCOP(total)}`}
        </button>
      </div>
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-6 items-start">
      {/* Left Column: Product Grid & Quick Search */}
      <div className="lg:col-span-7 space-y-4 pb-36 lg:pb-6">
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto o SKU…"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setSkuModalOpen(true)}
            className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 shrink-0 whitespace-nowrap"
          >
            <QrCode className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span className="hidden sm:inline">Código / SKU</span>
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`min-h-[40px] px-3.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              No hay productos que coincidan con tu búsqueda
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategory('Todas');
              }}
              className="mt-3 px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map((product) => {
              const inCart = cart.find((i) => i.product.id === product.id)?.qty || 0;
              const lowStock = product.stock <= product.minStock;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                  className="group text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-500/60 dark:hover:border-sky-400/50 rounded-2xl overflow-hidden transition-all active:scale-[0.98] disabled:opacity-50 flex flex-col"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <ProductImage
                      src={product.img}
                      alt={product.nombre}
                      category={product.cat}
                      className="w-full h-full group-hover:scale-[1.02] transition-transform duration-200"
                    />
                    {inCart > 0 && (
                      <span className="absolute top-2 right-2 min-w-[26px] h-[26px] px-1.5 rounded-lg bg-sky-600 text-white text-xs font-mono font-bold flex items-center justify-center shadow">
                        {inCart}
                      </span>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                        {product.sku} · {product.cat}
                      </p>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 mt-0.5 leading-snug">
                        {product.nombre}
                      </h3>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 pt-1">
                      <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                        {formatCOP(product.precio)}
                      </span>
                      <span
                        className={`text-[11px] font-mono tabular-nums ${
                          product.stock <= 0
                            ? 'text-red-500 font-semibold'
                            : lowStock
                            ? 'text-amber-600 dark:text-amber-400 font-medium'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {product.stock <= 0 ? 'Agotado' : `${product.stock} disp.`}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Desktop Sticky Ticket */}
      <div className="hidden lg:block lg:col-span-5 sticky top-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Ticket de venta
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {totalUnits} {totalUnits === 1 ? 'unidad' : 'unidades'}
          </span>
        </div>
        {renderTicketContent()}
      </div>

      {/* Mobile Floating Ticket Bar above Bottom Nav */}
      <div className="lg:hidden fixed left-3 right-3 bottom-[72px] z-30 pb-safe">
        <button
          type="button"
          onClick={() => setMobileSheetOpen(true)}
          className="w-full min-h-[52px] px-4 rounded-2xl bg-slate-900 dark:bg-sky-600 text-white shadow-xl flex items-center justify-between gap-3 active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ShoppingBag className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold truncate">
              {totalUnits === 0
                ? 'Ticket vacío'
                : `Ver Ticket · ${totalUnits} ${totalUnits === 1 ? 'ítem' : 'ítems'}`}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-bold font-mono tabular-nums">{formatCOP(total)}</span>
            <ChevronUp className="w-4 h-4 opacity-80" />
          </div>
        </button>
      </div>

      {/* Mobile Bottom Sheet Ticket Drawer */}
      {mobileSheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="pt-2.5 pb-1 flex justify-center">
              <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Ticket de venta
              </h3>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500"
                aria-label="Cerrar ticket"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">{renderTicketContent()}</div>
          </div>
        </div>
      )}

      {/* Quick SKU / Barcode Modal */}
      {skuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Ingreso rápido por SKU
              </h3>
              <button
                type="button"
                onClick={() => setSkuModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleQuickSkuAdd} className="p-5 space-y-4 pb-safe">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Escribe o escanea con lector USB/Bluetooth el código SKU (ej. <span className="font-mono">ROP-001</span>, <span className="font-mono">CAL-002</span>).
              </p>
              <input
                type="text"
                autoFocus
                value={skuCode}
                onChange={(e) => setSkuCode(e.target.value)}
                placeholder="Ej. ROP-001"
                className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-base text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="submit"
                className="w-full min-h-[46px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold"
              >
                Agregar al ticket
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
