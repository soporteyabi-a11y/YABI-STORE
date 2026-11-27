import React, {useCallback, useEffect, useState} from 'react';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Camera,
  Check,
  ChevronDown,
  CreditCard,
  Download,
  Headphones,
  Image as ImageIcon,
  LayoutDashboard,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Monitor,
  Moon,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Sun,
  Truck,
  UserCheck,
  UserCog,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import {AuthModal} from './components/AuthModal';
import {BannersView} from './components/BannersView';
import {CustomersView} from './components/CustomersView';
import {DashboardView} from './components/DashboardView';
import {EmpresasView} from './components/EmpresasView';
import {EmailsModal, ScannerModal} from './components/HeaderToolsModals';
import {InventoryView} from './components/InventoryView';
import {MobileNativeHubView} from './components/MobileNativeHubView';
import {PosView} from './components/PosView';
import {PurchasesView} from './components/PurchasesView';
import {ReceiptModal} from './components/ReceiptModal';
import {ReportsView} from './components/ReportsView';
import {SalesView} from './components/SalesView';
import {StorefrontView} from './components/StorefrontView';
import {SubscriptionView} from './components/SubscriptionView';
import {SupportView} from './components/SupportView';
import {TeamView} from './components/TeamView';
import {useOnlineStatus, usePWAInstall} from './hooks/usePWAInstall';
import {
  cloneEmpresaStarterCloud,
  commitSaleCloud,
  createEmployeeCloud,
  deleteBannerCloud,
  deleteEmployeeCloud,
  deleteProductCloud,
  flushOfflineQueueCloud,
  getOfflineQueueCountAsync,
  hydrateEmpresaFromIndexedDb,
  initOfflinePersistence,
  isSupabaseConfigured,
  loadUserContext,
  localStore,
  receivePurchaseCloud,
  saveBannerCloud,
  saveCustomerCloud,
  saveEmpresaConfigCloud,
  saveProductCloud,
  savePurchaseCloud,
  saveSaleCloud,
  saveSupplierCloud,
  saveTicketCloud,
  subscribeEmpresaRealtime,
  subscribeEmpresasListCloud,
  yabiAuth,
} from './services/yabiDb';
import type {
  AppTab,
  CartItem,
  Customer,
  EmailLog,
  EmpresaConfig,
  PaymentMethod,
  Product,
  Purchase,
  Sale,
  StoreBanner,
  Supplier,
  SupportTicket,
  ToastMessage,
  UserProfile,
} from './types/yabi';
import {currentTimeHM, downloadCSV, genId, todayISO} from './utils/format';

interface NavEntry {
  id: AppTab;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<{className?: string}>;
  group: 'PRINCIPAL' | 'GESTIÓN' | 'COMERCIAL' | 'OPERACIÓN';
}

const SIDEBAR_ITEMS: NavEntry[] = [
  {id: 'dashboard', label: 'Dashboard', mobileLabel: 'Inicio', icon: LayoutDashboard, group: 'PRINCIPAL'},
  {id: 'empresas', label: 'Multi-Empresas', mobileLabel: 'Empresas', icon: Building2, group: 'PRINCIPAL'},
  {id: 'team', label: 'Empleados', mobileLabel: 'Equipo', icon: UserCog, group: 'GESTIÓN'},
  {id: 'customers', label: 'Clientes', mobileLabel: 'Clientes', icon: Users, group: 'GESTIÓN'},
  {id: 'inventory', label: 'Productos', mobileLabel: 'Stock', icon: Package, group: 'GESTIÓN'},
  {id: 'suppliers', label: 'Proveedores', mobileLabel: 'Proveed.', icon: Truck, group: 'GESTIÓN'},
  {id: 'banners', label: 'Banners', mobileLabel: 'Banners', icon: ImageIcon, group: 'GESTIÓN'},
  {id: 'sales', label: 'Ventas', mobileLabel: 'Ventas', icon: Receipt, group: 'COMERCIAL'},
  {id: 'purchases', label: 'Compras', mobileLabel: 'Compras', icon: ShoppingCart, group: 'COMERCIAL'},
  {id: 'pos', label: 'Punto de Venta', mobileLabel: 'POS', icon: Monitor, group: 'OPERACIÓN'},
  {id: 'reports', label: 'Reportes', mobileLabel: 'Reportes', icon: BarChart3, group: 'OPERACIÓN'},
  {id: 'subscription', label: 'Mi Suscripción', mobileLabel: 'Plan', icon: CreditCard, group: 'OPERACIÓN'},
  {id: 'config', label: 'Configuración', mobileLabel: 'Ajustes', icon: Settings, group: 'OPERACIÓN'},
  {id: 'support', label: 'Soporte', mobileLabel: 'Soporte', icon: Headphones, group: 'OPERACIÓN'},
];

