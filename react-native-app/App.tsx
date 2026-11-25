import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {NavigationContainer, DarkTheme} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {StatusBar} from 'expo-status-bar';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Calculator,
  Headphones,
  Image as ImageIcon,
  LogOut,
  Menu,
  Package,
  Receipt,
  ShoppingCart,
  Users,
} from 'lucide-react-native';
import {
  listAccessibleEmpresas,
  resolveUserContext,
  rnActiveBackend,
  rnAuth,
  subscribeEmpresaRealtime,
  type RnBanner,
  type RnCustomer,
  type RnEmpresa,
  type RnProduct,
  type RnPurchase,
  type RnSale,
  type RnSupplier,
  type RnTicket,
} from './src/services/yabiDb';
import {InventoryScreen} from './src/screens/InventoryScreen';
import {PosScreen} from './src/screens/PosScreen';
import {ReportsScreen} from './src/screens/ReportsScreen';
import {SalesScreen} from './src/screens/SalesScreen';
import {PurchasesScreen} from './src/screens/PurchasesScreen';
import {CustomersScreen} from './src/screens/CustomersScreen';
import {BannersScreen} from './src/screens/BannersScreen';
import {SupportScreen} from './src/screens/SupportScreen';
import {CompanySettingsScreen} from './src/screens/CompanySettingsScreen';

const Tab = createBottomTabNavigator();

type MoreModule = 'menu' | 'purchases' | 'customers' | 'banners' | 'support' | 'settings';

const DEFAULT_RN_EMPRESA: RnEmpresa = {
  id: 'EMP001',
  nombre: "DIGITAL YA'BI",
  iva: 0,
  plan: 'Pro',
  color: '#00C8FF',
  activa: true,
};

const YabiNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#050A14',
    card: '#070E1A',
    text: '#F8FAFC',
    border: 'rgba(0,200,255,0.16)',
    primary: '#00C8FF',
  },
};

