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
import {Edit3, Plus, X} from 'lucide-react-native';
import {
  saveCustomer,
  saveSupplier,
  type RnCustomer,
  type RnSupplier,
} from '../services/yabiDb';

interface CustomersScreenProps {
  empresaId: string;
  customers: RnCustomer[];
  suppliers: RnSupplier[];
}

export const CustomersScreen: React.FC<CustomersScreenProps> = ({
  empresaId,
  customers,
  suppliers,
}) => {
  const [mode, setMode] = useState<'customers' | 'suppliers'>('customers');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cityOrNit, setCityOrNit] = useState('');
  const [addressOrContact, setAddressOrContact] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter(
      (c) =>
        !q ||
        c.nombre.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.ciudad.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter(
      (s) =>
        !q ||
        s.empresa.toLowerCase().includes(q) ||
        s.contacto.toLowerCase().includes(q) ||
        s.nit.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setPhone('');
    setCityOrNit('');
    setAddressOrContact('');
    setModalOpen(true);
  };

  const openEditCustomer = (c: RnCustomer) => {
    setEditingId(c.id);
    setName(c.nombre);
    setEmail(c.email);
    setPhone(c.tel);
    setCityOrNit(c.ciudad);
    setAddressOrContact(c.dir);
    setModalOpen(true);
  };

  const openEditSupplier = (s: RnSupplier) => {
    setEditingId(s.id);
    setName(s.empresa);
    setEmail(s.email);
    setPhone(s.tel);
    setCityOrNit(s.nit);
    setAddressOrContact(s.contacto);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (mode === 'customers') {
        await saveCustomer(empresaId, {
          id: editingId || `CL-${Date.now().toString(36).toUpperCase()}`,
          nombre: name.trim(),
          email: email.trim(),
          tel: phone.trim(),
          ciudad: cityOrNit.trim() || 'Cali',
          dir: addressOrContact.trim(),
          estado: 'Activo',
        });
      } else {
        await saveSupplier(empresaId, {
          id: editingId || `PR-${Date.now().toString(36).toUpperCase()}`,
          empresa: name.trim(),
          nit: cityOrNit.trim() || 'N/A',
          contacto: addressOrContact.trim() || name.trim(),
          email: email.trim(),
          tel: phone.trim(),
          cat: 'General',
          plazo: 'Contado',
          saldo: 0,
          estado: 'Activo',
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.segment}>
        <Pressable
          onPress={() => setMode('customers')}
          style={[styles.segBtn, mode === 'customers' && styles.segActive]}
        >
          <Text style={[styles.segText, mode === 'customers' && styles.segTextActive]}>
            Clientes ({customers.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('suppliers')}
          style={[styles.segBtn, mode === 'suppliers' && styles.segActive]}
        >
          <Text style={[styles.segText, mode === 'suppliers' && styles.segTextActive]}>
            Proveedores ({suppliers.length})
          </Text>
        </Pressable>
      </View>

      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={mode === 'customers' ? 'Buscar cliente...' : 'Buscar proveedor o NIT...'}
          placeholderTextColor="#64748B"
          style={styles.search}
        />
        <Pressable onPress={openCreate} style={styles.addBtn}>
          <Plus color="#050A14" size={18} />
        </Pressable>
      </View>

      {mode === 'customers' ? (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          renderItem={({item}) => (
            <Pressable onPress={() => openEditCustomer(item)} style={styles.card}>
              <View style={{flex: 1}}>
                <Text style={styles.title}>{item.nombre}</Text>
                <Text style={styles.sub}>
                  {item.tel || 'Sin tel'} · {item.ciudad}
                </Text>
                {!!item.email && <Text style={styles.meta}>{item.email}</Text>}
              </View>
              <Edit3 color="#00C8FF" size={16} />
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={filteredSuppliers}
          keyExtractor={(item) => item.id}
          renderItem={({item}) => (
            <Pressable onPress={() => openEditSupplier(item)} style={styles.card}>
              <View style={{flex: 1}}>
                <Text style={styles.title}>{item.empresa}</Text>
                <Text style={styles.sub}>
                  NIT {item.nit} · {item.contacto}
                </Text>
                <Text style={styles.meta}>
                  {item.tel} · {item.plazo}
                </Text>
              </View>
              <Edit3 color="#00C8FF" size={16} />
            </Pressable>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {editingId ? 'Editar' : 'Nuevo'}{' '}
                {mode === 'customers' ? 'cliente' : 'proveedor'}
              </Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <X color="#94A3B8" size={20} />
              </Pressable>
            </View>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={mode === 'customers' ? 'Nombre completo' : 'Razón social'}
              placeholderTextColor="#64748B"
              style={styles.input}
            />
            <TextInput
              value={cityOrNit}
              onChangeText={setCityOrNit}
              placeholder={mode === 'customers' ? 'Ciudad' : 'NIT'}
              placeholderTextColor="#64748B"
              style={styles.input}
            />
            <TextInput
              value={addressOrContact}
              onChangeText={setAddressOrContact}
              placeholder={mode === 'customers' ? 'Dirección' : 'Persona de contacto'}
              placeholderTextColor="#64748B"
              style={styles.input}
            />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Teléfono / WhatsApp"
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Correo electrónico"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />

            <Pressable onPress={handleSave} disabled={saving} style={styles.saveBtn}>
              <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#050A14', padding: 14},
  segment: {
    flexDirection: 'row',
    backgroundColor: '#0B1525',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 4,
    marginBottom: 12,
  },
  segBtn: {flex: 1, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center'},
  segActive: {backgroundColor: '#00C8FF'},
  segText: {color: '#94A3B8', fontSize: 12, fontWeight: '600'},
  segTextActive: {color: '#050A14', fontWeight: '700'},
  toolbar: {flexDirection: 'row', gap: 10, marginBottom: 12},
  search: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#0B1525',
    color: '#F8FAFC',
    paddingHorizontal: 14,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#00C8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.14)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  title: {color: '#F8FAFC', fontSize: 15, fontWeight: '600'},
  sub: {color: '#94A3B8', fontSize: 12, marginTop: 2},
  meta: {color: '#00C8FF', fontSize: 11, marginTop: 2},
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
