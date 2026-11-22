import React, {useCallback, useEffect, useState} from 'react';
import {
  BarChart3,
  Calculator,
  Download,
  LogIn,
  Menu,
  Moon,
  Package,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Sun,
  Truck,
  UserCog,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import {AuthModal} from './components/AuthModal';
import {CustomersView} from './components/CustomersView';
import {InventoryView} from './components/InventoryView';
import {MobileNativeHubView} from './components/MobileNativeHubView';
import {PosView} from './components/PosView';
import {PurchasesView} from './components/PurchasesView';
import {ReceiptModal} from './components/ReceiptModal';
import {ReportsView} from './components/ReportsView';
import {StorefrontView} from './components/StorefrontView';
import {TeamView} from './components/TeamView';
import {
  DEMO_BANNERS,
  DEMO_CUSTOMERS,
  DEMO_EMPLOYEES,
  DEMO_EMPRESA,
  DEMO_PRODUCTS,
  DEMO_PURCHASES,
  DEMO_SALES,
  DEMO_SUPPLIERS,
} from './data/demoSeed';
import {useOnlineStatus, usePWAInstall} from './hooks/usePWAInstall';
import {
  commitSaleCloud,
  createEmployeeCloud,
  deleteBannerCloud,
  deleteEmployeeCloud,
  deleteProductCloud,
  loadUserContext,
  localStore,
  receivePurchaseCloud,
  saveBannerCloud,
  saveCustomerCloud,
  saveEmpresaConfigCloud,
  saveProductCloud,
  savePurchaseCloud,
  saveSupplierCloud,
  subscribeEmpresaRealtime,
  yabiAuth,
} from './services/yabiDb';
import type {
  AppTab,
  CartItem,
  Customer,
  EmpresaConfig,
  PaymentMethod,
  Product,
  Purchase,
  Sale,
  StoreBanner,
  Supplier,
  ToastMessage,
  UserProfile,
} from './types/yabi';
import {currentTimeHM, genId, todayISO} from './utils/format';

const NAV_ITEMS: {
  id: AppTab;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<{className?: string}>;
}[] = [
  {id: 'pos', label: 'Punto de Venta', mobileLabel: 'POS', icon: Calculator},
  {id: 'inventory', label: 'Inventario', mobileLabel: 'Stock', icon: Package},
  {id: 'purchases', label: 'Compras', mobileLabel: 'Compras', icon: Truck},
  {id: 'storefront', label: 'Tienda Online', mobileLabel: 'Tienda', icon: ShoppingBag},
  {id: 'customers', label: 'Clientes y Proveedores', mobileLabel: 'Clientes', icon: Users},
  {id: 'team', label: 'Equipo y Empleados', mobileLabel: 'Equipo', icon: UserCog},
  {id: 'reports', label: 'Reportes', mobileLabel: 'Reportes', icon: BarChart3},
  {id: 'mobile_config', label: 'Ajustes y Migración', mobileLabel: 'Ajustes', icon: SlidersHorizontal},
];

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('pos');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('yabi_theme');
      if (saved === 'light') return false;
      return true;
    } catch {
      return true;
    }
  });

  const [empresa, setEmpresa] = useState<EmpresaConfig>(() => localStore.getEmpresa());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dataSource, setDataSource] = useState<'firebase' | 'local'>('local');
  const [loading, setLoading] = useState<boolean>(true);

  const [products, setProducts] = useState<Product[]>(() => localStore.getProducts());
  const [customers, setCustomers] = useState<Customer[]>(() => localStore.getCustomers());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => localStore.getSuppliers());
  const [purchases, setPurchases] = useState<Purchase[]>(() => localStore.getPurchases());
  const [banners, setBanners] = useState<StoreBanner[]>(() => localStore.getBanners());
  const [employees, setEmployees] = useState<UserProfile[]>(() => localStore.getEmployees());
  const [sales, setSales] = useState<Sale[]>(() => localStore.getSales());
  const [wishlist, setWishlist] = useState<string[]>(() => localStore.getWishlist());

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [receiptCash, setReceiptCash] = useState<number | undefined>(undefined);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const isOnline = useOnlineStatus();
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();

  const notify = useCallback((text: string, tone: 'success' | 'info' | 'error' = 'info') => {
    const id = genId('T');
    setToasts((prev) => [...prev.slice(-2), {id, text, tone}]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('yabi_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('yabi_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = yabiAuth.subscribe(async (fbUser) => {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }
      setLoading(true);
      if (fbUser) {
        const ctx = await loadUserContext(fbUser.uid);
        const resolvedProfile: UserProfile = ctx.profile || {
          uid: fbUser.uid,
          nombre: fbUser.displayName || fbUser.email || 'Usuario YA’BI',
          email: fbUser.email || '',
          rol: 'admin',
          empresaId: ctx.empresa.id,
        };
        setUserProfile(resolvedProfile);
        setEmpresa(ctx.empresa);

        unsubFirestore = subscribeEmpresaRealtime(
          ctx.empresa.id,
          resolvedProfile.rol === 'superadmin',
          {
            onEmpresa: (e) => setEmpresa(e),
            onProducts: (list) => setProducts(list),
            onCustomers: (list) => setCustomers(list),
            onSuppliers: (list) => setSuppliers(list),
            onPurchases: (list) => setPurchases(list),
            onBanners: (list) => setBanners(list),
            onSales: (list) => setSales(list),
            onEmployees: (list) => setEmployees(list),
            onSyncStatus: (connected) => setDataSource(connected ? 'firebase' : 'local'),
          }
        );
      } else {
        setUserProfile(null);
        setEmpresa(localStore.getEmpresa());
        setProducts(localStore.getProducts());
        setCustomers(localStore.getCustomers());
        setSuppliers(localStore.getSuppliers());
        setPurchases(localStore.getPurchases());
        setBanners(localStore.getBanners());
        setEmployees(localStore.getEmployees());
        setSales(localStore.getSales());
        setDataSource('local');
      }
      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  const handleCompleteSale = async (payload: {
    items: CartItem[];
    customer: Customer | null;
    discount: number;
    paymentMethod: PaymentMethod;
    cashReceived: number;
    customerNameOverride?: string;
    origen?: 'POS' | 'Tienda Online';
  }) => {
    const subtotal = payload.items.reduce((sum, i) => sum + i.product.precio * i.qty, 0);
    const total = Math.max(0, subtotal - payload.discount);
    const costoTotal = payload.items.reduce((sum, i) => sum + i.product.costo * i.qty, 0);
    const totalQty = payload.items.reduce((sum, i) => sum + i.qty, 0);
    const orderNum = `#${1005 + sales.length}`;

    const sale: Sale = {
      id: genId('V'),
      orden: orderNum,
      clienteId: payload.customer?.id || 'C005',
      cliente:
        payload.customerNameOverride ||
        payload.customer?.nombre ||
        'Mostrador / Cliente General',
      productoId: payload.items[0].product.id,
      producto:
        payload.items.length === 1
          ? payload.items[0].product.nombre
          : `${payload.items[0].product.nombre} (+${payload.items.length - 1})`,
      items: payload.items.map((i) => ({
        productoId: i.product.id,
        nombre: i.product.nombre,
        sku: i.product.sku,
        precio: i.product.precio,
        costo: i.product.costo,
        qty: i.qty,
      })),
      precio: payload.items[0].product.precio,
      qty: totalQty,
      desc: payload.discount,
      total,
      costoTotal,
      pago: payload.paymentMethod,
      fecha: todayISO(),
      hora: currentTimeHM(),
      estado: 'Pagada',
      vendedor: userProfile?.nombre || 'Caja Principal',
      origen: payload.origen || 'POS',
    };

    const updatedStocks: {id: string; stock: number}[] = [];
    const nextProducts = products.map((p) => {
      const bought = payload.items.find((i) => i.product.id === p.id);
      if (!bought) return p;
      const nextStock = Math.max(0, p.stock - bought.qty);
      updatedStocks.push({id: p.id, stock: nextStock});
      return {...p, stock: nextStock};
    });

    if (dataSource !== 'firebase') {
      const nextSales = [sale, ...sales];
      setProducts(nextProducts);
      setSales(nextSales);
      localStore.saveProducts(nextProducts);
      localStore.saveSales(nextSales);
    }

    if (userProfile && isOnline) {
      try {
        await commitSaleCloud(empresa.id, sale, updatedStocks);
      } catch {
        const nextSales = [sale, ...sales];
        setProducts(nextProducts);
        setSales(nextSales);
        localStore.saveProducts(nextProducts);
        localStore.saveSales(nextSales);
        notify('Venta guardada localmente; pendiente sincronizar', 'info');
      }
    }

    setReceiptCash(payload.cashReceived);
    setReceiptSale(sale);
    notify(`Venta ${orderNum} registrada`, 'success');
  };

  const handleSaveProduct = async (product: Product) => {
    const exists = products.some((p) => p.id === product.id);
    if (dataSource !== 'firebase') {
      const next = exists
        ? products.map((p) => (p.id === product.id ? product : p))
        : [product, ...products];
      setProducts(next);
      localStore.saveProducts(next);
    }
    if (userProfile && isOnline) {
      await saveProductCloud(empresa.id, product);
    }
    notify(exists ? 'Producto actualizado' : 'Producto creado', 'success');
  };

  const handleDeleteProduct = async (productId: string) => {
    if (dataSource !== 'firebase') {
      const next = products.filter((p) => p.id !== productId);
      setProducts(next);
      localStore.saveProducts(next);
    }
    if (userProfile && isOnline) {
      await deleteProductCloud(empresa.id, productId);
    }
    notify('Producto eliminado del inventario', 'info');
  };

  const handleAdjustStock = async (productId: string, delta: number) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    const updated = {...target, stock: Math.max(0, target.stock + delta)};
    if (dataSource !== 'firebase') {
      const next = products.map((p) => (p.id === productId ? updated : p));
      setProducts(next);
      localStore.saveProducts(next);
    }
    if (userProfile && isOnline) {
      await saveProductCloud(empresa.id, updated);
    }
  };

  const handleCreatePurchase = async (purchase: Purchase) => {
    if (dataSource !== 'firebase') {
      const next = [purchase, ...purchases];
      setPurchases(next);
      localStore.savePurchases(next);
    }
    if (userProfile && isOnline) {
      await savePurchaseCloud(empresa.id, purchase);
    }
    notify(`Orden ${purchase.orden} creada`, 'success');
  };

  const handleReceivePurchase = async (purchase: Purchase) => {
    if (purchase.estado === 'Recibida') return;
    const targetProd = products.find((p) => p.id === purchase.productoId);
    const newStock = (targetProd?.stock || 0) + purchase.qty;

    if (dataSource !== 'firebase') {
      const nextPurchases = purchases.map((p) =>
        p.id === purchase.id ? {...p, estado: 'Recibida' as const} : p
      );
      const nextProducts = products.map((p) =>
        p.id === purchase.productoId ? {...p, stock: newStock} : p
      );
      setPurchases(nextPurchases);
      setProducts(nextProducts);
      localStore.savePurchases(nextPurchases);
      localStore.saveProducts(nextProducts);
    }
    if (userProfile && isOnline) {
      await receivePurchaseCloud(empresa.id, purchase.id, purchase.productoId, newStock);
    }
    notify(`${purchase.orden} recibida · Stock actualizado (+${purchase.qty})`, 'success');
  };

  const handleSaveCustomer = async (customer: Customer) => {
    if (dataSource !== 'firebase') {
      const next = [customer, ...customers];
      setCustomers(next);
      localStore.saveCustomers(next);
    }
    if (userProfile && isOnline) {
      await saveCustomerCloud(empresa.id, customer);
    }
    notify('Cliente guardado', 'success');
  };

  const handleSaveSupplier = async (supplier: Supplier) => {
    if (dataSource !== 'firebase') {
      const next = [supplier, ...suppliers];
      setSuppliers(next);
      localStore.saveSuppliers(next);
    }
    if (userProfile && isOnline) {
      await saveSupplierCloud(empresa.id, supplier);
    }
    notify('Proveedor guardado', 'success');
  };

  const handleCreateEmployee = async (payload: {
    nombre: string;
    email: string;
    pass: string;
    rol: 'admin' | 'vendedor' | 'bodega';
  }) => {
    if (userProfile && isOnline) {
      try {
        await createEmployeeCloud({...payload, empresaId: empresa.id});
        notify(`Cuenta creada en Firebase para ${payload.nombre}`, 'success');
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error en Cloud Function createEmployeeAccount';
        notify(msg, 'error');
        return;
      }
    }
    const localEmp: UserProfile = {
      uid: genId('USR'),
      nombre: payload.nombre,
      email: payload.email,
      rol: payload.rol,
      empresaId: empresa.id,
    };
    const next = [localEmp, ...employees];
    setEmployees(next);
    localStore.saveEmployees(next);
    notify('Empleado agregado en modo demo local', 'info');
  };

  const handleDeleteEmployee = async (uid: string) => {
    if (userProfile && isOnline) {
      try {
        await deleteEmployeeCloud(uid);
        notify('Cuenta eliminada vía Cloud Function', 'info');
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error en Cloud Function deleteUserAccount';
        notify(msg, 'error');
        return;
      }
    }
    const next = employees.filter((e) => e.uid !== uid);
    setEmployees(next);
    localStore.saveEmployees(next);
    notify('Empleado eliminado en modo demo local', 'info');
  };

  const handleSaveEmpresa = async (updated: EmpresaConfig) => {
    setEmpresa(updated);
    localStore.saveEmpresa(updated);
    if (userProfile && isOnline) {
      await saveEmpresaConfigCloud(updated);
    }
    notify('Configuración de empresa guardada', 'success');
  };

  const handleSaveBanner = async (banner: StoreBanner) => {
    if (dataSource !== 'firebase') {
      const next = [banner, ...banners];
      setBanners(next);
      localStore.saveBanners(next);
    }
    if (userProfile && isOnline) {
      await saveBannerCloud(empresa.id, banner);
    }
    notify('Banner publicado en tienda', 'success');
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (dataSource !== 'firebase') {
      const next = banners.filter((b) => b.id !== bannerId);
      setBanners(next);
      localStore.saveBanners(next);
    }
    if (userProfile && isOnline) {
      await deleteBannerCloud(empresa.id, bannerId);
    }
    notify('Banner eliminado', 'info');
  };

  const handleToggleWishlist = (productId: string) => {
    const next = wishlist.includes(productId)
      ? wishlist.filter((id) => id !== productId)
      : [...wishlist, productId];
    setWishlist(next);
    localStore.saveWishlist(next);
  };

  const handleResetDemo = () => {
    localStore.resetDemo();
    setEmpresa(DEMO_EMPRESA);
    setProducts(DEMO_PRODUCTS);
    setCustomers(DEMO_CUSTOMERS);
    setSuppliers(DEMO_SUPPLIERS);
    setPurchases(DEMO_PURCHASES);
    setBanners(DEMO_BANNERS);
    setEmployees(DEMO_EMPLOYEES);
    setSales(DEMO_SALES);
    notify('Datos de demostración restaurados', 'info');
  };

  const currentNav = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0];
  const mobilePrimaryTabs: AppTab[] = ['pos', 'inventory', 'purchases', 'reports'];
  const mobileMenuTabs = NAV_ITEMS.filter((item) => !mobilePrimaryTabs.includes(item.id));

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#070D17] text-slate-900 dark:text-slate-100">
      {/* Desktop Left Sidebar (240px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0A111F]">
        <div className="h-14 px-5 flex items-center border-b border-slate-200 dark:border-slate-800/90">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            YA&apos;BI Store
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full min-h-[42px] px-3 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800/90 space-y-2">
          <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
              {empresa.nombre}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {dataSource === 'firebase' ? 'Tiempo real Firebase' : 'Modo Demo Local'}
            </p>
          </div>
          {!userProfile && (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
            >
              <LogIn className="w-3.5 h-3.5" />
              Conectar Firebase
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 lg:pl-60 flex flex-col min-w-0">
        {/* Top Bar Contract */}
        <header className="sticky top-0 z-30 h-14 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800/90 bg-white/90 dark:bg-[#070D17]/90 backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="lg:hidden font-display text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
              YA&apos;BI Store
            </span>
            <span className="lg:hidden text-slate-300 dark:text-slate-700">/</span>
            <h1 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 truncate">
              {currentNav.label}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isOnline && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium px-2">
                <WifiOff className="w-3.5 h-3.5" />
                Sin conexión
              </span>
            )}

            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={install}
                className="hidden sm:inline-flex min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Instalar App
              </button>
            )}

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="min-h-[40px] min-w-[40px] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mobile_config')}
              aria-label="Ajustes y migración"
              className="lg:hidden min-h-[40px] min-w-[40px] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
            >
              <Settings className="w-4 h-4" />
            </button>

            {!userProfile && (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="hidden lg:inline-flex min-h-[38px] px-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold items-center gap-1.5 whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                Iniciar sesión
              </button>
            )}
          </div>
        </header>

        {/* Active Viewport */}
        <main className="flex-1 px-4 sm:px-6 py-5 max-w-[1400px] w-full mx-auto">
          {loading ? (
            <div className="space-y-4 py-6">
              <div className="h-11 rounded-xl bg-slate-200/70 dark:bg-slate-800/60" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-36 rounded-2xl bg-slate-200/70 dark:bg-slate-800/60"
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'pos' && (
                <PosView
                  products={products}
                  customers={customers}
                  onCompleteSale={(p) => handleCompleteSale({...p, origen: 'POS'})}
                  onNotify={notify}
                />
              )}
              {activeTab === 'inventory' && (
                <InventoryView
                  empresaId={empresa.id}
                  isCloudConnected={dataSource === 'firebase'}
                  products={products}
                  onSaveProduct={handleSaveProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onAdjustStock={handleAdjustStock}
                  onNotify={notify}
                />
              )}
              {activeTab === 'purchases' && (
                <PurchasesView
                  purchases={purchases}
                  products={products}
                  suppliers={suppliers}
                  onCreatePurchase={handleCreatePurchase}
                  onReceivePurchase={handleReceivePurchase}
                />
              )}
              {activeTab === 'storefront' && (
                <StorefrontView
                  empresa={empresa}
                  products={products}
                  banners={banners}
                  wishlist={wishlist}
                  onToggleWishlist={handleToggleWishlist}
                  onPlaceOnlineOrder={(p) =>
                    handleCompleteSale({...p, origen: 'Tienda Online'})
                  }
                  onNotify={notify}
                />
              )}
              {activeTab === 'customers' && (
                <CustomersView
                  customers={customers}
                  suppliers={suppliers}
                  onSaveCustomer={handleSaveCustomer}
                  onSaveSupplier={handleSaveSupplier}
                />
              )}
              {activeTab === 'team' && (
                <TeamView
                  employees={employees}
                  currentUserUid={userProfile?.uid}
                  isCloudConnected={dataSource === 'firebase'}
                  onCreateEmployee={handleCreateEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                />
              )}
              {activeTab === 'reports' && (
                <ReportsView
                  sales={sales}
                  products={products}
                  onInspectSale={(s) => {
                    setReceiptCash(undefined);
                    setReceiptSale(s);
                  }}
                  onNotify={notify}
                />
              )}
              {activeTab === 'mobile_config' && (
                <MobileNativeHubView
                  darkMode={darkMode}
                  onToggleDarkMode={() => setDarkMode((d) => !d)}
                  empresa={empresa}
                  userProfile={userProfile}
                  dataSource={dataSource}
                  products={products}
                  customers={customers}
                  suppliers={suppliers}
                  purchases={purchases}
                  sales={sales}
                  banners={banners}
                  employees={employees}
                  isInstallable={isInstallable}
                  isInstalled={isInstalled}
                  isIOS={isIOS}
                  onInstallPWA={install}
                  onSaveEmpresa={handleSaveEmpresa}
                  onSaveBanner={handleSaveBanner}
                  onDeleteBanner={handleDeleteBanner}
                  onOpenAuth={() => setAuthModalOpen(true)}
                  onLogout={async () => {
                    await yabiAuth.logout();
                    notify('Sesión cerrada. Volviendo a modo demo local.', 'info');
                  }}
                  onResetDemo={handleResetDemo}
                  onNotify={notify}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Tab Bar (5 tabs, <= 64px) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0A111F]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
        aria-label="Navegación móvil"
      >
        <div className="grid grid-cols-5 h-16">
          {mobilePrimaryTabs.map((tabId) => {
            const item = NAV_ITEMS.find((n) => n.id === tabId)!;
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setActiveTab(item.id);
                }}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
                  active
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-tight leading-none">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
              !mobilePrimaryTabs.includes(activeTab)
                ? 'text-sky-600 dark:text-sky-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-tight leading-none">Más</span>
          </button>
        </div>
      </nav>

      {/* Mobile "Más" Bottom Sheet */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 space-y-4 pb-safe">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Módulos de YA&apos;BI Store
              </h3>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {mobileMenuTabs.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`min-h-[56px] p-3.5 rounded-2xl border text-left flex items-center gap-3 ${
                      active
                        ? 'bg-sky-600 border-sky-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {}}
        onNotify={notify}
      />

      <ReceiptModal
        sale={receiptSale}
        empresa={empresa}
        cashReceived={receiptCash}
        onClose={() => setReceiptSale(null)}
        onNotify={(msg) => notify(msg, 'success')}
      />

      {/* Toast Stack */}
      {toasts.length > 0 && (
        <div className="fixed top-16 right-4 z-50 space-y-2 max-w-xs w-full pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-3 rounded-xl border text-xs font-medium shadow-lg pointer-events-auto ${
                t.tone === 'error'
                  ? 'bg-red-600 border-red-500 text-white'
                  : t.tone === 'success'
                  ? 'bg-slate-900 dark:bg-sky-600 border-slate-800 dark:border-sky-500 text-white'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
              }`}
            >
              {t.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
