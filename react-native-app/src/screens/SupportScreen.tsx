import React, {useState} from 'react';
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
import {Plus, X} from 'lucide-react-native';
import {saveTicket, type RnTicket} from '../services/yabiDb';

interface SupportScreenProps {
  empresaId: string;
  userEmail: string;
  tickets: RnTicket[];
}

export const SupportScreen: React.FC<SupportScreenProps> = ({
  empresaId,
  userEmail,
  tickets,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [prioridad, setPrioridad] = useState<RnTicket['prioridad']>('Media');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!asunto.trim() || !mensaje.trim()) return;
    setSaving(true);
    try {
      await saveTicket({
        id: `TK-${Date.now().toString(36).toUpperCase()}`,
        empresaId,
        asunto: asunto.trim(),
        mensaje: mensaje.trim(),
        prioridad,
        estado: 'Abierto',
        fecha: new Date().toISOString().slice(0, 10),
        creadoPor: userEmail,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAsunto('');
      setMensaje('');
      setPrioridad('Media');
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerSub}>{tickets.length} tickets en tu empresa</Text>
        <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}>
          <Plus color="#050A14" size={16} />
          <Text style={styles.addText}>Nuevo ticket</Text>
        </Pressable>
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        renderItem={({item}) => (
          <View style={styles.card}>
            <View style={styles.rowTop}>
              <Text style={styles.meta}>
                {item.fecha} · Prioridad {item.prioridad}
              </Text>
              <Text style={styles.badge}>{item.estado}</Text>
            </View>
            <Text style={styles.title}>{item.asunto}</Text>
            <Text style={styles.body}>{item.mensaje}</Text>
            {!!item.respuesta && (
              <View style={styles.replyBox}>
                <Text style={styles.replyLabel}>Respuesta soporte:</Text>
                <Text style={styles.replyText}>{item.respuesta}</Text>
              </View>
            )}
          </View>
        )}
      />

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nuevo ticket de soporte</Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <X color="#94A3B8" size={20} />
              </Pressable>
            </View>

            <TextInput
              value={asunto}
              onChangeText={setAsunto}
              placeholder="Asunto"
              placeholderTextColor="#64748B"
              style={styles.input}
            />

            <View style={styles.prioRow}>
              {(['Baja', 'Media', 'Alta'] as const).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPrioridad(p)}
                  style={[styles.prioBtn, prioridad === p && styles.prioActive]}
                >
                  <Text style={[styles.prioText, prioridad === p && styles.prioTextActive]}>
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={mensaje}
              onChangeText={setMensaje}
              placeholder="Describe el caso o solicitud..."
              placeholderTextColor="#64748B"
              multiline
              style={[styles.input, {height: 100, textAlignVertical: 'top', paddingTop: 12}]}
            />

            <Pressable onPress={handleCreate} disabled={saving} style={styles.saveBtn}>
              <Text style={styles.saveText}>{saving ? 'Enviando...' : 'Enviar ticket'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#050A14', padding: 14},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerSub: {color: '#94A3B8', fontSize: 12, fontWeight: '600'},
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00C8FF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addText: {color: '#050A14', fontSize: 12, fontWeight: '800'},
  card: {
    backgroundColor: '#0B1525',
    borderWidth: 1,
    borderColor: 'rgba(0,200,255,0.14)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  rowTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  meta: {color: '#94A3B8', fontSize: 11},
  badge: {
    color: '#00C8FF',
    backgroundColor: 'rgba(0,200,255,0.14)',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  title: {color: '#F8FAFC', fontSize: 15, fontWeight: '700'},
  body: {color: '#CBD5E1', fontSize: 13},
  replyBox: {
    backgroundColor: '#0D1E35',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    gap: 2,
  },
  replyLabel: {color: '#00C8FF', fontSize: 11, fontWeight: '700'},
  replyText: {color: '#E2E8F0', fontSize: 12},
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
  prioRow: {flexDirection: 'row', gap: 8},
  prioBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#050A14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prioActive: {backgroundColor: '#00C8FF', borderColor: '#00C8FF'},
  prioText: {color: '#94A3B8', fontSize: 12, fontWeight: '600'},
  prioTextActive: {color: '#050A14', fontWeight: '700'},
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
