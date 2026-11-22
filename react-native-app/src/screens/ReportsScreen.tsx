import React from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {formatCOP, type RnSale} from '../services/yabiDb';

export const ReportsScreen: React.FC<{sales: RnSale[]}> = ({sales}) => {
  const revenue = sales.reduce((s, item) => s + item.total, 0);

  return (
    <View style={styles.container}>
      <View style={styles.kpiCard}>
        <Text style={styles.kpiLabel}>Ventas registradas</Text>
        <Text style={styles.kpiValue}>{formatCOP(revenue)}</Text>
        <Text style={styles.kpiSub}>{sales.length} comprobantes emitidos</Text>
      </View>

      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        renderItem={({item}) => (
          <View style={styles.saleRow}>
            <View style={{flex: 1}}>
              <Text style={styles.meta}>
                {item.orden} · {item.fecha} · {item.pago}
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
  container: {flex: 1, backgroundColor: '#070D17', padding: 14},
  kpiCard: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  kpiLabel: {fontSize: 12, color: '#94A3B8'},
  kpiValue: {fontSize: 26, fontWeight: '700', color: '#F8FAFC', marginTop: 4},
  kpiSub: {fontSize: 12, color: '#38BDF8', marginTop: 4},
  saleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  meta: {fontSize: 11, color: '#94A3B8'},
  title: {fontSize: 14, fontWeight: '600', color: '#F8FAFC', marginTop: 3},
  total: {fontSize: 14, fontWeight: '700', color: '#38BDF8'},
});
