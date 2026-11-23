import React, {useMemo, useRef, useState} from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {CameraView, useCameraPermissions} from 'expo-camera';
import * as Haptics from 'expo-haptics';
import {Camera, Check, Minus, Plus, Share2, Trash2, X} from 'lucide-react-native';
import {
  commitSale,
  formatCOP,
  formatReceiptText,
  type RnCustomer,
  type RnEmpresa,
  type RnPaymentMethod,
  type RnProduct,
  type RnSale,
} from '../services/yabiDb';

interface PosScreenProps {
  empresaId: string;
  empresa: RnEmpresa;
  products: RnProduct[];
  customers: RnCustomer[];
  onRefresh: () => Promise<void>;
}

export const PosScreen: React.FC<PosScreenProps> = ({
  empresaId,
  empresa,
  products,
  customers,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<{product: RnProduct; qty: number}[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<RnPaymentMethod>('Efectivo');
  const [selectedCustomer, setSelectedCustomer] = useState('Mostrador / Cliente General');
  const [discountInput, setDiscountInput] = useState('');
  const [cashInput, setCashInput] = useState('');
  const [notes, setNotes] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanHint, setScanHint] = useState('');
  const [saving, setSaving] = useState(false);
  const [receiptSale, setReceiptSale] = useState<{sale: RnSale; cashReceived?: number} | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const scanLockRef = useRef(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.estado === 'Activo' &&
        (!q || p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    );
  }, [products, search]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.precio * item.qty, 0),
    [cart]
  );
  const discount = Math.min(subtotal, Math.max(0, Number(discountInput) || 0));
  const total = Math.max(0, subtotal - discount);
  const ivaRate = Number(empresa.iva ?? 0);
  const baseGravable = ivaRate > 0 ? Math.round(total / (1 + ivaRate / 100)) : total;
  const ivaValor = ivaRate > 0 ? Math.max(0, total - baseGravable) : 0;
  const cashReceived = Number(cashInput) || 0;
  const change = paymentMethod === 'Efectivo' && cashReceived > total ? cashReceived - total : 0;

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

  const adjustCartQty = (productId: string, delta: number) => {
    Haptics.selectionAsync();
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const next = Math.min(item.product.stock, item.qty + delta);
          return next <= 0 ? null : {...item, qty: next};
        })
        .filter((item): item is {product: RnProduct; qty: number} => item !== null)
    );
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Permiso requerido', 'Activa el permiso de cámara para escanear códigos SKU o QR.');
        return;
      }
    }
    scanLockRef.current = false;
    setScanHint('');
    setScannerOpen(true);
  };

  const handleBarcodeScanned = (raw: string) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    const code = raw.trim().toLowerCase();
    setScannerOpen(false);
    const match = products.find(
      (p) =>
        p.estado === 'Activo' &&
        (p.sku.toLowerCase() === code || p.id.toLowerCase() === code)
    );
    if (match && match.stock > 0) {
      addItem(match);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScanHint(`Agregado: ${match.nombre}`);
    } else {
      setSearch(raw.trim());
      setScanHint(`Código detectado: ${raw.trim()}`);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    try {
      const now = new Date();
      const id = `V-${Date.now().toString(36).toUpperCase()}`;
      const sale: RnSale = {
        id,
        orden: `#${Math.floor(1000 + Math.random() * 8999)}`,
        cliente: selectedCustomer || 'Mostrador / Cliente General',
        productoId: cart[0].product.id,
        producto:
          cart.length === 1
            ? cart[0].product.nombre
            : `${cart[0].product.nombre} (+${cart.length - 1})`,
        precio: cart[0].product.precio,
        qty: cart.reduce((s, i) => s + i.qty, 0),
        desc: discount,
        total,
        pago: paymentMethod,
        fecha: now.toISOString().slice(0, 10),
        hora: now.toTimeString().slice(0, 5),
        estado: 'Pagada',
        origen: 'POS',
        notas: notes.trim() || undefined,
      };
      const stockUpdates = cart.map((i) => ({
        id: i.product.id,
        stock: Math.max(0, i.product.stock - i.qty),
      }));
      await commitSale(empresaId, sale, stockUpdates);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const paidCash = paymentMethod === 'Efectivo' && cashReceived > 0 ? cashReceived : undefined;
      setCart([]);
      setNotes('');
      setDiscountInput('');
      setCashInput('');
      setScanHint('');
      setCheckoutOpen(false);
      setReceiptSale({sale, cashReceived: paidCash});
      await onRefresh();
    } catch (err) {
      Alert.alert(
        'Error al registrar venta',
        err instanceof Error ? err.message : 'Verifica tu conexión e intenta nuevamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleShareReceipt = async () => {
    if (!receiptSale) return;
    try {
      await Share.share({
        message: formatReceiptText(receiptSale.sale, empresa, receiptSale.cashReceived),
        title: `Comprobante ${receiptSale.sale.orden}`,
      });
    } catch {
      // user cancelled share sheet
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar producto o SKU..."
          placeholderTextColor="#64748B"
          style={styles.searchInput}
        />
        <Pressable onPress={openScanner} style={styles.scanBtn}>
          <Camera color="#050A14" size={18} />
          <Text style={styles.scanBtnText}>SKU</Text>
        </Pressable>
      </View>

      {!!scanHint && (
        <View style={styles.hintRow}>
          <Text style={styles.hintText}>{scanHint}</Text>
          <Pressable onPress={() => setScanHint('')}>
            <X color="#64748B" size={14} />
          </Pressable>
        </View>
      )}

      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        renderItem={({item}) => (
          <Pressable
            onPress={() => addItem(item)}
            style={({pressed}) => [
              styles.card,
              item.stock <= 0 && styles.cardOut,
              pressed && styles.cardPressed,
            ]}
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
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Finalizar venta · {formatCOP(total)}</Text>
              <Pressable onPress={() => setCheckoutOpen(false)}>
                <X color="#94A3B8" size={20} />
              </Pressable>
            </View>

            <ScrollView style={{maxHeight: 150}} contentContainerStyle={{gap: 8}}>
              {cart.map((item) => (
                <View key={item.product.id} style={styles.cartItem}>
                  <View style={{flex: 1}}>
                    <Text style={styles.cartName} numberOfLines={1}>
                      {item.product.nombre}
                    </Text>
                    <Text style={styles.cartSub}>
                      {formatCOP(item.product.precio * item.qty)}
                    </Text>
                  </View>
                  <View style={styles.qtyBox}>
                    <Pressable
                      onPress={() => adjustCartQty(item.product.id, -1)}
                      style={styles.qtyBtn}
                    >
                      <Minus color="#E2E8F0" size={14} />
                    </Pressable>
                    <Text style={styles.qtyVal}>{item.qty}</Text>
                    <Pressable
                      onPress={() => adjustCartQty(item.product.id, 1)}
                      style={styles.qtyBtn}
                    >
                      <Plus color="#E2E8F0" size={14} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View>
              <Text style={styles.label}>Cliente</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                {[
                  'Mostrador / Cliente General',
                  ...customers.filter((c) => c.estado === 'Activo').map((c) => c.nombre),
                ].map((cName) => (
                  <Pressable
                    key={cName}
                    onPress={() => setSelectedCustomer(cName)}
                    style={[styles.chip, selectedCustomer === cName && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedCustomer === cName && styles.chipTextActive,
                      ]}
                    >
                      {cName}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={{flexDirection: 'row', gap: 10}}>
              <TextInput
                value={discountInput}
                onChangeText={setDiscountInput}
                placeholder="Descuento ($)"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                style={[styles.noteInput, {flex: 1}]}
              />
              {paymentMethod === 'Efectivo' && (
                <TextInput
                  value={cashInput}
                  onChangeText={setCashInput}
                  placeholder="Efectivo recibido"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  style={[styles.noteInput, {flex: 1}]}
                />
              )}
            </View>

            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Nota de entrega / retiro en tienda..."
              placeholderTextColor="#64748B"
              style={styles.noteInput}
            />

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

            <View style={styles.taxSummary}>
              <View style={styles.taxRow}>
                <Text style={styles.taxLabel}>
                  {ivaRate > 0 ? `IVA incluido (${ivaRate}%)` : 'Régimen fiscal'}
                </Text>
                <Text style={[styles.taxVal, ivaRate <= 0 && {color: '#34D399'}]}>
                  {ivaRate > 0
                    ? `Base ${formatCOP(baseGravable)} · IVA ${formatCOP(ivaValor)}`
                    : 'No responsable de IVA (0%)'}
                </Text>
              </View>
              {change > 0 && (
                <View style={styles.taxRow}>
                  <Text style={styles.taxLabel}>Cambio a devolver</Text>
                  <Text style={styles.taxVal}>{formatCOP(change)}</Text>
                </View>
              )}
            </View>

            <View style={styles.sheetActions}>
              <Pressable onPress={() => setCart([])} style={styles.clearBtn}>
                <Trash2 color="#F87171" size={16} />
              </Pressable>
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

      {/* Receipt Modal after Checkout */}
      <Modal visible={!!receiptSale} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <Check color="#34D399" size={20} />
                <Text style={styles.sheetTitle}>
                  Comprobante {receiptSale?.sale.orden}
                </Text>
              </View>
              <Pressable onPress={() => setReceiptSale(null)}>
                <X color="#94A3B8" size={20} />
              </Pressable>
            </View>

            {receiptSale && (
              <View style={styles.receiptBox}>
                <Text style={styles.receiptCompany}>{empresa.nombre}</Text>
                {!!empresa.nit && <Text style={styles.receiptLine}>NIT {empresa.nit}</Text>}
                <Text style={styles.receiptLine}>
                  {receiptSale.sale.fecha} {receiptSale.sale.hora || ''} · {receiptSale.sale.pago}
                </Text>
                <Text style={styles.receiptLine}>Cliente: {receiptSale.sale.cliente}</Text>
                <View style={styles.receiptDivider} />
                <Text style={styles.receiptItem}>
                  {receiptSale.sale.qty}x {receiptSale.sale.producto}
                </Text>
                <View style={styles.receiptDivider} />
                <Text style={styles.receiptLine}>
                  {ivaRate > 0
                    ? `Base ${formatCOP(
                        Math.round(receiptSale.sale.total / (1 + ivaRate / 100))
                      )} · IVA (${ivaRate}%)`
                    : 'Régimen: No responsable de IVA'}
                </Text>
                <Text style={styles.receiptTotal}>
                  TOTAL PAGADO: {formatCOP(receiptSale.sale.total)}
                </Text>
                {receiptSale.cashReceived && receiptSale.cashReceived > receiptSale.sale.total ? (
                  <Text style={[styles.receiptLine, {color: '#34D399'}]}>
                    Cambio: {formatCOP(receiptSale.cashReceived - receiptSale.sale.total)}
                  </Text>
                ) : null}
              </View>
            )}

            <View style={styles.sheetActions}>
              <Pressable onPress={handleShareReceipt} style={styles.shareBtn}>
                <Share2 color="#00C8FF" size={16} />
                <Text style={styles.shareText}>Compartir recibo</Text>
              </Pressable>
              <Pressable onPress={() => setReceiptSale(null)} style={styles.confirmBtn}>
                <Text style={styles.confirmText}>Listo</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={scannerOpen} animationType="slide">
        <View style={{flex: 1, backgroundColor: '#000'}}>
          <CameraView
            style={{flex: 1}}
            onBarcodeScanned={({data}) => handleBarcodeScanned(data)}
          />
          <Pressable onPress={() => setScannerOpen(false)} style={styles.closeCam}>
            <Text style={{color: '#F8FAFC', fontWeight: '700'}}>Cerrar cámara</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#050A14', padding: 14},
  toolbar: {flexDirection: 'row', gap: 10, marginBottom: 10},
  searchInput: {
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
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#00C8FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scanBtnText: {color: '#050A14', fontWeight: '700', fontSize: 13},
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D1E35',
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.28)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  hintText: {color: '#00C8FF', fontSize: 12, fontWeight: '600'},
  listContent: {paddingBottom: 92},
  row: {gap: 10, marginBottom: 10},
  card: {
    flex: 1,
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.14)',
    borderRadius: 16,
    padding: 14,
    minHeight: 112,
    justifyContent: 'space-between',
  },
  cardOut: {opacity: 0.45},
  cardPressed: {opacity: 0.8},
  sku: {fontSize: 11, color: '#94A3B8'},
  name: {fontSize: 14, fontWeight: '600', color: '#F8FAFC', marginVertical: 6},
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00C8FF',
    fontVariant: ['tabular-nums'],
  },
  floatingBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#00C8FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  floatingText: {color: '#050A14', fontSize: 15, fontWeight: '700'},
  floatingTotal: {
    color: '#050A14',
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  modalBackdrop: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,10,20,0.78)'},
  sheet: {
    backgroundColor: '#0B1525',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(0,200,255,0.2)',
    padding: 20,
    gap: 12,
  },
  sheetHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    fontVariant: ['tabular-nums'],
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1E35',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  cartName: {color: '#F8FAFC', fontSize: 13, fontWeight: '600'},
  cartSub: {color: '#00C8FF', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums']},
  qtyBox: {flexDirection: 'row', alignItems: 'center', gap: 8},
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyVal: {color: '#F8FAFC', fontSize: 13, fontWeight: '700', minWidth: 18, textAlign: 'center'},
  label: {color: '#94A3B8', fontSize: 11, fontWeight: '600', marginBottom: 6},
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#0D1E35',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  chipActive: {backgroundColor: 'rgba(0,200,255,0.16)', borderColor: '#00C8FF'},
  chipText: {color: '#94A3B8', fontSize: 12, fontWeight: '600'},
  chipTextActive: {color: '#00C8FF'},
  noteInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#050A14',
    color: '#F8FAFC',
    paddingHorizontal: 12,
    fontSize: 13,
  },
  methodsRow: {flexDirection: 'row', gap: 8},
  methodBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#0D1E35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodActive: {backgroundColor: '#00C8FF', borderColor: '#00C8FF'},
  methodText: {color: '#94A3B8', fontSize: 12, fontWeight: '600'},
  methodTextActive: {color: '#050A14', fontWeight: '700'},
  taxSummary: {
    backgroundColor: '#050A14',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  taxRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  taxLabel: {color: '#94A3B8', fontSize: 11},
  taxVal: {color: '#00C8FF', fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums']},
  sheetActions: {flexDirection: 'row', gap: 10, marginTop: 2},
  clearBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    backgroundColor: '#00C8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {color: '#050A14', fontWeight: '800'},
  shareBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.4)',
    backgroundColor: '#0D1E35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareText: {color: '#00C8FF', fontWeight: '700', fontSize: 14},
  receiptBox: {
    backgroundColor: '#050A14',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    gap: 4,
  },
  receiptCompany: {color: '#F8FAFC', fontSize: 15, fontWeight: '800'},
  receiptLine: {color: '#94A3B8', fontSize: 12},
  receiptItem: {color: '#E2E8F0', fontSize: 13, fontWeight: '600', paddingVertical: 4},
  receiptDivider: {height: 1, backgroundColor: '#1E293B', marginVertical: 4},
  receiptTotal: {
    color: '#00C8FF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
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
});
