import React, {useEffect, useState} from 'react';
import {Pressable, SafeAreaView, StyleSheet, Text, TextInput} from 'react-native';
import {NavigationContainer, DarkTheme} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {onAuthStateChanged, signInWithEmailAndPassword, signOut} from 'firebase/auth';
import {BarChart3, Calculator, Package} from 'lucide-react-native';
import {auth} from './src/config/firebase';
import {
  resolveEmpresaId,
  subscribeEmpresaRealtime,
  type RnProduct,
  type RnSale,
} from './src/services/yabiDb';
import {InventoryScreen} from './src/screens/InventoryScreen';
import {PosScreen} from './src/screens/PosScreen';
import {ReportsScreen} from './src/screens/ReportsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [products, setProducts] = useState<RnProduct[]>([]);
  const [sales, setSales] = useState<RnSale[]>([]);
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
        const empId = await resolveEmpresaId(user.uid);
        setEmpresaId(empId);
        unsubFirestore = subscribeEmpresaRealtime(empId, setProducts, setSales);
      } else {
        setEmpresaId(null);
        setProducts([]);
        setSales([]);
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
        <Text style={styles.brand}>YA&apos;BI Store</Text>
        <Text style={styles.sub}>POS &amp; Inventario Móvil Nativo (onSnapshot)</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Correo de empresa"
          placeholderTextColor="#64748B"
          autoCapitalize="none"
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

  return (
    <NavigationContainer theme={DarkTheme}>
      <Tab.Navigator
        screenOptions={{
          headerStyle: {backgroundColor: '#0A111F'},
          headerTintColor: '#F8FAFC',
          tabBarStyle: {backgroundColor: '#0A111F', borderTopColor: '#1E293B'},
          tabBarActiveTintColor: '#38BDF8',
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
          {() => <PosScreen empresaId={empresaId} products={products} onRefresh={async () => {}} />}
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
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  authContainer: {
    flex: 1,
    backgroundColor: '#070D17',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  brand: {fontSize: 28, fontWeight: '700', color: '#F8FAFC'},
  sub: {fontSize: 14, color: '#94A3B8', marginBottom: 12},
  error: {color: '#F87171', fontSize: 13},
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    paddingHorizontal: 14,
  },
  loginBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  loginText: {color: '#FFFFFF', fontSize: 15, fontWeight: '700'},
});