export default function App() {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [empresas, setEmpresas] = useState<RnEmpresa[]>([]);
  const [empresa, setEmpresa] = useState<RnEmpresa>(DEFAULT_RN_EMPRESA);
  const [userEmail, setUserEmail] = useState('');
  const [products, setProducts] = useState<RnProduct[]>([]);
  const [sales, setSales] = useState<RnSale[]>([]);
  const [purchases, setPurchases] = useState<RnPurchase[]>([]);
  const [customers, setCustomers] = useState<RnCustomer[]>([]);
  const [suppliers, setSuppliers] = useState<RnSupplier[]>([]);
  const [banners, setBanners] = useState<RnBanner[]>([]);
  const [tickets, setTickets] = useState<RnTicket[]>([]);
  const [moreModule, setMoreModule] = useState<MoreModule>('menu');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubAuth = rnAuth.subscribe(async (user) => {
      if (user) {
        setUserEmail(user.email || '');
        const ctx = await resolveUserContext(user.uid);
        setIsSuperAdmin(ctx.isSuperAdmin);
        setEmpresaId(ctx.empresaId);
        setEmpresa((prev) => ({...prev, id: ctx.empresaId}));
        try {
          const list = await listAccessibleEmpresas(ctx.isSuperAdmin, ctx.empresaId);
          setEmpresas(list);
        } catch {
          setEmpresas([]);
        }
      } else {
        setEmpresaId(null);
        setIsSuperAdmin(false);
        setEmpresas([]);
        setEmpresa(DEFAULT_RN_EMPRESA);
        setUserEmail('');
        setProducts([]);
        setSales([]);
        setPurchases([]);
        setCustomers([]);
        setSuppliers([]);
        setBanners([]);
        setTickets([]);
        setMoreModule('menu');
      }
    });
    return () => {
      unsubAuth();
    };
  }, []);

  useEffect(() => {
    if (!empresaId) return;
    const unsubCloud = subscribeEmpresaRealtime(empresaId, {
      onEmpresa: (emp) => {
        setEmpresa(emp);
        setEmpresas((prev) =>
          prev.some((e) => e.id === emp.id) ? prev.map((e) => (e.id === emp.id ? emp : e)) : prev
        );
      },
      onProducts: setProducts,
      onSales: setSales,
      onPurchases: setPurchases,
      onCustomers: setCustomers,
      onSuppliers: setSuppliers,
      onBanners: setBanners,
      onTickets: setTickets,
    });
    return () => {
      unsubCloud();
    };
  }, [empresaId]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setLoggingIn(true);
    try {
      setError('');
      await rnAuth.login(email.trim(), password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(
        msg.toLowerCase().includes('invalid')
          ? 'Correo o contraseña incorrectos en YA’BI Store.'
          : msg || 'No fue posible iniciar sesión en YA’BI Store.'
      );
    } finally {
      setLoggingIn(false);
    }
  };

  if (!empresaId) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar style="light" />
        <Text style={styles.brand}>YA&apos;BI Store</Text>
        <Text style={styles.sub}>
          POS &amp; Gestión Omnicanal Móvil (
          {rnActiveBackend === 'supabase' ? 'Supabase Realtime' : 'Firebase onSnapshot'})
        </Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Correo de empresa"
          placeholderTextColor="#64748B"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          placeholderTextColor="#64748B"
          secureTextEntry
          style={styles.input}
        />
        <Pressable onPress={handleLogin} disabled={loggingIn} style={styles.loginBtn}>
          {loggingIn ? (
            <ActivityIndicator color="#050A14" />
          ) : (
            <Text style={styles.loginText}>Ingresar</Text>
          )}
        </Pressable>
      </SafeAreaView>
    );
  }

  const renderMoreScreen = () => {
    if (moreModule === 'purchases') {
      return (
        <View style={{flex: 1, backgroundColor: '#050A14'}}>
          <Pressable onPress={() => setMoreModule('menu')} style={styles.backHeader}>
            <ArrowLeft color="#00C8FF" size={18} />
            <Text style={styles.backText}>Volver a Módulos · Compras</Text>
          </Pressable>
          <PurchasesScreen
            empresaId={empresaId}
            purchases={purchases}
            products={products}
            suppliers={suppliers}
          />
        </View>
      );
    }
    if (moreModule === 'customers') {
      return (
        <View style={{flex: 1, backgroundColor: '#050A14'}}>
          <Pressable onPress={() => setMoreModule('menu')} style={styles.backHeader}>
            <ArrowLeft color="#00C8FF" size={18} />
            <Text style={styles.backText}>Volver a Módulos · Clientes y Proveedores</Text>
          </Pressable>
          <CustomersScreen empresaId={empresaId} customers={customers} suppliers={suppliers} />
        </View>
      );
    }
    if (moreModule === 'banners') {
      return (
        <View style={{flex: 1, backgroundColor: '#050A14'}}>
          <Pressable onPress={() => setMoreModule('menu')} style={styles.backHeader}>
            <ArrowLeft color="#00C8FF" size={18} />
            <Text style={styles.backText}>Volver a Módulos · Banners</Text>
          </Pressable>
          <BannersScreen empresaId={empresaId} banners={banners} />
        </View>
      );
    }
    if (moreModule === 'support') {
      return (
        <View style={{flex: 1, backgroundColor: '#050A14'}}>
          <Pressable onPress={() => setMoreModule('menu')} style={styles.backHeader}>
            <ArrowLeft color="#00C8FF" size={18} />
            <Text style={styles.backText}>Volver a Módulos · Soporte</Text>
          </Pressable>
          <SupportScreen empresaId={empresaId} userEmail={userEmail} tickets={tickets} />
        </View>
      );
    }
    if (moreModule === 'settings') {
      return (
        <View style={{flex: 1, backgroundColor: '#050A14'}}>
          <Pressable onPress={() => setMoreModule('menu')} style={styles.backHeader}>
            <ArrowLeft color="#00C8FF" size={18} />
            <Text style={styles.backText}>Volver a Módulos · Datos Fiscales</Text>
          </Pressable>
          <CompanySettingsScreen empresa={empresa} onSaved={setEmpresa} />
        </View>
      );
    }

    const ivaPct = Number(empresa.iva ?? 0);

    return (
      <ScrollView style={styles.moreContainer} contentContainerStyle={{gap: 12, paddingBottom: 28}}>
        <View style={styles.empBadge}>
          <Text style={styles.empName}>{empresa.nombre}</Text>
          <Text style={styles.empCode}>
            {empresaId} · {rnActiveBackend === 'supabase' ? 'Supabase' : 'Firebase'} ·{' '}
            {ivaPct > 0 ? `IVA ${ivaPct}%` : 'No responsable de IVA'}
          </Text>
          <Text style={styles.empEmail}>{userEmail}</Text>
        </View>

        {isSuperAdmin && empresas.length > 1 && (
          <View style={styles.switcherCard}>
            <Text style={styles.switcherTitle}>Multi-Empresas ({empresas.length})</Text>
            <View style={styles.switcherList}>
              {empresas.map((empItem) => {
                const isActive = empItem.id === empresaId;
                return (
                  <Pressable
                    key={empItem.id}
                    disabled={empItem.activa === false}
                    onPress={() => {
                      setEmpresaId(empItem.id);
                      setEmpresa(empItem);
                    }}
                    style={[
                      styles.switcherBtn,
                      isActive ? styles.switcherBtnActive : null,
                      empItem.activa === false ? {opacity: 0.45} : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.switcherBtnCode,
                        isActive ? {color: '#050A14'} : null,
                      ]}
                    >
                      {empItem.id}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.switcherBtnName,
                        isActive ? {color: '#050A14'} : null,
                      ]}
                    >
                      {empItem.nombre}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.grid}>
          <Pressable onPress={() => setMoreModule('purchases')} style={styles.moduleCard}>
            <ShoppingCart color="#00C8FF" size={22} />
            <Text style={styles.moduleTitle}>Compras</Text>
            <Text style={styles.moduleSub}>{purchases.length} órdenes</Text>
          </Pressable>

          <Pressable onPress={() => setMoreModule('customers')} style={styles.moduleCard}>
            <Users color="#00C8FF" size={22} />
            <Text style={styles.moduleTitle}>Clientes &amp; Prov.</Text>
            <Text style={styles.moduleSub}>
              {customers.length} cl · {suppliers.length} pr
            </Text>
          </Pressable>

          <Pressable onPress={() => setMoreModule('banners')} style={styles.moduleCard}>
            <ImageIcon color="#00C8FF" size={22} />
            <Text style={styles.moduleTitle}>Banners Web</Text>
            <Text style={styles.moduleSub}>{banners.length} activos</Text>
          </Pressable>

          <Pressable onPress={() => setMoreModule('support')} style={styles.moduleCard}>
            <Headphones color="#00C8FF" size={22} />
            <Text style={styles.moduleTitle}>Soporte</Text>
            <Text style={styles.moduleSub}>{tickets.length} tickets</Text>
          </Pressable>

          <Pressable onPress={() => setMoreModule('settings')} style={styles.moduleCardFull}>
            <Building2 color="#00C8FF" size={22} />
            <View style={{flex: 1}}>
              <Text style={styles.moduleTitle}>Datos Fiscales y Empresa</Text>
              <Text style={styles.moduleSub}>
                {[
                  empresa.nit ? `NIT ${empresa.nit}` : '',
                  empresa.direccion || '',
                  ivaPct > 0 ? `Responsable IVA (${ivaPct}%)` : 'No responsable de IVA (0%)',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </Pressable>
        </View>

        <Pressable onPress={() => rnAuth.logout()} style={styles.logoutCard}>
          <LogOut color="#F87171" size={18} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    );
  };

  return (
    <NavigationContainer theme={YabiNavTheme}>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerStyle: {backgroundColor: '#070E1A'},
          headerTintColor: '#F8FAFC',
          tabBarStyle: {
            backgroundColor: '#070E1A',
            borderTopColor: 'rgba(0,200,255,0.16)',
          },
          tabBarActiveTintColor: '#00C8FF',
          tabBarInactiveTintColor: '#94A3B8',
          headerRight: () => (
            <Pressable onPress={() => rnAuth.logout()} style={{paddingRight: 14}}>
              <Text style={{color: '#94A3B8', fontSize: 12}}>Salir</Text>
            </Pressable>
          ),
        }}
      >
        <Tab.Screen
          name="POS"
          options={{tabBarIcon: ({color, size}) => <Calculator color={color} size={size} />}}
        >
          {() => (
            <PosScreen
              empresaId={empresaId}
              empresa={empresa}
              products={products}
              customers={customers}
              onRefresh={async () => {}}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Ventas"
          options={{tabBarIcon: ({color, size}) => <Receipt color={color} size={size} />}}
        >
          {() => <SalesScreen empresaId={empresaId} empresa={empresa} sales={sales} />}
        </Tab.Screen>

        <Tab.Screen
          name="Inventario"
          options={{tabBarIcon: ({color, size}) => <Package color={color} size={size} />}}
        >
          {() => (
            <InventoryScreen empresaId={empresaId} products={products} onRefresh={async () => {}} />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Reportes"
          options={{tabBarIcon: ({color, size}) => <BarChart3 color={color} size={size} />}}
        >
          {() => <ReportsScreen sales={sales} />}
        </Tab.Screen>

        <Tab.Screen
          name="Módulos"
          options={{tabBarIcon: ({color, size}) => <Menu color={color} size={size} />}}
        >
          {renderMoreScreen}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  authContainer: {
    flex: 1,
    backgroundColor: '#050A14',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  brand: {fontSize: 30, fontWeight: '800', color: '#00C8FF'},
  sub: {fontSize: 14, color: '#94A3B8', marginBottom: 12},
  error: {color: '#F87171', fontSize: 13},
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#0B1525',
    color: '#F8FAFC',
    paddingHorizontal: 14,
  },
  loginBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#00C8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  loginText: {color: '#050A14', fontSize: 15, fontWeight: '800'},
  moreContainer: {flex: 1, backgroundColor: '#050A14', padding: 14},
  empBadge: {
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.2)',
    borderRadius: 14,
    padding: 14,
    gap: 2,
  },
  empName: {color: '#F8FAFC', fontSize: 16, fontWeight: '800'},
  empCode: {color: '#00C8FF', fontSize: 12, fontWeight: '700'},
  empEmail: {color: '#94A3B8', fontSize: 12},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  moduleCard: {
    width: '48%',
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.16)',
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  moduleCardFull: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.22)',
    borderRadius: 16,
    padding: 16,
  },
  moduleTitle: {color: '#F8FAFC', fontSize: 15, fontWeight: '700', marginTop: 4},
  moduleSub: {color: '#94A3B8', fontSize: 12},
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#070E1A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  backText: {color: '#F8FAFC', fontSize: 13, fontWeight: '600'},
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
  },
  logoutText: {color: '#F87171', fontSize: 14, fontWeight: '700'},
  switcherCard: {
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.2)',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  switcherTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  switcherList: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  switcherBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#070E1A',
    maxWidth: '48%',
  },
  switcherBtnActive: {
    backgroundColor: '#00C8FF',
    borderColor: '#00C8FF',
  },
  switcherBtnCode: {color: '#00C8FF', fontSize: 10, fontWeight: '800'},
  switcherBtnName: {color: '#F8FAFC', fontSize: 12, fontWeight: '600'},
});
