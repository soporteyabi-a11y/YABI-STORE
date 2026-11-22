import React, {useState} from 'react';
import {FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {CameraView, useCameraPermissions} from 'expo-camera';
import {formatCOP, updateStock, type RnProduct} from '../services/yabiDb';

interface InventoryScreenProps {
  empresaId: string;
  products: RnProduct[];
  onRefresh: () => Promise<void>;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  empresaId,
  products,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const filtered = products.filter(
    (p) =>
      p.nombre.toLowerCase().includes(search.trim().toLowerCase()) ||
      p.sku.toLowerCase().includes(search.trim().toLowerCase())
  );

  const openBarcodeScanner = async () => {
    if (!permission?.granted) {
      await requestPermission();
    }
    setScannerOpen(true);
  };

  const adjust = async (item: RnProduct, delta: number) => {
    const next = Math.max(0, item.stock + delta);
    await updateStock(empresaId, item.id, next);
    await onRefresh();
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Filtrar inventario o SKU..."
          placeholderTextColor="#64748B"
          style={styles.input}
        />
        <Pressable onPress={openBarcodeScanner} style={styles.scanBtn}>
          <Text style={styles.scanText}>Escanear</Text>
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({item}) => (
          <View style={styles.row}>
            <View style={{flex: 1}}>
              <Text style={styles.sku}>
                {item.sku} · {item.cat}
              </Text>
              <Text style={styles.name}>{item.nombre}</Text>
              <Text style={styles.price}>{formatCOP(item.precio)}</Text>
            </View>
            <View style={styles.controls}>
              <Pressable onPress={() => adjust(item, -1)} style={styles.stepBtn}>
                <Text style={styles.stepText}>-</Text>
              </Pressable>
              <Text style={styles.stockVal}>{item.stock}</Text>
              <Pressable onPress={() => adjust(item, 1)} style={styles.stepBtn}>
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={scannerOpen} animationType="slide">
        <View style={{flex: 1, backgroundColor: '#000'}}>
          <CameraView
            style={{flex: 1}}
            onBarcodeScanned={({data}) => {
              setSearch(data);
              setScannerOpen(false);
            }}
          />
          <Pressable onPress={() => setScannerOpen(false)} style={styles.closeCam}>
            <Text style={{color: '#FFF', fontWeight: '700'}}>Cerrar cámara</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#070D17', padding: 14},
  toolbar: {flexDirection: 'row', gap: 10, marginBottom: 12},
  input: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    paddingHorizontal: 14,
  },
  scanBtn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
  },
  scanText: {color: '#FFF', fontWeight: '600', fontSize: 13},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  sku: {fontSize: 11, color: '#94A3B8'},
  name: {fontSize: 14, fontWeight: '600', color: '#F8FAFC', marginVertical: 2},
  price: {fontSize: 13, color: '#38BDF8', fontWeight: '700'},
  controls: {flexDirection: 'row', alignItems: 'center', gap: 10},
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {color: '#F8FAFC', fontSize: 18, fontWeight: '600'},
  stockVal: {color: '#F8FAFC', fontSize: 15, fontWeight: '700', minWidth: 28, textAlign: 'center'},
  closeCam: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
});
