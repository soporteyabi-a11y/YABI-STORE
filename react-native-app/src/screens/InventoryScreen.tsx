import React, {useState} from 'react';
import {FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {CameraView, useCameraPermissions} from 'expo-camera';
import * as Haptics from 'expo-haptics';
import {Camera, Plus, X} from 'lucide-react-native';
import {formatCOP, saveProduct, updateStock, type RnProduct} from '../services/yabiDb';

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
  const [createOpen, setCreateOpen] = useState(false);
  const [nombre, setNombre] = useState('');
  const [sku, setSku] = useState('');
  const [cat, setCat] = useState('General');
  const [precio, setPrecio] = useState('');
  const [stockInit, setStockInit] = useState('10');
  const [saving, setSaving] = useState(false);
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
    Haptics.selectionAsync();
    await onRefresh();
  };

  const handleCreateProduct = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      const priceNum = Math.max(0, parseFloat(precio) || 0);
      const stockNum = Math.max(0, parseInt(stockInit, 10) || 0);
      await saveProduct(empresaId, {
        id: `P-${Date.now().toString(36).toUpperCase()}`,
        nombre: nombre.trim(),
        sku: sku.trim() || `SKU-${Math.floor(1000 + Math.random() * 8999)}`,
        cat: cat.trim() || 'General',
        precio: priceNum,
        costo: Math.round(priceNum * 0.6),
        stock: stockNum,
        minStock: 3,
        estado: 'Activo',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNombre('');
      setSku('');
      setPrecio('');
      setStockInit('10');
      setCreateOpen(false);
    } finally {
      setSaving(false);
    }
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
          <Camera color="#050A14" size={18} />
        </Pressable>
        <Pressable onPress={() => setCreateOpen(true)} style={styles.scanBtn}>
          <Plus color="#050A14" size={18} />
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
              <Text style={[styles.stockVal, item.stock <= item.minStock && {color: '#FBBF24'}]}>
                {item.stock}
              </Text>
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
            <Text style={{color: '#F8FAFC', fontWeight: '700'}}>Cerrar cámara</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={createOpen} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nuevo producto</Text>
              <Pressable onPress={() => setCreateOpen(false)}>
                <X color="#94A3B8" size={20} />
              </Pressable>
            </View>
            <TextInput
              value={nombre}
              onChangeText={setNombre}
              placeholder="Nombre del producto"
              placeholderTextColor="#64748B"
              style={styles.modalInput}
            />
            <TextInput
              value={sku}
              onChangeText={setSku}
              placeholder="SKU o código de barras"
              placeholderTextColor="#64748B"
              style={styles.modalInput}
            />
            <TextInput
              value={cat}
              onChangeText={setCat}
              placeholder="Categoría"
              placeholderTextColor="#64748B"
              style={styles.modalInput}
            />
            <View style={{flexDirection: 'row', gap: 10}}>
              <TextInput
                value={precio}
                onChangeText={setPrecio}
                placeholder="Precio COP"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                style={[styles.modalInput, {flex: 1}]}
              />
              <TextInput
                value={stockInit}
                onChangeText={setStockInit}
                placeholder="Stock inicial"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                style={[styles.modalInput, {flex: 1}]}
              />
            </View>
            <Pressable onPress={handleCreateProduct} disabled={saving} style={styles.saveBtn}>
              <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar producto'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#050A14', padding: 14},
  toolbar: {flexDirection: 'row', gap: 8, marginBottom: 12},
  input: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#0B1525',
    color: '#F8FAFC',
    paddingHorizontal: 14,
  },
  scanBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#00C8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.14)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  sku: {fontSize: 11, color: '#94A3B8'},
  name: {fontSize: 14, fontWeight: '600', color: '#F8FAFC', marginVertical: 2},
  price: {fontSize: 13, color: '#00C8FF', fontWeight: '700', fontVariant: ['tabular-nums']},
  controls: {flexDirection: 'row', alignItems: 'center', gap: 10},
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#0D1E35',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {color: '#F8FAFC', fontSize: 18, fontWeight: '600'},
  stockVal: {color: '#F8FAFC', fontSize: 15, fontWeight: '700', minWidth: 28, textAlign: 'center'},
  closeCam: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.4)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
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
  modalInput: {
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
