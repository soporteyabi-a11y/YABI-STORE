import React from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {formatCOP, type RnSale} from '../services/yabiDb';

export const ReportsScreen: React.FC<{sales: RnSale[]}> = ({sales}) => {
  const paidSales = sales.filter((s) => s.estado !== 'Cancelada');
  const revenue = paidSales.reduce((s, item) => s + item.total, 0);
  const posRevenue = paidSales
    .filter((s) => s.origen !== 'Tienda Online')
    .reduce((s, item) => s + item.total, 0);
  const webRevenue = paidSales
    .filter((s) => s.origen === 'Tienda Online')
    .reduce((s, item) => s + item.total, 0);

  return (
    <View style={styles.container}>
      <View style={styles.kpiCard}>
        <Text style={styles.kpiLabel}>Ventas consolidadas</Text>
        <Text style={styles.kpiValue}>{formatCOP(revenue)}</Text>
        <Text style={styles.kpiSub}>{paidSales.length} comprobantes activos</Text>
      </View>

      <View style={styles.splitRow}>
        <View style={styles.splitCard}>
          <Text style={styles.splitLabel}>Tienda Física · POS</Text>
          <Text style={styles.splitValue}>{formatCOP(posRevenue)}</Text>
        </View>
        <View style={styles.splitCard}>
          <Text style={styles.splitLabel}>Tienda en Línea</Text>
          <Text style={styles.splitValue}>{formatCOP(webRevenue)}</Text>
        </View>
      </View>

      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        renderItem={({item}) => (
          <View style={styles.saleRow}>
            <View style={{flex: 1}}>
              <Text style={styles.meta}>
                {item.orden} · {item.fecha} · {item.pago} · {item.origen || 'POS'}
              </Text>
              <Text style={styles.title}>{item.producto}</Text>
            </View>
            <Text style={styles.total}>{formatCOP(item.total)}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#050A14', padding: 14},
  kpiCard: {
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.2)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
  },
  kpiLabel: {fontSize: 12, color: '#94A3B8'},
  kpiValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  kpiSub: {fontSize: 12, color: '#00C8FF', marginTop: 4},
  splitRow: {flexDirection: 'row', gap: 10, marginBottom: 12},
  splitCard: {
    flex: 1,
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
  },
  splitLabel: {fontSize: 11, color: '#94A3B8'},
  splitValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00C8FF',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  saleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.14)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  meta: {fontSize: 11, color: '#94A3B8'},
  title: {fontSize: 14, fontWeight: '600', color: '#F8FAFC', marginTop: 3},
  total: {fontSize: 14, fontWeight: '700', color: '#00C8FF', fontVariant: ['tabular-nums']},
});
