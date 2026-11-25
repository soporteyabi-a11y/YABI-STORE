import React, {useEffect, useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {Building2, Check} from 'lucide-react-native';
import {saveEmpresaConfig, type RnEmpresa} from '../services/yabiDb';

interface CompanySettingsScreenProps {
  empresa: RnEmpresa;
  onSaved: (updated: RnEmpresa) => void;
}

export const CompanySettingsScreen: React.FC<CompanySettingsScreenProps> = ({
  empresa,
  onSaved,
}) => {
  const [nombre, setNombre] = useState(empresa.nombre);
  const [nit, setNit] = useState(empresa.nit || '');
  const [direccion, setDireccion] = useState(empresa.direccion || '');
  const [ciudad, setCiudad] = useState(empresa.ciudad || '');
  const [telefono, setTelefono] = useState(empresa.telefono || '');
  const [responsableIva, setResponsableIva] = useState(Number(empresa.iva ?? 0) > 0);
  const [ivaPct, setIvaPct] = useState(
    Number(empresa.iva ?? 0) > 0 ? String(empresa.iva) : '19'
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNombre(empresa.nombre);
    setNit(empresa.nit || '');
    setDireccion(empresa.direccion || '');
    setCiudad(empresa.ciudad || '');
    setTelefono(empresa.telefono || '');
    const isResp = Number(empresa.iva ?? 0) > 0;
    setResponsableIva(isResp);
    if (isResp) setIvaPct(String(empresa.iva));
  }, [empresa]);

  const handleSave = async () => {
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el nombre comercial de la tienda.');
      return;
    }
    const numericIva = responsableIva ? Math.max(1, Math.min(30, Number(ivaPct) || 19)) : 0;
    const next: RnEmpresa = {
      ...empresa,
      nombre: nombre.trim(),
      nit: nit.trim() || undefined,
      direccion: direccion.trim() || undefined,
      ciudad: ciudad.trim() || undefined,
      telefono: telefono.trim() || undefined,
      iva: numericIva,
    };

    setSaving(true);
    try {
      await saveEmpresaConfig(next);
      onSaved(next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Configuración guardada',
        numericIva === 0
          ? 'Régimen actualizado a No responsable de IVA (0%).'
          : `Régimen actualizado a Responsable de IVA (${numericIva}%).`
      );
    } catch (err) {
      Alert.alert(
        'Error al guardar',
        err instanceof Error ? err.message : 'No fue posible actualizar los datos fiscales.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Building2 color="#00C8FF" size={22} />
        <View style={{flex: 1}}>
          <Text style={styles.headerTitle}>Datos fiscales y empresa</Text>
          <Text style={styles.headerSub}>Empresa {empresa.id} · Sincronizado con Supabase</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Nombre comercial</Text>
        <TextInput
          value={nombre}
          onChangeText={setNombre}
          placeholder="DIGITAL YA'BI"
          placeholderTextColor="#64748B"
          style={styles.input}
        />

        <Text style={styles.label}>NIT</Text>
        <TextInput
          value={nit}
          onChangeText={setNit}
          placeholder="87942146-5"
          placeholderTextColor="#64748B"
          style={styles.input}
        />

        <Text style={styles.label}>Dirección</Text>
        <TextInput
          value={direccion}
          onChangeText={setDireccion}
          placeholder="Cra. 5 # 12-34"
          placeholderTextColor="#64748B"
          style={styles.input}
        />

        <Text style={styles.label}>Ciudad</Text>
        <TextInput
          value={ciudad}
          onChangeText={setCiudad}
          placeholder="Cali - Valle del Cauca"
          placeholderTextColor="#64748B"
          style={styles.input}
        />

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          value={telefono}
          onChangeText={setTelefono}
          placeholder="+57 3168626565"
          placeholderTextColor="#64748B"
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Régimen fiscal (IVA)</Text>
        <View style={styles.segment}>
          <Pressable
            onPress={() => setResponsableIva(false)}
            style={[styles.segBtn, !responsableIva && styles.segActive]}
          >
            <Text style={[styles.segText, !responsableIva && styles.segTextActive]}>
              No responsable de IVA (0%)
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setResponsableIva(true)}
            style={[styles.segBtn, responsableIva && styles.segActive]}
          >
            <Text style={[styles.segText, responsableIva && styles.segTextActive]}>
              Responsable de IVA
            </Text>
          </Pressable>
        </View>

        {responsableIva && (
          <View>
            <Text style={styles.label}>Tarifa IVA (%)</Text>
            <TextInput
              value={ivaPct}
              onChangeText={setIvaPct}
              keyboardType="numeric"
              placeholder="19"
              placeholderTextColor="#64748B"
              style={styles.input}
            />
          </View>
        )}

        <Pressable onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          <Check color="#050A14" size={18} />
          <Text style={styles.saveText}>
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#050A14'},
  content: {padding: 14, gap: 12, paddingBottom: 32},
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.2)',
    borderRadius: 16,
    padding: 14,
  },
  headerTitle: {color: '#F8FAFC', fontSize: 16, fontWeight: '700'},
  headerSub: {color: '#94A3B8', fontSize: 12, marginTop: 2},
  card: {
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.14)',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  label: {color: '#94A3B8', fontSize: 12, fontWeight: '600', marginTop: 2},
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#050A14',
    color: '#F8FAFC',
    paddingHorizontal: 14,
    fontSize: 14,
  },
  segment: {flexDirection: 'row', gap: 8},
  segBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#050A14',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segActive: {backgroundColor: '#00C8FF', borderColor: '#00C8FF'},
  segText: {color: '#94A3B8', fontSize: 12, fontWeight: '600', textAlign: 'center'},
  segTextActive: {color: '#050A14', fontWeight: '800'},
  saveBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#00C8FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveText: {color: '#050A14', fontWeight: '800', fontSize: 15},
});
