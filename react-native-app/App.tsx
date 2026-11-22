import React, {useEffect, useState} from 'react';
import {
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
import {onAuthStateChanged, signInWithEmailAndPassword, signOut} from 'firebase/auth';
import {
  ArrowLeft,
  BarChart3,
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
import {auth} from './src/config/firebase';
import {
  resolveEmpresaId,
  subscribeEmpresaRealtime,
  type RnBanner,
  type RnCustomer,
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

const Tab = createBottomTabNavigator();

type MoreModule = 'menu' | 'purchases' | 'customers' | 'banners' | 'support';

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
  const [error, setError] = useState('');

  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }
      if (user) {
        setUserEmail(user.email || '');
        const empId = await resolveEmpresaId(user.uid);
        setEmpresaId(empId);
        unsubFirestore = subscribeEmpresaRealtime(empId, {
          onProducts: setProducts,
          onSales: setSales,
          onPurchases: setPurchases,
          onCustomers: setCustomers,
          onSuppliers: setSuppliers,
          onBanners: setBanners,
          onTickets: setTickets,
        });
      } else {
        setEmpresaId(null);
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
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  const handleLogin = async () => {
    try {
      setError('');
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setError('Credenciales inválidas en YA’BI Store');
    }
  };

  if (!empresaId) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar style="light" />
        <Text style={styles.brand}>YA&apos;BI Store</Text>
        <Text style={styles.sub}>POS &amp; Gestión Omnicanal Móvil (onSnapshot)</Text>
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
        <Pressable onPress={handleLogin} style={styles.loginBtn}>
          <Text style={styles.loginText}>Ingresar</Text>
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

    return (
      <ScrollView style={styles.moreContainer} contentContainerStyle={{gap: 12}}>
        <View style={styles.empBadge}>
          <Text style={styles.empCode}>Empresa {empresaId}</Text>
          <Text style={styles.empEmail}>{userEmail}</Text>
        </View>

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
        </View>

        <Pressable onPress={() => signOut(auth)} style={styles.logoutCard}>
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
            <Pressable onPress={() => signOut(auth)} style={{paddingRight: 14}}>
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
          {() => <SalesScreen empresaId={empresaId} sales={sales} />}
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
  empCode: {color: '#00C8FF', fontSize: 13, fontWeight: '700'},
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
});
