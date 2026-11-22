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
import {Truck, X} from 'lucide-react-native';
import {formatCOP, updateSale, type RnSale} from '../services/yabiDb';

interface SalesScreenProps {
  empresaId: string;
  sales: RnSale[];
}

export const SalesScreen: React.FC<SalesScreenProps> = ({empresaId, sales}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todas' | RnSale['estado']>('Todas');
  const [selected, setSelected] = useState<RnSale | null>(null);
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [status, setStatus] = useState<RnSale['estado']>('Pagada');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      const okStatus = statusFilter === 'Todas' || s.estado === statusFilter;
      const okQuery =
        !q ||
        s.orden.toLowerCase().includes(q) ||
        s.cliente.toLowerCase().includes(q) ||
        (s.guia || '').toLowerCase().includes(q);
      return okStatus && okQuery;
    });
  }, [sales, search, statusFilter]);

  const openEditor = (sale: RnSale) => {
    setSelected(sale);
    setCarrier(sale.transportadora || '');
    setTracking(sale.guia || '');
    setStatus(sale.estado);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateSale(empresaId, selected.id, {
        estado: status,
        transportadora: carrier.trim() || undefined,
        guia: tracking.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar orden, cliente o guía..."
        placeholderTextColor="#64748B"
        style={styles.search}
      />

      <View style={styles.filters}>
        {(['Todas', 'Pagada', 'Pendiente', 'Cancelada'] as const).map((st) => (
          <Pressable
            key={st}
            onPress={() => setStatusFilter(st)}
            style={[styles.filterBtn, statusFilter === st && styles.filterActive]}
          >
            <Text style={[styles.filterText, statusFilter === st && styles.filterTextActive]}>
              {st}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({item}) => (
          <Pressable onPress={() => openEditor(item)} style={styles.card}>
            <View style={styles.rowTop}>
              <Text style={styles.orden}>
                {item.orden} · {item.origen || 'POS'}
              </Text>
              <Text
                style={[
                  styles.badge,
                  item.estado === 'Pagada'
                    ? styles.badgePaid
                    : item.estado === 'Pendiente'
                    ? styles.badgePending
                    : styles.badgeCancelled,
                ]}
              >
                {item.estado}
              </Text>
            </View>
            <Text style={styles.cliente}>{item.cliente}</Text>
            <Text style={styles.producto} numberOfLines={1}>
              {item.producto} ({item.qty})
            </Text>
            <View style={styles.rowBottom}>
              <Text style={styles.meta}>
                {item.fecha} · {item.pago}
                {item.guia ? ` · Guía ${item.guia}` : ''}
              </Text>
              <Text style={styles.total}>{formatCOP(item.total)}</Text>
            </View>
          </Pressable>
        )}
      />

      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <Truck color="#00C8FF" size={18} />
                <Text style={styles.sheetTitle}>Orden {selected?.orden}</Text>
              </View>
              <Pressable onPress={() => setSelected(null)}>
                <X color="#94A3B8" size={20} />
              </Pressable>
            </View>

            <Text style={styles.label}>Estado</Text>
            <View style={styles.filters}>
              {(['Pagada', 'Pendiente', 'Cancelada'] as const).map((st) => (
                <Pressable
                  key={st}
                  onPress={() => setStatus(st)}
                  style={[styles.filterBtn, status === st && styles.filterActive]}
                >
                  <Text style={[styles.filterText, status === st && styles.filterTextActive]}>
                    {st}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Transportadora</Text>
            <TextInput
              value={carrier}
              onChangeText={setCarrier}
              placeholder="Ej: Servientrega, Coordinadora..."
              placeholderTextColor="#64748B"
              style={styles.input}
            />

            <Text style={styles.label}>Número de Guía</Text>
            <TextInput
              value={tracking}
              onChangeText={setTracking}
              placeholder="Ej: GU-902381"
              placeholderTextColor="#64748B"
              style={styles.input}
            />

            <Pressable onPress={handleSave} disabled={saving} style={styles.saveBtn}>
              <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar despacho'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#050A14', padding: 14},
  search: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#0B1525',
    color: '#F8FAFC',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  filters: {flexDirection: 'row', gap: 8, marginBottom: 12},
  filterBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#0B1525',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterActive: {backgroundColor: '#00C8FF', borderColor: '#00C8FF'},
  filterText: {color: '#94A3B8', fontSize: 12, fontWeight: '600'},
  filterTextActive: {color: '#050A14', fontWeight: '700'},
  card: {
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.14)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 4,
  },
  rowTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  orden: {color: '#00C8FF', fontSize: 12, fontWeight: '700'},
  badge: {fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6},
  badgePaid: {color: '#34D399', backgroundColor: 'rgba(16,185,129,0.14)'},
  badgePending: {color: '#FBBF24', backgroundColor: 'rgba(245,158,11,0.14)'},
  badgeCancelled: {color: '#F87171', backgroundColor: 'rgba(239,68,68,0.14)'},
  cliente: {color: '#F8FAFC', fontSize: 14, fontWeight: '600'},
  producto: {color: '#94A3B8', fontSize: 12},
  rowBottom: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4},
  meta: {color: '#64748B', fontSize: 11},
  total: {color: '#F8FAFC', fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums']},
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
  sheetHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4},
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
