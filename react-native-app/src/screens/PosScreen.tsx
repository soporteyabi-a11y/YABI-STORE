import React, {useMemo, useState} from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {commitSale, formatCOP, type RnProduct, type RnSale} from '../services/yabiDb';

interface PosScreenProps {
  empresaId: string;
  products: RnProduct[];
  onRefresh: () => Promise<void>;
}

export const PosScreen: React.FC<PosScreenProps> = ({empresaId, products, onRefresh}) => {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<{product: RnProduct; qty: number}[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<RnSale['pago']>('Efectivo');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.estado === 'Activo' &&
        (!q || p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    );
  }, [products, search]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.precio * item.qty, 0),
    [cart]
  );

  const addItem = (product: RnProduct) => {
    if (product.stock <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((i) => (i.product.id === product.id ? {...i, qty: i.qty + 1} : i));
      }
      return [...prev, {product, qty: 1}];
    });
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    try {
      const id = `V-${Date.now().toString(36).toUpperCase()}`;
      const sale: RnSale = {
        id,
        orden: `#${Math.floor(1000 + Math.random() * 8999)}`,
        cliente: 'Mostrador / App Móvil',
        productoId: cart[0].product.id,
        producto:
          cart.length === 1
            ? cart[0].product.nombre
            : `${cart[0].product.nombre} (+${cart.length - 1})`,
        precio: cart[0].product.precio,
        qty: cart.reduce((s, i) => s + i.qty, 0),
        desc: 0,
        total,
        pago: paymentMethod,
        fecha: new Date().toISOString().slice(0, 10),
        estado: 'Pagada',
      };
      const stockUpdates = cart.map((i) => ({
        id: i.product.id,
        stock: Math.max(0, i.product.stock - i.qty),
      }));
      await commitSale(empresaId, sale, stockUpdates);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCart([]);
      setCheckoutOpen(false);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar producto o SKU..."
        placeholderTextColor="#64748B"
        style={styles.searchInput}
      />

      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        renderItem={({item}) => (
          <Pressable
            onPress={() => addItem(item)}
            style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
          >
            <Text style={styles.sku}>
              {item.sku} · {item.stock} disp.
            </Text>
            <Text style={styles.name} numberOfLines={2}>
              {item.nombre}
            </Text>
            <Text style={styles.price}>{formatCOP(item.precio)}</Text>
          </Pressable>
        )}
      />

      {cart.length > 0 && (
        <Pressable onPress={() => setCheckoutOpen(true)} style={styles.floatingBar}>
          <Text style={styles.floatingText}>
            Cobrar {cart.reduce((s, i) => s + i.qty, 0)} ítems
          </Text>
          <Text style={styles.floatingTotal}>{formatCOP(total)}</Text>
        </Pressable>
      )}

      <Modal visible={checkoutOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Finalizar venta · {formatCOP(total)}</Text>
            <View style={styles.methodsRow}>
              {(['Efectivo', 'Nequi', 'Tarjeta', 'Wompi'] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setPaymentMethod(m)}
                  style={[styles.methodBtn, paymentMethod === m && styles.methodActive]}
                >
                  <Text
                    style={[
                      styles.methodText,
                      paymentMethod === m && styles.methodTextActive,
                    ]}
                  >
                    {m}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.sheetActions}>
              <Pressable onPress={() => setCheckoutOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleCheckout} disabled={saving} style={styles.confirmBtn}>
                <Text style={styles.confirmText}>
                  {saving ? 'Registrando...' : 'Confirmar cobro'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#070D17', padding: 14},
  searchInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  listContent: {paddingBottom: 92},
  row: {gap: 10, marginBottom: 10},
  card: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    minHeight: 112,
    justifyContent: 'space-between',
  },
  cardPressed: {opacity: 0.8},
  sku: {fontSize: 11, color: '#94A3B8'},
  name: {fontSize: 14, fontWeight: '600', color: '#F8FAFC', marginVertical: 6},
  price: {fontSize: 15, fontWeight: '700', color: '#38BDF8'},
  floatingBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  floatingText: {color: '#FFFFFF', fontSize: 15, fontWeight: '600'},
  floatingTotal: {color: '#FFFFFF', fontSize: 16, fontWeight: '700'},
  modalBackdrop: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,6,23,0.7)'},
  sheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 16,
  },
  sheetTitle: {fontSize: 17, fontWeight: '700', color: '#F8FAFC'},
  methodsRow: {flexDirection: 'row', gap: 8},
  methodBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodActive: {backgroundColor: '#0284C7', borderColor: '#0284C7'},
  methodText: {color: '#94A3B8', fontSize: 12, fontWeight: '600'},
  methodTextActive: {color: '#FFFFFF'},
  sheetActions: {flexDirection: 'row', gap: 10, marginTop: 6},
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {color: '#E2E8F0', fontWeight: '600'},
  confirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {color: '#FFFFFF', fontWeight: '700'},
});
