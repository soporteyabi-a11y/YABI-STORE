import React, {useMemo, useState} from 'react';
import {
  Heart,
  MapPin,
  Minus,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Truck,
  X,
} from 'lucide-react';
import type {
  CartItem,
  Customer,
  EmpresaConfig,
  PaymentMethod,
  Product,
  StoreBanner,
} from '../types/yabi';
import {formatCOP} from '../utils/format';
import {ProductImage} from './ProductImage';

interface StorefrontViewProps {
  empresa: EmpresaConfig;
  products: Product[];
  banners: StoreBanner[];
  wishlist: string[];
  onToggleWishlist: (productId: string) => void;
  onPlaceOnlineOrder: (payload: {
    items: CartItem[];
    customer: Customer | null;
    discount: number;
    paymentMethod: PaymentMethod;
    cashReceived: number;
    customerNameOverride?: string;
    deliveryNotes?: string;
  }) => Promise<void>;
  onNotify: (msg: string, tone?: 'success' | 'info' | 'error') => void;
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  empresa,
  products,
  banners,
  wishlist,
  onToggleWishlist,
  onPlaceOnlineOrder,
  onNotify,
}) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [onlyWishlist, setOnlyWishlist] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [deliveryType, setDeliveryType] = useState<'Envío a domicilio' | 'Recoger en tienda física'>(
    'Envío a domicilio'
  );
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Wompi');
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const activeBanner = banners.find((b) => b.estado === 'Activo');

  const categories = useMemo(() => {
    const list = Array.from(
      new Set(products.filter((p) => p.estado === 'Activo').map((p) => p.cat))
    );
    return ['Todas', ...list];
  }, [products]);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (p.estado !== 'Activo') return false;
      if (onlyWishlist && !wishlist.includes(p.id)) return false;
      if (category !== 'Todas' && p.cat !== category) return false;
      if (!q) return true;
      return p.nombre.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q);
    });
  }, [products, category, search, onlyWishlist, wishlist]);

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.product.precio * i.qty, 0);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      onNotify('Producto temporalmente agotado', 'error');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((i) => (i.product.id === product.id ? {...i, qty: i.qty + 1} : i));
      }
      return [...prev, {product, qty: 1}];
    });
    onNotify(`${product.nombre} agregado al carrito`, 'success');
  };

  const changeQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === id ? {...i, qty: Math.min(i.product.stock, i.qty + delta)} : i))
        .filter((i) => i.qty > 0)
    );
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      await onPlaceOnlineOrder({
        items: cart,
        customer: null,
        discount: 0,
        paymentMethod,
        cashReceived: cartTotal,
        customerNameOverride: customerName.trim() || 'Comprador Tienda Online',
        deliveryNotes:
          deliveryType === 'Recoger en tienda física'
            ? `Recoger en tienda física (${[empresa.direccion, empresa.ciudad].filter(Boolean).join(', ') || 'Sede principal'})`
            : `Envío a domicilio: ${deliveryAddress.trim() || 'Por confirmar'}`,
      });
      setCart([]);
      setCustomerName('');
      setDeliveryAddress('');
      setCartOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      {/* Storefront Header Banner */}
      <div className="relative overflow-hidden bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-[#00C8FF]">
            {activeBanner
              ? activeBanner.titulo
              : 'Tienda Física & Catálogo en Línea · Stock en tiempo real'}
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {empresa.nombre}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            {activeBanner
              ? activeBanner.subtitulo
              : 'Compra en línea con envío nacional o recoge hoy mismo en nuestra tienda física.'}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#00C8FF]" />
              Sede física: {[empresa.direccion, empresa.ciudad].filter(Boolean).join(' · ') || 'Colombia'}
            </span>
            {empresa.telefono && (
              <span className="inline-flex items-center gap-1.5 font-mono">
                <Phone className="w-3.5 h-3.5 text-[#00E87C]" />
                {empresa.telefono}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="min-h-[46px] px-4 rounded-xl bg-slate-900 dark:bg-[#00C8FF] text-white dark:text-[#050A14] text-sm font-bold flex items-center justify-center gap-2.5 shrink-0 whitespace-nowrap"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Carrito ({cartCount})</span>
          <span className="font-mono tabular-nums opacity-90">{formatCOP(cartTotal)}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en catálogo físico y online…"
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200/80 dark:border-[#0D1E35] bg-white/65 dark:bg-[#0B1525]/45 text-sm text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 border ${
                category === cat
                  ? 'bg-slate-900 text-white border-transparent dark:bg-[#00C8FF] dark:text-[#050A14] font-semibold'
                  : 'bg-white/65 dark:bg-[#0B1525]/45 border-slate-200/80 dark:border-[#0D1E35] text-slate-600 dark:text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOnlyWishlist((v) => !v)}
            className={`min-h-[40px] px-3.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 flex items-center gap-1.5 border ${
              onlyWishlist
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400'
                : 'bg-white/65 dark:bg-[#0B1525]/45 border-slate-200/80 dark:border-[#0D1E35] text-slate-600 dark:text-slate-300'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${onlyWishlist ? 'fill-current' : ''}`} />
            Favoritos ({wishlist.length})
          </button>
        </div>
      </div>

      {/* Product Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleProducts.map((product) => {
          const isFav = wishlist.includes(product.id);
          return (
            <div
              key={product.id}
              className="bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="relative aspect-[4/3] bg-slate-100 dark:bg-[#070E1A] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDetailProduct(product)}
                  className="w-full h-full block text-left"
                >
                  <ProductImage
                    src={product.img}
                    alt={product.nombre}
                    category={product.cat}
                    className="w-full h-full hover:scale-[1.03] transition-transform duration-200"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onToggleWishlist(product.id)}
                  aria-label="Guardar en favoritos"
                  className="absolute top-2.5 right-2.5 min-h-[40px] min-w-[40px] rounded-xl bg-white/90 dark:bg-[#070E1A]/90 backdrop-blur-sm flex items-center justify-center text-slate-600 dark:text-slate-300"
                >
                  <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {product.cat} · {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
                  </p>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 line-clamp-2">
                    {product.nombre}
                  </h3>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatCOP(product.precio)}
                  </span>
                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={product.stock <= 0}
                    className="min-h-[40px] px-3.5 rounded-xl bg-sky-600 dark:bg-[#00C8FF] disabled:bg-slate-200 disabled:text-slate-400 text-white dark:text-[#050A14] text-xs font-bold whitespace-nowrap"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product Detail Modal */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
            <div className="relative aspect-[16/10] bg-slate-100 dark:bg-[#070E1A]">
              <ProductImage
                src={detailProduct.img}
                alt={detailProduct.nombre}
                category={detailProduct.cat}
                className="w-full h-full"
              />
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                className="absolute top-3 right-3 min-h-[44px] min-w-[44px] rounded-xl bg-white/90 dark:bg-[#070E1A]/90 flex items-center justify-center text-slate-700 dark:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 pb-safe">
              <div>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {detailProduct.sku} · {detailProduct.cat}
                </p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {detailProduct.nombre}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                  {detailProduct.desc ||
                    'Disponible para compra en línea o recogida inmediata en tienda física.'}
                </p>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {formatCOP(detailProduct.precio)}
                </span>
                <button
                  type="button"
                  disabled={detailProduct.stock <= 0}
                  onClick={() => {
                    addToCart(detailProduct);
                    setDetailProduct(null);
                  }}
                  className="min-h-[46px] px-5 rounded-xl bg-sky-600 dark:bg-[#00C8FF] text-white dark:text-[#050A14] text-sm font-bold"
                >
                  Agregar al carrito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Online Store Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#0B1525] h-full flex flex-col border-l border-slate-200 dark:border-[#0D1E35]">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-[#0D1E35] flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Carrito tienda online
              </h3>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-12">
                  Tu carrito está vacío.
                </p>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-[#0D1E35]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {item.product.nombre}
                      </p>
                      <p className="text-xs font-mono tabular-nums text-slate-500">
                        {formatCOP(item.product.precio * item.qty)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => changeQty(item.product.id, -1)}
                        className="w-9 h-9 rounded-lg border border-slate-200 dark:border-[#0D1E35] flex items-center justify-center"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-mono">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => changeQty(item.product.id, 1)}
                        className="w-9 h-9 rounded-lg border border-slate-200 dark:border-[#0D1E35] flex items-center justify-center"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <form
                onSubmit={handleCheckout}
                className="p-5 border-t border-slate-200 dark:border-[#0D1E35] space-y-3 pb-safe"
              >
                {/* Omnichannel delivery toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('Envío a domicilio')}
                    className={`min-h-[42px] px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      deliveryType === 'Envío a domicilio'
                        ? 'border-[#00C8FF] bg-[#00C8FF]/10 text-sky-700 dark:text-[#00C8FF]'
                        : 'border-slate-200 dark:border-[#0D1E35] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    Domicilio
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('Recoger en tienda física')}
                    className={`min-h-[42px] px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      deliveryType === 'Recoger en tienda física'
                        ? 'border-[#00E87C] bg-emerald-500/10 text-emerald-700 dark:text-[#00E87C]'
                        : 'border-slate-200 dark:border-[#0D1E35] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    Recoger en tienda
                  </button>
                </div>

                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nombre completo del comprador"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm text-slate-900 dark:text-white"
                />

                {deliveryType === 'Envío a domicilio' ? (
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Dirección y ciudad de entrega"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm text-slate-900 dark:text-white"
                  />
                ) : (
                  <p className="text-xs text-emerald-600 dark:text-[#00E87C] px-1">
                    Retiro sin costo en tienda física: {[empresa.direccion, empresa.ciudad].filter(Boolean).join(' · ') || 'Sede principal'}.
                  </p>
                )}

                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm text-slate-900 dark:text-white"
                >
                  <option value="Wompi">Wompi (Tarjeta / Nequi / PSE)</option>
                  <option value="Nequi">Nequi directo</option>
                  <option value="PSE">PSE</option>
                  <option value="Efectivo">
                    {deliveryType === 'Recoger en tienda física'
                      ? 'Pagar al recoger en tienda física'
                      : 'Pago contra entrega'}
                  </option>
                </select>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Total
                  </span>
                  <span className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatCOP(cartTotal)}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] rounded-xl bg-sky-600 dark:bg-[#00C8FF] text-white dark:text-[#050A14] text-sm font-bold"
                >
                  {submitting ? 'Confirmando pedido…' : 'Confirmar pedido'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