const SIDEBAR_GROUPS: NavEntry['group'][] = ['PRINCIPAL', 'GESTIÓN', 'COMERCIAL', 'OPERACIÓN'];

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('yabi_theme');
      if (saved === 'light') return false;
      return true;
    } catch {
      return true;
    }
  });

  const [empresas, setEmpresas] = useState<EmpresaConfig[]>(() => localStore.getEmpresas());
  const [activeEmpresaId, setActiveEmpresaId] = useState<string>(() =>
    localStore.getActiveEmpresaId()
  );
  const [empresa, setEmpresa] = useState<EmpresaConfig>(() => localStore.getEmpresa());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [unlinkedAccount, setUnlinkedAccount] = useState(false);
  const [dataSource, setDataSource] = useState<'cloud' | 'local'>('local');
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(
    () => localStore.getOfflineQueue().length
  );
  const [loading, setLoading] = useState<boolean>(false);

  const [products, setProducts] = useState<Product[]>(() => localStore.getProducts());
  const [customers, setCustomers] = useState<Customer[]>(() => localStore.getCustomers());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => localStore.getSuppliers());
  const [purchases, setPurchases] = useState<Purchase[]>(() => localStore.getPurchases());
  const [banners, setBanners] = useState<StoreBanner[]>(() => localStore.getBanners());
  const [employees, setEmployees] = useState<UserProfile[]>(() => localStore.getEmployees());
  const [sales, setSales] = useState<Sale[]>(() => localStore.getSales());
  const [tickets, setTickets] = useState<SupportTicket[]>(() => localStore.getTickets());
  const [emails, setEmails] = useState<EmailLog[]>(() => localStore.getEmails());
  const [wishlist, setWishlist] = useState<string[]>(() => localStore.getWishlist());

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [emailsOpen, setEmailsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [empresaMenuOpen, setEmpresaMenuOpen] = useState(false);
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
      try {
        localStorage.setItem('yabi_theme', 'dark');
      } catch {
        // ignore
      }
    } else {
      root.classList.remove('dark');
      try {
        localStorage.setItem('yabi_theme', 'light');
      } catch {
        // ignore
      }
    }
  }, [darkMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const queryParams = new URLSearchParams(window.location.search);
      const authErr =
        hashParams.get('error_description') || queryParams.get('error_description');
      if (authErr) {
        notify(`Error de confirmación en Supabase: ${authErr}`, 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    let unsubEmpresas: (() => void) | null = null;
    let unsubAuth: (() => void) | null = null;

    try {
      unsubAuth = yabiAuth.subscribe(async (fbUser) => {
        if (unsubEmpresas) {
          unsubEmpresas();
          unsubEmpresas = null;
        }
        if (fbUser) {
          setLoading(true);
          try {
            const ctx = await loadUserContext(fbUser.uid);
            if (ctx.setupWarning) {
              notify(ctx.setupWarning, 'error');
            }
            setUnlinkedAccount(Boolean(ctx.unlinkedAccount));
            const fallbackRole: UserProfile['rol'] =
              ctx.ownerSuggested || ctx.empresa.id === 'EMP001' ? 'superadmin' : 'admin';
            const resolvedProfile: UserProfile = ctx.profile || {
              uid: fbUser.uid,
              nombre: fbUser.displayName || fbUser.email || 'Usuario YA’BI',
              email: fbUser.email || '',
              rol: fallbackRole,
              empresaId: ctx.empresa.id,
            };
            const isSuper = resolvedProfile.rol === 'superadmin';
            const preferredId = isSuper
              ? localStore.getActiveEmpresaId() || ctx.empresa.id
              : ctx.empresa.id;

            setUserProfile(resolvedProfile);
            setActiveEmpresaId(preferredId);
            setEmpresa(
              preferredId === ctx.empresa.id
                ? ctx.empresa
                : {...ctx.empresa, id: preferredId}
            );

            unsubEmpresas = subscribeEmpresasListCloud(
              isSuper,
              ctx.empresa.id,
              (list) => {
                if (list.length > 0) {
                  setEmpresas(list);
                }
              }
            );
          } catch {
            setLoading(false);
          }
        } else {
          setUserProfile(null);
          setUnlinkedAccount(false);
          const localList = localStore.getEmpresas();
          const storedId = localStore.getActiveEmpresaId();
          const validId = localList.some((e) => e.id === storedId)
            ? storedId
            : localList[0]?.id || 'EMP001';
          localStore.saveActiveEmpresaId(validId);
          setEmpresas(localList);
          setActiveEmpresaId(validId);
          setDataSource('local');
          setLoading(false);
        }
      });
    } catch {
      setLoading(false);
    }

    return () => {
      if (unsubAuth) unsubAuth();
      if (unsubEmpresas) unsubEmpresas();
    };
  }, [notify]);

  useEffect(() => {
    let disposed = false;

    // Hydrate synchronous fallback first, then upgrade from IndexedDB (supports >5MB catalogs & offline queue)
    setEmpresa(localStore.getEmpresa(activeEmpresaId));
    setProducts(localStore.getProducts(activeEmpresaId));
    setCustomers(localStore.getCustomers(activeEmpresaId));
    setSuppliers(localStore.getSuppliers(activeEmpresaId));
    setPurchases(localStore.getPurchases(activeEmpresaId));
    setBanners(localStore.getBanners(activeEmpresaId));
    setEmployees(localStore.getEmployees(activeEmpresaId));
    setSales(localStore.getSales(activeEmpresaId));
    setTickets(localStore.getTickets(activeEmpresaId));
    setEmails(localStore.getEmails(activeEmpresaId));
    setWishlist(localStore.getWishlist(activeEmpresaId));

    (async () => {
      await initOfflinePersistence();
      const [idbSnap, qCount] = await Promise.all([
        hydrateEmpresaFromIndexedDb(activeEmpresaId),
        getOfflineQueueCountAsync(),
      ]);
      if (disposed) return;
      setPendingSyncCount(qCount);
      if (idbSnap && (!userProfile || !isOnline)) {
        if (idbSnap.empresa) setEmpresa(idbSnap.empresa);
        if (idbSnap.products) setProducts(idbSnap.products);
        if (idbSnap.customers) setCustomers(idbSnap.customers);
        if (idbSnap.suppliers) setSuppliers(idbSnap.suppliers);
        if (idbSnap.purchases) setPurchases(idbSnap.purchases);
        if (idbSnap.banners) setBanners(idbSnap.banners);
        if (idbSnap.employees) setEmployees(idbSnap.employees);
        if (idbSnap.sales) setSales(idbSnap.sales);
        if (idbSnap.tickets) setTickets(idbSnap.tickets);
        if (idbSnap.emails) setEmails(idbSnap.emails);
        if (idbSnap.wishlist) setWishlist(idbSnap.wishlist);
      }
    })();

    if (!userProfile || !isSupabaseConfigured) {
      setDataSource('local');
      setLoading(false);
      return () => {
        disposed = true;
      };
    }

    if (!isOnline) {
      setDataSource('local');
      setLoading(false);
    } else {
      setLoading(true);
    }

    const isSuper = userProfile.rol === 'superadmin';
    const unsubCloud = subscribeEmpresaRealtime(activeEmpresaId, isSuper, {
      onEmpresa: (e) => {
        localStore.saveEmpresa(e);
        setEmpresa(e);
        setEmpresas((prev) =>
          prev.some((x) => x.id === e.id) ? prev.map((x) => (x.id === e.id ? e : x)) : [...prev, e]
        );
      },
      onProducts: (list) => {
        localStore.saveProducts(list, activeEmpresaId);
        setProducts(list);
      },
      onCustomers: (list) => {
        localStore.saveCustomers(list, activeEmpresaId);
        setCustomers(list);
      },
      onSuppliers: (list) => {
        localStore.saveSuppliers(list, activeEmpresaId);
        setSuppliers(list);
      },
      onPurchases: (list) => {
        localStore.savePurchases(list, activeEmpresaId);
        setPurchases(list);
      },
      onBanners: (list) => {
        localStore.saveBanners(list, activeEmpresaId);
        setBanners(list);
      },
      onSales: (list) => {
        const cloudIds = new Set(list.map((s) => s.id));
        const localPending = localStore
          .getSales(activeEmpresaId)
          .filter((s) => s.pendingSync && !cloudIds.has(s.id));
        const merged = localPending.length > 0 ? [...localPending, ...list] : list;
        localStore.saveSales(merged, activeEmpresaId);
        setSales(merged);
      },
      onEmployees: (list) => {
        localStore.saveEmployees(list, activeEmpresaId);
        setEmployees(list);
      },
      onTickets: (list) => {
        localStore.saveTickets(list, activeEmpresaId);
        setTickets(list);
      },
      onSyncStatus: (connected) => {
        setDataSource(connected ? 'cloud' : 'local');
        setLoading(false);
      },
    });

    const safetyTimer = setTimeout(() => setLoading(false), 2500);

    return () => {
      disposed = true;
      clearTimeout(safetyTimer);
      unsubCloud();
    };
  }, [userProfile, activeEmpresaId, isOnline]);

  // Reintento automático de operaciones y ventas guardadas offline al recuperar conexión y sesión
  useEffect(() => {
    if (!isOnline || !userProfile || !isSupabaseConfigured) return;

    let cancelled = false;
    (async () => {
      let totalSynced = 0;
      const flushedQueue = await flushOfflineQueueCloud();
      totalSynced += flushedQueue;
      if (!cancelled) {
        const remainingCount = await getOfflineQueueCountAsync();
        setPendingSyncCount(remainingCount);
      }

      const pendingSales = sales.filter((s) => s.pendingSync);
      const syncedSaleIds = new Set<string>();
      for (const sale of pendingSales) {
        try {
          const cleanSale: Sale = {...sale, pendingSync: false};
          await saveSaleCloud(empresa.id, cleanSale);
          syncedSaleIds.add(sale.id);
          totalSynced++;
        } catch {
          // retry on next online transition
        }
      }

      if (!cancelled && (syncedSaleIds.size > 0 || flushedQueue > 0)) {
        if (syncedSaleIds.size > 0 || flushedQueue > 0) {
          setSales((prev) => {
            const updated = prev.map((s) =>
              s.pendingSync && (syncedSaleIds.has(s.id) || flushedQueue > 0)
                ? {...s, pendingSync: false}
                : s
            );
            localStore.saveSales(updated, empresa.id);
            return updated;
          });
        }
        notify(`${totalSynced} operación(es) offline sincronizada(s) en Supabase`, 'success');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOnline, userProfile, empresa.id, sales, notify]);

  const appendEmailLog = (entry: Omit<EmailLog, 'id' | 'fecha'>) => {
    const newLog: EmailLog = {
      id: genId('EM'),
      ...entry,
      fecha: `${todayISO()} ${currentTimeHM()}`,
    };
    const next = [newLog, ...emails].slice(0, 30);
    setEmails(next);
    localStore.saveEmails(next, empresa.id);
  };

  const handleCompleteSale = async (payload: {
    items: CartItem[];
    customer: Customer | null;
    discount: number;
    paymentMethod: PaymentMethod;
    cashReceived: number;
    customerNameOverride?: string;
    origen?: 'POS' | 'Tienda Online';
    deliveryNotes?: string;
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
      notas: payload.deliveryNotes,
    };

    const updatedStocks: {id: string; stock: number}[] = [];
    const nextProducts = products.map((p) => {
      const bought = payload.items.find((i) => i.product.id === p.id);
      if (!bought) return p;
      const nextStock = Math.max(0, p.stock - bought.qty);
      updatedStocks.push({id: p.id, stock: nextStock});
      return {...p, stock: nextStock};
    });

    if (userProfile && isOnline) {
      if (dataSource !== 'cloud') {
        const nextSales = [sale, ...sales];
        setProducts(nextProducts);
        setSales(nextSales);
        localStore.saveProducts(nextProducts, empresa.id);
        localStore.saveSales(nextSales, empresa.id);
      }
      try {
        await commitSaleCloud(empresa.id, sale, updatedStocks);
      } catch {
        const offlineSale: Sale = {...sale, pendingSync: true};
        const nextSales = [offlineSale, ...sales];
        setProducts(nextProducts);
        setSales(nextSales);
        localStore.saveProducts(nextProducts, empresa.id);
        localStore.saveSales(nextSales, empresa.id);
        const queue = localStore.enqueueOfflineOp({
          id: genId('OP'),
          empresaId: empresa.id,
          type: 'saveSaleCommit',
          sale: offlineSale,
          updatedStocks,
        });
        setPendingSyncCount(queue.length);
        notify('Venta guardada en caché local; se sincronizará con Supabase al reconectar', 'info');
      }
    } else if (userProfile && !isOnline) {
      const offlineSale: Sale = {...sale, pendingSync: true};
      const nextSales = [offlineSale, ...sales];
      setProducts(nextProducts);
      setSales(nextSales);
      localStore.saveProducts(nextProducts, empresa.id);
      localStore.saveSales(nextSales, empresa.id);
      const queue = localStore.enqueueOfflineOp({
        id: genId('OP'),
        empresaId: empresa.id,
        type: 'saveSaleCommit',
        sale: offlineSale,
        updatedStocks,
      });
      setPendingSyncCount(queue.length);
      notify('Sin internet: venta guardada en cola offline para Supabase', 'info');
    } else {
      const nextSales = [sale, ...sales];
      setProducts(nextProducts);
      setSales(nextSales);
      localStore.saveProducts(nextProducts, empresa.id);
      localStore.saveSales(nextSales, empresa.id);
    }

    if (payload.customer?.email) {
      appendEmailLog({
        para: payload.customer.email,
        asunto: `Recibo de compra ${orderNum} — ${empresa.nombre}`,
        tipo: 'Recibo',
      });
    }

    setReceiptCash(payload.cashReceived);
    setReceiptSale(sale);
    notify(`Venta ${orderNum} registrada`, 'success');
  };

  const handleUpdateSale = async (updatedSale: Sale) => {
    const next = sales.map((s) => (s.id === updatedSale.id ? updatedSale : s));
    setSales(next);
    localStore.saveSales(next, empresa.id);
    if (userProfile) {
      if (isOnline) {
        try {
          await saveSaleCloud(empresa.id, updatedSale);
        } catch {
          const queue = localStore.enqueueOfflineOp({
            id: genId('OP'),
            empresaId: empresa.id,
            type: 'saveSale',
            sale: updatedSale,
          });
          setPendingSyncCount(queue.length);
        }
      } else {
        const queue = localStore.enqueueOfflineOp({
          id: genId('OP'),
          empresaId: empresa.id,
          type: 'saveSale',
          sale: updatedSale,
        });
        setPendingSyncCount(queue.length);
      }
    }
    notify(`Orden ${updatedSale.orden} actualizada`, 'success');
  };

  const handleSaveProduct = async (product: Product) => {
    const exists = products.some((p) => p.id === product.id);
    const next = exists
      ? products.map((p) => (p.id === product.id ? product : p))
      : [product, ...products];
    setProducts(next);
    localStore.saveProducts(next, empresa.id);
    if (userProfile) {
      if (isOnline) {
        try {
          await saveProductCloud(empresa.id, product);
        } catch {
          const queue = localStore.enqueueOfflineOp({
            id: genId('OP'),
            empresaId: empresa.id,
            type: 'saveProduct',
            product,
          });
          setPendingSyncCount(queue.length);
        }
      } else {
        const queue = localStore.enqueueOfflineOp({
          id: genId('OP'),
          empresaId: empresa.id,
          type: 'saveProduct',
          product,
        });
        setPendingSyncCount(queue.length);
      }
    }
    notify(exists ? 'Producto actualizado' : 'Producto creado', 'success');
  };

  const handleDeleteProduct = async (productId: string) => {
    const next = products.filter((p) => p.id !== productId);
    setProducts(next);
    localStore.saveProducts(next, empresa.id);
    if (userProfile) {
      if (isOnline) {
        try {
          await deleteProductCloud(empresa.id, productId);
        } catch {
          const queue = localStore.enqueueOfflineOp({
            id: genId('OP'),
            empresaId: empresa.id,
            type: 'deleteProduct',
            productId,
          });
          setPendingSyncCount(queue.length);
        }
      } else {
        const queue = localStore.enqueueOfflineOp({
          id: genId('OP'),
          empresaId: empresa.id,
          type: 'deleteProduct',
          productId,
        });
        setPendingSyncCount(queue.length);
      }
    }
    notify('Producto eliminado del inventario', 'info');
  };

  const handleAdjustStock = async (productId: string, delta: number) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    const updated = {...target, stock: Math.max(0, target.stock + delta)};
    const next = products.map((p) => (p.id === productId ? updated : p));
    setProducts(next);
    localStore.saveProducts(next, empresa.id);
    if (userProfile) {
      if (isOnline) {
        try {
          await saveProductCloud(empresa.id, updated);
        } catch {
          const queue = localStore.enqueueOfflineOp({
            id: genId('OP'),
            empresaId: empresa.id,
            type: 'saveProduct',
            product: updated,
          });
          setPendingSyncCount(queue.length);
        }
      } else {
        const queue = localStore.enqueueOfflineOp({
          id: genId('OP'),
          empresaId: empresa.id,
          type: 'saveProduct',
          product: updated,
        });
        setPendingSyncCount(queue.length);
      }
    }
  };

  const handleCreatePurchase = async (purchase: Purchase) => {
    const next = [purchase, ...purchases];
    setPurchases(next);
    localStore.savePurchases(next, empresa.id);
    if (userProfile) {
      if (isOnline) {
        try {
          await savePurchaseCloud(empresa.id, purchase);
        } catch {
          const queue = localStore.enqueueOfflineOp({
            id: genId('OP'),
            empresaId: empresa.id,
            type: 'savePurchase',
            purchase,
          });
          setPendingSyncCount(queue.length);
        }
      } else {
        const queue = localStore.enqueueOfflineOp({
          id: genId('OP'),
          empresaId: empresa.id,
          type: 'savePurchase',
          purchase,
        });
        setPendingSyncCount(queue.length);
      }
    }
    notify(`Orden ${purchase.orden} creada`, 'success');
  };

  const handleReceivePurchase = async (purchase: Purchase) => {
    if (purchase.estado === 'Recibida') return;
    const targetProd = products.find((p) => p.id === purchase.productoId);
    const newStock = (targetProd?.stock || 0) + purchase.qty;

    const nextPurchases = purchases.map((p) =>
      p.id === purchase.id ? {...p, estado: 'Recibida' as const} : p
    );
    const nextProducts = products.map((p) =>
      p.id === purchase.productoId ? {...p, stock: newStock} : p
    );
    setPurchases(nextPurchases);
    setProducts(nextProducts);
    localStore.savePurchases(nextPurchases, empresa.id);
    localStore.saveProducts(nextProducts, empresa.id);

    if (userProfile) {
      if (isOnline) {
        try {
          await receivePurchaseCloud(empresa.id, purchase.id, purchase.productoId, newStock);
        } catch {
          const queue = localStore.enqueueOfflineOp({
            id: genId('OP'),
            empresaId: empresa.id,
            type: 'receivePurchase',
            purchaseId: purchase.id,
            productId: purchase.productoId,
            newStock,
          });
          setPendingSyncCount(queue.length);
        }
      } else {
        const queue = localStore.enqueueOfflineOp({
          id: genId('OP'),
          empresaId: empresa.id,
          type: 'receivePurchase',
          purchaseId: purchase.id,
          productId: purchase.productoId,
          newStock,
        });
        setPendingSyncCount(queue.length);
      }
    }
    notify(`${purchase.orden} recibida · Stock actualizado (+${purchase.qty})`, 'success');
  };

  const handleQuickRestock = (product: Product) => {
    setActiveTab('purchases');
    notify(`Crea orden de compra para reponer ${product.nombre}`, 'info');
  };

  const handleSaveCustomer = async (customer: Customer) => {
    const exists = customers.some((c) => c.id === customer.id);
    const next = exists
      ? customers.map((c) => (c.id === customer.id ? customer : c))
      : [customer, ...customers];
    setCustomers(next);
    localStore.saveCustomers(next, empresa.id);
    if (userProfile) {
      if (isOnline) {
        try {
          await saveCustomerCloud(empresa.id, customer);
        } catch {
          const queue = localStore.enqueueOfflineOp({
            id: genId('OP'),
            empresaId: empresa.id,
            type: 'saveCustomer',
            customer,
          });
          setPendingSyncCount(queue.length);
        }
      } else {
        const queue = localStore.enqueueOfflineOp({
          id: genId('OP'),
          empresaId: empresa.id,
          type: 'saveCustomer',
          customer,
        });
        setPendingSyncCount(queue.length);
      }
    }
    notify(exists ? 'Cliente actualizado' : 'Cliente guardado', 'success');
  };

  const handleSaveSupplier = async (supplier: Supplier) => {
    const exists = suppliers.some((s) => s.id === supplier.id);
    const next = exists
      ? suppliers.map((s) => (s.id === supplier.id ? supplier : s))
      : [supplier, ...suppliers];
    setSuppliers(next);
    localStore.saveSuppliers(next, empresa.id);
    if (userProfile) {
      if (isOnline) {
        try {
          await saveSupplierCloud(empresa.id, supplier);
        } catch {
          const queue = localStore.enqueueOfflineOp({
            id: genId('OP'),
            empresaId: empresa.id,
            type: 'saveSupplier',
            supplier,
          });
          setPendingSyncCount(queue.length);
        }
      } else {
        const queue = localStore.enqueueOfflineOp({
          id: genId('OP'),
          empresaId: empresa.id,
          type: 'saveSupplier',
          supplier,
        });
        setPendingSyncCount(queue.length);
      }
    }
    notify(exists ? 'Proveedor actualizado' : 'Proveedor guardado', 'success');
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
        notify(`Cuenta creada en Supabase para ${payload.nombre}`, 'success');
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al crear la cuenta de empleado';
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
    localStore.saveEmployees(next, empresa.id);
    notify('Empleado guardado en almacenamiento local', 'info');
  };

  const handleDeleteEmployee = async (uid: string) => {
    if (userProfile && isOnline) {
      try {
        await deleteEmployeeCloud(uid);
        notify('Cuenta eliminada vía Render + Supabase', 'info');
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al eliminar la cuenta';
        notify(msg, 'error');
        return;
      }
    }
    const next = employees.filter((e) => e.uid !== uid);
    setEmployees(next);
    localStore.saveEmployees(next, empresa.id);
    notify('Empleado eliminado del almacenamiento local', 'info');
  };

  const handleSwitchEmpresa = (targetId: string) => {
    if (!targetId || targetId === activeEmpresaId) {
      setEmpresaMenuOpen(false);
      return;
    }
    if (userProfile && userProfile.rol !== 'superadmin' && targetId !== userProfile.empresaId) {
      notify('Tu cuenta solo tiene acceso a su sede asignada', 'error');
      return;
    }
    const target = empresas.find((e) => e.id === targetId);
    if (target && target.activa === false) {
      notify(`La empresa ${target.nombre} está suspendida. Reactívala para operar.`, 'error');
      return;
    }
    localStore.saveActiveEmpresaId(targetId);
    setActiveEmpresaId(targetId);
    if (target) setEmpresa(target);
    setEmpresaMenuOpen(false);
    notify(`Operando en ${target?.nombre || targetId}`, 'success');
  };

  const handleSaveEmpresa = async (
    updated: EmpresaConfig,
    options?: {isNew?: boolean; cloneFromCurrent?: boolean}
  ) => {
    if (options?.isNew) {
      if (empresas.some((e) => e.id === updated.id)) {
        notify(`Ya existe una empresa con el código ${updated.id}`, 'error');
        return;
      }
      localStore.seedEmpresaCollections(
        updated,
        options.cloneFromCurrent ? {products, customers, banners} : undefined
      );
      if (!userProfile) {
        setEmpresas(localStore.getEmpresas());
      } else {
        setEmpresas((prev) => [...prev, updated]);
        if (isOnline) {
          try {
            await saveEmpresaConfigCloud(updated);
            if (options.cloneFromCurrent) {
              await cloneEmpresaStarterCloud(updated.id, {products, customers, banners});
            }
          } catch {
            const queue = localStore.enqueueOfflineOp({
              id: genId('OP'),
              empresaId: updated.id,
              type: 'saveEmpresa',
              empresa: updated,
            });
            setPendingSyncCount(queue.length);
          }
        } else {
          const queue = localStore.enqueueOfflineOp({
            id: genId('OP'),
            empresaId: updated.id,
            type: 'saveEmpresa',
            empresa: updated,
          });
          setPendingSyncCount(queue.length);
        }
      }
      localStore.saveActiveEmpresaId(updated.id);
      setActiveEmpresaId(updated.id);
      setEmpresa(updated);
      notify(`Empresa ${updated.nombre} (${updated.id}) creada y activada`, 'success');
      return;
    }

    const nextList = localStore.upsertEmpresa(updated);
    setEmpresas((prev) => {
      if (prev.length === 0) return nextList;
      return prev.some((e) => e.id === updated.id)
        ? prev.map((e) => (e.id === updated.id ? updated : e))
        : [...prev, updated];
    });
    if (updated.id === empresa.id) {
      setEmpresa(updated);
    }
    if (userProfile) {
      if (isOnline) {
        try {
          await saveEmpresaConfigCloud(updated);
        } catch {
          const queue = localStore.enqueueOfflineOp({
            id: genId('OP'),
            empresaId: updated.id,
            type: 'saveEmpresa',
            empresa: updated,
          });
          setPendingSyncCount(queue.length);
        }
      } else {
        const queue = localStore.enqueueOfflineOp({
          id: genId('OP'),
          empresaId: updated.id,
          type: 'saveEmpresa',
          empresa: updated,
        });
        setPendingSyncCount(queue.length);
      }
    }
    notify('Configuración de empresa guardada', 'success');
  };

  const handleChangePlan = async (plan: NonNullable<EmpresaConfig['plan']>) => {
    const updated = {...empresa, plan};
    await handleSaveEmpresa(updated);
    notify(`Plan actualizado a ${plan}`, 'success');
  };

  const handleClaimOwner = async () => {
    if (!userProfile) return;
    try {
      await yabiAuth.claimOwnerAccount({
        nombreTienda: empresa.nombre || "DIGITAL YA'BI",
        nombreDueno: userProfile.nombre || 'Propietario',
        nit: empresa.nit,
        direccion: empresa.direccion,
        ciudad: empresa.ciudad,
        telefono: empresa.telefono,
        iva: empresa.iva,
      });
      const ctx = await loadUserContext(userProfile.uid);
      if (ctx.profile) {
        setUserProfile(ctx.profile);
        setUnlinkedAccount(false);
        setEmpresa(ctx.empresa);
        setActiveEmpresaId(ctx.empresa.id);
        notify('DIGITAL YA’BI activada como Propietario con Plan Oro ($0)', 'success');
      } else if (ctx.setupWarning) {
        notify(ctx.setupWarning, 'error');
      }
    } catch (err: unknown) {
      const msg = (err as {message?: string})?.message || '';
      notify(
        msg.includes('registrar_dueno_yabi')
          ? 'Primero ejecuta en Supabase → SQL Editor el script de Configuración → Copiar Solo Tablas (20 KB).'
          : msg || 'No se pudo activar la cuenta de propietario todavía.',
        'error'
      );
    }
  };

  const handleSaveBanner = async (banner: StoreBanner) => {
    const exists = banners.some((b) => b.id === banner.id);
    const next = exists
      ? banners.map((b) => (b.id === banner.id ? banner : b))
      : [banner, ...banners];
    setBanners(next);
    localStore.saveBanners(next, empresa.id);
    if (userProfile) {
      if (isOnline) {
        try {
          await saveBannerCloud(empresa.id, banner);
        } catch {
          const queue = localStore.enqueueOfflineOp({
            id: genId('OP'),
            empresaId: empresa.id,
            type: 'saveBanner',
            banner,
          });
          setPendingSyncCount(queue.length);
        }
      } else {
        const queue = localStore.enqueueOfflineOp({
          id: genId('OP'),
          empresaId: empresa.id,
          type: 'saveBanner',
          banner,
        });
        setPendingSyncCount(queue.length);
      }
    }
    notify(exists ? 'Banner actualizado' : 'Banner publicado en tienda', 'success');
  };

  const handleDeleteBanner = async (bannerId: string) => {
    const next = banners.filter((b) => b.id !== bannerId);
    setBanners(next);
    localStore.saveBanners(next, empresa.id);
    if (userProfile) {
      if (isOnline) {
        try {
          await deleteBannerCloud(empresa.id, bannerId);
        } catch {
          const queue = localStore.enqueueOfflineOp({
            id: genId('OP'),
            empresaId: empresa.id,
            type: 'deleteBanner',
            bannerId,
          });
          setPendingSyncCount(queue.length);
        }
      } else {
        const queue = localStore.enqueueOfflineOp({
          id: genId('OP'),
          empresaId: empresa.id,
          type: 'deleteBanner',
          bannerId,
        });
        setPendingSyncCount(queue.length);
      }
    }
    notify('Banner eliminado', 'info');
  };

  const handleCreateTicket = async (ticket: SupportTicket) => {
    const next = [ticket, ...tickets];
    setTickets(next);
    localStore.saveTickets(next, empresa.id);
    if (userProfile) {
      if (isOnline) {
        try {
          await saveTicketCloud(ticket);
        } catch {
          const queue = localStore.enqueueOfflineOp({
            id: genId('OP'),
            empresaId: empresa.id,
            type: 'saveTicket',
            ticket,
          });
          setPendingSyncCount(queue.length);
        }
      } else {
        const queue = localStore.enqueueOfflineOp({
          id: genId('OP'),
          empresaId: empresa.id,
          type: 'saveTicket',
          ticket,
        });
        setPendingSyncCount(queue.length);
      }
    }
    appendEmailLog({
      para: 'soporteyabi@gmail.com',
      asunto: `Ticket ${ticket.id}: ${ticket.asunto}`,
      tipo: 'Soporte',
    });
    notify(`Ticket ${ticket.id} enviado a soporte`, 'success');
  };

  const handleToggleWishlist = (productId: string) => {
    const next = wishlist.includes(productId)
      ? wishlist.filter((id) => id !== productId)
      : [...wishlist, productId];
    setWishlist(next);
    localStore.saveWishlist(next, empresa.id);
  };

  const handleExportActiveCSV = () => {
    const dateTag = todayISO();
    if (activeTab === 'inventory') {
      downloadCSV(
        `yabi-inventario-${dateTag}.csv`,
        ['SKU', 'Nombre', 'Categoría', 'Precio', 'Costo', 'Stock', 'Mínimo', 'Estado'],
        products.map((p) => [p.sku, p.nombre, p.cat, p.precio, p.costo, p.stock, p.minStock, p.estado])
      );
      notify('Inventario exportado en CSV', 'success');
      return;
    }
    if (activeTab === 'customers') {
      downloadCSV(
        `yabi-clientes-${dateTag}.csv`,
        ['Nombre', 'Correo', 'Teléfono', 'Ciudad', 'Dirección'],
        customers.map((c) => [c.nombre, c.email, c.tel, c.ciudad, c.dir])
      );
      notify('Clientes exportados en CSV', 'success');
      return;
    }
    if (activeTab === 'suppliers') {
      downloadCSV(
        `yabi-proveedores-${dateTag}.csv`,
        ['Empresa', 'NIT', 'Contacto', 'Teléfono', 'Categoría', 'Saldo'],
        suppliers.map((s) => [s.empresa, s.nit, s.contacto, s.tel, s.cat, s.saldo])
      );
      notify('Proveedores exportados en CSV', 'success');
      return;
    }
    if (activeTab === 'purchases') {
      downloadCSV(
        `yabi-compras-${dateTag}.csv`,
        ['Orden', 'Proveedor', 'Producto', 'Cantidad', 'Costo', 'Total', 'Fecha', 'Estado'],
        purchases.map((c) => [c.orden, c.proveedor, c.producto, c.qty, c.costo, c.total, c.fecha, c.estado])
      );
      notify('Órdenes de compra exportadas en CSV', 'success');
      return;
    }
    downloadCSV(
      `yabi-ventas-${dateTag}.csv`,
      ['Orden', 'Fecha', 'Cliente', 'Producto', 'Cantidad', 'Total', 'Pago', 'Estado', 'Guía'],
      sales.map((s) => [
        s.orden,
        s.fecha,
        s.cliente,
        s.producto,
        s.qty,
        s.total,
        s.pago,
        s.estado,
        s.guia || '',
      ])
    );
    notify('Ventas exportadas en CSV', 'success');
  };

  const getSidebarCount = (id: AppTab): number | null => {
    if (id === 'empresas') return empresas.length > 1 ? empresas.length : null;
    if (id === 'customers') return customers.length;
    if (id === 'inventory') return products.length;
    if (id === 'suppliers') return suppliers.length;
    if (id === 'sales') return sales.length;
    if (id === 'purchases') return purchases.length;
    return null;
  };

  const canSwitchEmpresas = !userProfile || userProfile.rol === 'superadmin';

  const activeTitle =
    activeTab === 'storefront'
      ? 'Tienda Online'
      : SIDEBAR_ITEMS.find((item) => item.id === activeTab)?.label || 'Dashboard';

  const mobilePrimaryTabs: AppTab[] = ['dashboard', 'pos', 'inventory', 'sales'];
  const mobileSheetTabs: {
    id: AppTab;
    label: string;
    icon: React.ComponentType<{className?: string}>;
  }[] = [
    ...SIDEBAR_ITEMS.filter((item) => !mobilePrimaryTabs.includes(item.id)),
    {id: 'storefront', label: 'Ver Tienda', icon: ShoppingBag},
  ];

  return (
    <div className="min-h-screen flex yabi-grid-bg text-slate-900 dark:text-slate-100 relative overflow-x-hidden">
      {/* Subtle decorative concentric orbital rings matching YA'BI Store canvas */}
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed top-0 right-0 w-[440px] h-[440px] text-sky-500/10 dark:text-[#00C8FF]/15 z-0"
        viewBox="0 0 400 400"
        fill="none"
      >
        <circle cx="380" cy="40" r="110" stroke="currentColor" strokeWidth="1" />
        <circle cx="380" cy="40" r="175" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7" />
        <circle cx="380" cy="40" r="245" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45" />
        <circle cx="206" cy="214" r="3" fill="currentColor" fillOpacity="0.8" />
      </svg>
      {/* Desktop Left Sidebar (240px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 lg:left-0 z-30 border-r border-slate-200/80 dark:border-[#0D1E35] bg-white/70 dark:bg-[#070E1A]/60">
        {/* Brand Header & Multi-Empresa Switcher */}
        <div className="px-4 py-4 border-b border-slate-200 dark:border-[#0D1E35] relative">
          <div className="px-1 font-display text-xl font-extrabold tracking-tight whitespace-nowrap">
            <span className="text-slate-900 dark:text-white">YA&apos;BI </span>
            <span className="text-sky-600 dark:text-[#00C8FF]">STORE</span>
          </div>

          <button
            type="button"
            onClick={() => setEmpresaMenuOpen((o) => !o)}
            className="mt-2.5 w-full p-2.5 rounded-xl border border-slate-200/80 dark:border-[#0D1E35] bg-slate-50/70 dark:bg-[#0B1525]/60 hover:border-[#00C8FF] text-left transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white truncate">
                  {empresa.nombre}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-semibold text-sky-600 dark:text-[#00C8FF]">
                    {empresa.id}
                  </span>
                  <span className="px-1.5 py-0.5 rounded border border-purple-500/50 bg-purple-500/10 text-[9px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-300">
                    {(empresa.plan || 'Pro').toUpperCase()}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                  empresaMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-400 truncate">
              {dataSource === 'cloud' ? 'Supabase Live' : 'Caché Offline / Local'}
              {pendingSyncCount > 0 ? ` · ${pendingSyncCount} pend.` : ''}
              {canSwitchEmpresas && empresas.length > 1 ? ` · ${empresas.length} empresas` : ''}
            </p>
          </button>

          {empresaMenuOpen && (
            <div className="absolute left-3 right-3 top-full mt-1.5 z-50 rounded-2xl border border-slate-200 dark:border-[#0D1E35] bg-white dark:bg-[#0B1525] shadow-xl p-2 space-y-1">
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Cambiar empresa
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {(empresas.length > 0 ? empresas : [empresa]).map((empItem) => {
                  const isCurrent = empItem.id === empresa.id;
                  const disabled = empItem.activa === false || (!canSwitchEmpresas && !isCurrent);
                  return (
                    <button
                      key={empItem.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleSwitchEmpresa(empItem.id)}
                      className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-2 text-xs transition-colors ${
                        isCurrent
                          ? 'bg-sky-500/15 dark:bg-[#00C8FF]/15 text-sky-700 dark:text-[#00C8FF] font-semibold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#070E1A] disabled:opacity-45'
                      }`}
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-mono text-[10px] mr-1.5">{empItem.id}</span>
                        {empItem.nombre}
                      </span>
                      {isCurrent && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmpresaMenuOpen(false);
                  setActiveTab('empresas');
                }}
                className="w-full mt-1 px-2.5 py-2 rounded-xl border-t border-slate-100 dark:border-[#0D1E35] text-xs font-semibold text-sky-600 dark:text-[#00C8FF] hover:bg-slate-50 dark:hover:bg-[#070E1A] flex items-center gap-2"
              >
                <Building2 className="w-3.5 h-3.5" />
                Gestionar Multi-Empresas
              </button>
            </div>
          )}
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto" aria-label="Navegación principal">
          {SIDEBAR_GROUPS.map((group) => {
            const items = SIDEBAR_ITEMS.filter((item) => item.group === group);
            return (
              <div key={group} className="space-y-1">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {group}
                </p>
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  const count = getSidebarCount(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full min-h-[38px] px-3 rounded-xl text-[13px] font-medium flex items-center justify-between gap-2 transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-sky-500/15 dark:bg-[#00C8FF]/15 text-sky-700 dark:text-[#00C8FF] border border-sky-500/30 dark:border-[#00C8FF]/30'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0B1525] border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {count !== null && (
                        <span
                          className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${
                            active
                              ? 'bg-sky-600 dark:bg-[#00C8FF] text-white dark:text-[#050A14]'
                              : 'bg-sky-500/15 dark:bg-[#00C8FF]/15 text-sky-700 dark:text-[#00C8FF]'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Bottom Storefront Link */}
        <div className="p-3 border-t border-slate-200 dark:border-[#0D1E35] space-y-2">
          <button
            type="button"
            onClick={() => setActiveTab('storefront')}
            className={`w-full min-h-[40px] px-3 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'storefront'
                ? 'bg-sky-500/15 dark:bg-[#00C8FF]/15 text-sky-700 dark:text-[#00C8FF]'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0B1525]'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a la tienda</span>
          </button>

          {userProfile ? (
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50/70 dark:bg-[#0B1525]/60 space-y-2">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-800 dark:text-white truncate">
                    {userProfile.nombre}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {userProfile.email || userProfile.rol}
                  </p>
                </div>
                <button
                  type="button"
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  onClick={async () => {
                    await yabiAuth.logout();
                    notify('Sesión cerrada. Operando en almacenamiento local.', 'info');
                  }}
                  className="min-h-[30px] min-w-[30px] rounded-lg border border-slate-200 dark:border-[#0D1E35] flex items-center justify-center text-slate-500 hover:text-rose-500 hover:border-rose-500/40 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="w-full min-h-[32px] px-2.5 rounded-lg border border-slate-200 dark:border-[#0D1E35] text-[11px] font-medium text-sky-600 dark:text-[#00C8FF] hover:bg-slate-100 dark:hover:bg-[#070E1A] flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3 h-3" />
                Cambiar cuenta / Registrar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="w-full min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-[#0D1E35] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0B1525] flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-[#00C8FF]" />
              Iniciar sesión
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 lg:ml-60 flex flex-col min-w-0 relative z-10">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-14 px-4 sm:px-6 border-b border-slate-200/80 dark:border-[#0D1E35] bg-white/75 dark:bg-[#070E1A]/65 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú de módulos"
              className="lg:hidden min-h-[36px] min-w-[36px] rounded-lg border border-slate-200/80 dark:border-[#0D1E35] bg-white/65 dark:bg-[#0B1525]/50 flex items-center justify-center text-slate-700 dark:text-slate-200"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="lg:hidden font-display text-base font-extrabold tracking-tight whitespace-nowrap shrink-0">
              <span className="text-slate-900 dark:text-white">YA&apos;BI </span>
              <span className="text-sky-600 dark:text-[#00C8FF]">STORE</span>
            </span>
            <span className="lg:hidden text-slate-300 dark:text-slate-700">/</span>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
              {activeTitle}
            </h1>
            <button
              type="button"
              onClick={() => setActiveTab('empresas')}
              title="Ver o cambiar empresa activa"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-[#0D1E35] bg-white/65 dark:bg-[#0B1525]/50 hover:border-[#00C8FF] text-[11px] font-semibold text-slate-700 dark:text-slate-200 max-w-[180px]"
            >
              <Building2 className="w-3.5 h-3.5 text-[#00C8FF] shrink-0" />
              <span className="font-mono text-sky-600 dark:text-[#00C8FF] shrink-0">{empresa.id}</span>
              <span className="truncate">{empresa.nombre}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isOnline && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-500 font-medium px-2">
                <WifiOff className="w-3.5 h-3.5" />
                Offline{pendingSyncCount > 0 ? ` (${pendingSyncCount})` : ''}
              </span>
            )}

            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="min-h-[36px] px-3 rounded-lg border border-slate-200/80 dark:border-[#0D1E35] bg-white/65 dark:bg-[#0B1525]/50 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:border-[#00C8FF] inline-flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5 text-[#00C8FF]" />
              <span className="hidden sm:inline">Escáner</span>
            </button>

            <button
              type="button"
              onClick={() => setEmailsOpen(true)}
              className="min-h-[36px] px-3 rounded-lg border border-slate-200/80 dark:border-[#0D1E35] bg-white/65 dark:bg-[#0B1525]/50 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:border-[#00C8FF] inline-flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-[#00C8FF]" />
              <span className="hidden sm:inline">Emails</span>
            </button>

            <button
              type="button"
              onClick={handleExportActiveCSV}
              className="min-h-[36px] px-3 rounded-lg border border-slate-200/80 dark:border-[#0D1E35] bg-white/65 dark:bg-[#0B1525]/50 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:border-[#00C8FF] inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#00C8FF]" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {isInstallable && !isInstalled && (
              <button
                type="button"
                onClick={install}
                className="hidden md:inline-flex min-h-[36px] px-3 rounded-lg border border-sky-500/40 bg-sky-500/10 text-xs font-semibold text-sky-600 dark:text-[#00C8FF] items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                Instalar
              </button>
            )}

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="min-h-[36px] min-w-[36px] rounded-lg border border-slate-200/80 dark:border-[#0D1E35] bg-white/65 dark:bg-[#0B1525]/50 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-[#00C8FF]"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {userProfile ? (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                title="Cuenta conectada · Cambiar cuenta o cerrar sesión"
                className="inline-flex min-h-[36px] px-3 rounded-lg border border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-[#00E87C] text-xs font-bold items-center gap-1.5 whitespace-nowrap"
              >
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {userProfile.rol === 'superadmin' ? 'Propietario' : userProfile.nombre}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex min-h-[36px] px-3 sm:px-3.5 rounded-lg bg-sky-600 dark:bg-[#00C8FF] text-white dark:text-[#050A14] text-xs font-bold items-center gap-1.5 whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Iniciar sesión</span>
              </button>
            )}
          </div>
        </header>

        {/* Active Viewport */}
        <main className="flex-1 px-4 sm:px-6 py-5 max-w-[1440px] w-full mx-auto">
          {loading ? (
            <div className="space-y-4 py-6">
              <div className="h-11 rounded-xl bg-slate-200/50 dark:bg-[#0B1525]/45" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-32 rounded-2xl bg-slate-200/50 dark:bg-[#0B1525]/45"
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  sales={sales}
                  products={products}
                  customers={customers}
                  purchases={purchases}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onInspectSale={(s) => {
                    setReceiptCash(undefined);
                    setReceiptSale(s);
                  }}
                  onQuickRestock={handleQuickRestock}
                />
              )}
              {activeTab === 'empresas' && (
                <EmpresasView
                  empresas={empresas}
                  activeEmpresa={empresa}
                  activeProductsCount={products.length}
                  activeCustomersCount={customers.length}
                  activeSales={sales}
                  employees={employees}
                  userProfile={userProfile}
                  isCloudConnected={dataSource === 'cloud'}
                  onSwitchEmpresa={handleSwitchEmpresa}
                  onSaveEmpresa={handleSaveEmpresa}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}
              {activeTab === 'team' && (
                <TeamView
                  employees={employees}
                  activeEmpresaId={empresa.id}
                  activeEmpresaNombre={empresa.nombre}
                  isSuperAdmin={!userProfile || userProfile.rol === 'superadmin'}
                  currentUserUid={userProfile?.uid}
                  isCloudConnected={dataSource === 'cloud'}
                  onCreateEmployee={handleCreateEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                />
              )}
              {(activeTab === 'customers' || activeTab === 'suppliers') && (
                <CustomersView
                  defaultSegment={activeTab === 'suppliers' ? 'suppliers' : 'customers'}
                  customers={customers}
                  suppliers={suppliers}
                  onSaveCustomer={handleSaveCustomer}
                  onSaveSupplier={handleSaveSupplier}
                />
              )}
              {activeTab === 'inventory' && (
                <InventoryView
                  empresaId={empresa.id}
                  isCloudConnected={dataSource === 'cloud'}
                  products={products}
                  onSaveProduct={handleSaveProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onAdjustStock={handleAdjustStock}
                  onNotify={notify}
                />
              )}
              {activeTab === 'banners' && (
                <BannersView
                  empresaId={empresa.id}
                  isCloudConnected={dataSource === 'cloud'}
                  banners={banners}
                  onSaveBanner={handleSaveBanner}
                  onDeleteBanner={handleDeleteBanner}
                  onNotify={notify}
                />
              )}
              {activeTab === 'sales' && (
                <SalesView
                  sales={sales}
                  onUpdateSale={handleUpdateSale}
                  onInspectSale={(s) => {
                    setReceiptCash(undefined);
                    setReceiptSale(s);
                  }}
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
              {activeTab === 'pos' && (
                <PosView
                  products={products}
                  customers={customers}
                  ivaRate={empresa.iva}
                  onCompleteSale={(p) => handleCompleteSale({...p, origen: 'POS'})}
                  onNotify={notify}
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
              {activeTab === 'subscription' && (
                <SubscriptionView
                  empresa={empresa}
                  productsCount={products.length}
                  employeesCount={employees.length}
                  isOwner={!userProfile || userProfile.rol === 'superadmin'}
                  unlinkedAccount={unlinkedAccount}
                  onClaimOwner={handleClaimOwner}
                  onChangePlan={handleChangePlan}
                />
              )}
              {activeTab === 'config' && (
                <MobileNativeHubView
                  darkMode={darkMode}
                  onToggleDarkMode={() => setDarkMode((d) => !d)}
                  empresa={empresa}
                  empresas={empresas}
                  userProfile={userProfile}
                  unlinkedAccount={unlinkedAccount}
                  dataSource={dataSource}
                  products={products}
                  customers={customers}
                  suppliers={suppliers}
                  purchases={purchases}
                  sales={sales}
                  banners={banners}
                  employees={employees}
                  tickets={tickets}
                  isInstallable={isInstallable}
                  isInstalled={isInstalled}
                  isIOS={isIOS}
                  onInstallPWA={install}
                  onSaveEmpresa={handleSaveEmpresa}
                  onClaimOwner={handleClaimOwner}
                  onOpenAuth={() => setAuthModalOpen(true)}
                  onLogout={async () => {
                    await yabiAuth.logout();
                    notify('Sesión cerrada. Operando en almacenamiento local.', 'info');
                  }}
                  onNotify={notify}
                />
              )}
              {activeTab === 'support' && (
                <SupportView
                  empresaId={empresa.id}
                  userProfile={userProfile}
                  tickets={tickets}
                  onCreateTicket={handleCreateTicket}
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
            </>
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Tab Bar (5 tabs, <= 64px) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-[#070E1A]/75 border-t border-slate-200/80 dark:border-[#0D1E35] pb-safe"
        aria-label="Navegación móvil"
      >
        <div className="grid grid-cols-5 h-16">
          {mobilePrimaryTabs.map((tabId) => {
            const item = SIDEBAR_ITEMS.find((n) => n.id === tabId)!;
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
                    ? 'text-sky-600 dark:text-[#00C8FF]'
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
                ? 'text-sky-600 dark:text-[#00C8FF]'
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
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0B1525] rounded-t-3xl border-t border-slate-200 dark:border-[#0D1E35] p-5 space-y-4 pb-safe max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Módulos de YA&apos;BI Store
                </h3>
                <p className="text-xs text-slate-400">{empresa.nombre}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {mobileSheetTabs.map((item) => {
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
                    className={`min-h-[52px] p-3.5 rounded-2xl border text-left flex items-center gap-3 ${
                      active
                        ? 'bg-sky-600 dark:bg-[#00C8FF] border-transparent text-white dark:text-[#050A14]'
                        : 'bg-slate-50 dark:bg-[#070E1A] border-slate-200 dark:border-[#0D1E35] text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-semibold truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setAuthModalOpen(true);
              }}
              className="w-full min-h-[46px] rounded-xl bg-sky-600 dark:bg-[#00C8FF] text-white dark:text-[#050A14] text-sm font-semibold flex items-center justify-center gap-2"
            >
              {userProfile ? <UserCheck className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              {userProfile ? `Cuenta: ${userProfile.email || userProfile.nombre}` : 'Iniciar sesión'}
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <AuthModal
        open={authModalOpen}
        defaultEmpresa={empresa}
        currentUser={userProfile}
        onLogout={async () => {
          await yabiAuth.logout();
          notify('Sesión cerrada. Operando en almacenamiento local.', 'info');
        }}
        onSaveLocalEmpresa={handleSaveEmpresa}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {}}
        onNotify={notify}
      />

      <ScannerModal
        open={scannerOpen}
        products={products}
        onClose={() => setScannerOpen(false)}
        onSelectProductToPos={(prod) => {
          setActiveTab('pos');
          notify(`Producto ${prod.sku} listo en Punto de Venta`, 'info');
        }}
      />

      <EmailsModal
        open={emailsOpen}
        emails={emails}
        onClose={() => setEmailsOpen(false)}
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
                  ? 'bg-rose-600 border-rose-500 text-white'
                  : t.tone === 'success'
                  ? 'bg-slate-900 dark:bg-[#00C8FF] border-slate-800 dark:border-[#00C8FF] text-white dark:text-[#050A14] font-semibold'
                  : 'bg-white dark:bg-[#0B1525] border-slate-200 dark:border-[#0D1E35] text-slate-900 dark:text-white'
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
