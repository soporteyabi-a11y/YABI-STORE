import React, {useMemo, useState} from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {Check, Plus, X} from 'lucide-react-native';
import {
  formatCOP,
  receivePurchase,
  savePurchase,
  type RnProduct,
  type RnPurchase,
  type RnSupplier,
} from '../services/yabiDb';

interface PurchasesScreenProps {
  empresaId: string;
  purchases: RnPurchase[];
  products: RnProduct[];
  suppliers: RnSupplier[];
}

export const PurchasesScreen: React.FC<PurchasesScreenProps> = ({
  empresaId,
  purchases,
  products,
  suppliers,
}) => {
  const [filter, setFilter] = useState<'Todas' | 'Pendiente' | 'Recibida'>('Todas');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProdId, setSelectedProdId] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [qty, setQty] = useState('5');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);

  const visible = useMemo(
    () => purchases.filter((p) => filter === 'Todas' || p.estado === filter),
    [purchases, filter]
  );

  const openNew = () => {
    const firstProd = products[0];
    setSelectedProdId(firstProd?.id || '');
    setCost(firstProd ? String(firstProd.costo || 0) : '0');
    setSelectedSupplier(suppliers[0]?.empresa || 'Proveedor General');
    setQty('5');
    setModalOpen(true);
  };

  const handleCreate = async () => {
    const prod = products.find((p) => p.id === selectedProdId);
    const numQty = Math.max(1, parseInt(qty, 10) || 1);
    const numCost = Math.max(0, parseFloat(cost) || prod?.costo || 0);
    if (!prod) return;

    setSaving(true);
    try {
      const order: RnPurchase = {
        id: `OC-${Date.now().toString(36).toUpperCase()}`,
        orden: `OC-${Math.floor(100 + Math.random() * 899)}`,
        proveedor: selectedSupplier || 'Proveedor General',
        productoId: prod.id,
        producto: prod.nombre,
        qty: numQty,
        costo: numCost,
        total: numQty * numCost,
        fecha: new Date().toISOString().slice(0, 10),
        estado: 'Pendiente',
      };
      await savePurchase(empresaId, order);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleReceive = async (purchase: RnPurchase) => {
    if (purchase.estado === 'Recibida') return;
    const prod = products.find((p) => p.id === purchase.productoId);
    const nextStock = (prod?.stock || 0) + purchase.qty;
    await receivePurchase(empresaId, purchase.id, purchase.productoId, nextStock);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.filters}>
          {(['Todas', 'Pendiente', 'Recibida'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.chip, filter === f && styles.chipActive]}
            >
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={openNew} style={styles.addBtn}>
          <Plus color="#050A14" size={18} />
        </Pressable>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={({item}) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.orden}>
                {item.orden} · {item.fecha}
              </Text>
              <Text
                style={[
                  styles.status,
                  item.estado === 'Recibida' ? styles.statusDone : styles.statusPending,
                ]}
              >
                {item.estado}
              </Text>
            </View>
            <Text style={styles.title}>{item.producto}</Text>
            <Text style={styles.sub}>
              {item.proveedor} · {item.qty} uds × {formatCOP(item.costo)}
            </Text>
            <View style={styles.cardBottom}>
              <Text style={styles.total}>{formatCOP(item.total)}</Text>
              {item.estado === 'Pendiente' && (
                <Pressable onPress={() => handleReceive(item)} style={styles.receiveBtn}>
                  <Check color="#050A14" size={14} />
                  <Text style={styles.receiveText}>Recibir stock</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      />

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nueva orden de compra</Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <X color="#94A3B8" size={20} />
              </Pressable>
            </View>

            <Text style={styles.label}>Producto</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
              {products.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setSelectedProdId(p.id);
                    setCost(String(p.costo || 0));
                  }}
                  style={[styles.chip, selectedProdId === p.id && styles.chipActive]}
                >
                  <Text style={[styles.chipText, selectedProdId === p.id && styles.chipTextActive]}>
                    {p.nombre}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Proveedor</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
              {['Proveedor General', ...suppliers.map((s) => s.empresa)].map((sup) => (
                <Pressable
                  key={sup}
                  onPress={() => setSelectedSupplier(sup)}
                  style={[styles.chip, selectedSupplier === sup && styles.chipActive]}
                >
                  <Text style={[styles.chipText, selectedSupplier === sup && styles.chipTextActive]}>
                    {sup}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={{flexDirection: 'row', gap: 10}}>
              <View style={{flex: 1}}>
                <Text style={styles.label}>Cantidad</Text>
                <TextInput
                  value={qty}
                  onChangeText={setQty}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.label}>Costo unitario</Text>
                <TextInput
                  value={cost}
                  onChangeText={setCost}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
            </View>

            <Pressable onPress={handleCreate} disabled={saving} style={styles.saveBtn}>
              <Text style={styles.saveText}>{saving ? 'Creando...' : 'Registrar compra'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#050A14', padding: 14},
  topRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
  filters: {flexDirection: 'row', gap: 8},
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  chipActive: {backgroundColor: '#00C8FF', borderColor: '#00C8FF'},
  chipText: {color: '#94A3B8', fontSize: 12, fontWeight: '600'},
  chipTextActive: {color: '#050A14', fontWeight: '700'},
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#00C8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.14)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 5,
  },
  cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  orden: {color: '#00C8FF', fontSize: 12, fontWeight: '700'},
  status: {fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6},
  statusDone: {color: '#34D399', backgroundColor: 'rgba(16,185,129,0.14)'},
  statusPending: {color: '#FBBF24', backgroundColor: 'rgba(245,158,11,0.14)'},
  title: {color: '#F8FAFC', fontSize: 15, fontWeight: '600'},
  sub: {color: '#94A3B8', fontSize: 12},
  cardBottom: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6},
  total: {color: '#F8FAFC', fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums']},
  receiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#00C8FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  receiveText: {color: '#050A14', fontSize: 12, fontWeight: '700'},
  backdrop: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,10,20,0.78)'},
  sheet: {
    backgroundColor: '#0B1525',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(0,200,255,0.2)',
    padding: 20,
    gap: 10,
  },
  sheetHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  sheetTitle: {color: '#F8FAFC', fontSize: 17, fontWeight: '700'},
  label: {color: '#94A3B8', fontSize: 12, fontWeight: '600'},
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#050A14',
    color: '#F8FAFC',
    paddingHorizontal: 12,
  },
  saveBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#00C8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  saveText: {color: '#050A14', fontWeight: '800', fontSize: 15},
});
