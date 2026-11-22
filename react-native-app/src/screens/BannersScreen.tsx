import React, {useState} from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {Plus, Trash2, X} from 'lucide-react-native';
import {deleteBanner, saveBanner, type RnBanner} from '../services/yabiDb';

interface BannersScreenProps {
  empresaId: string;
  banners: RnBanner[];
}

export const BannersScreen: React.FC<BannersScreenProps> = ({empresaId, banners}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [img, setImg] = useState('');
  const [cta, setCta] = useState('Ver catálogo');
  const [saving, setSaving] = useState(false);

  const handleToggle = async (banner: RnBanner) => {
    const nextEstado = banner.estado === 'Activo' ? 'Inactivo' : 'Activo';
    await saveBanner(empresaId, {...banner, estado: nextEstado});
    Haptics.selectionAsync();
  };

  const handleDelete = async (id: string) => {
    await deleteBanner(empresaId, id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleCreate = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      await saveBanner(empresaId, {
        id: `BN-${Date.now().toString(36).toUpperCase()}`,
        titulo: titulo.trim(),
        subtitulo: subtitulo.trim() || 'Promoción activa en tienda online',
        img: img.trim(),
        cta: cta.trim() || 'Ver ofertas',
        estado: 'Activo',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTitulo('');
      setSubtitulo('');
      setImg('');
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerSub}>{banners.length} banners en tienda en línea</Text>
        <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}>
          <Plus color="#050A14" size={16} />
          <Text style={styles.addText}>Nuevo</Text>
        </Pressable>
      </View>

      <FlatList
        data={banners}
        keyExtractor={(item) => item.id}
        renderItem={({item}) => (
          <View style={styles.card}>
            {item.img.startsWith('http') && (
              <Image source={{uri: item.img}} style={styles.preview} resizeMode="cover" />
            )}
            <Text style={styles.title}>{item.titulo}</Text>
            <Text style={styles.sub}>{item.subtitulo}</Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => handleToggle(item)}
                style={[
                  styles.stateBtn,
                  item.estado === 'Activo' ? styles.stateActive : styles.stateInactive,
                ]}
              >
                <Text
                  style={[
                    styles.stateText,
                    item.estado === 'Activo' ? styles.stateTextActive : styles.stateTextInactive,
                  ]}
                >
                  {item.estado}
                </Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(item.id)} style={styles.delBtn}>
                <Trash2 color="#F87171" size={16} />
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nuevo banner promocional</Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <X color="#94A3B8" size={20} />
              </Pressable>
            </View>
            <TextInput
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Título principal"
              placeholderTextColor="#64748B"
              style={styles.input}
            />
            <TextInput
              value={subtitulo}
              onChangeText={setSubtitulo}
              placeholder="Subtítulo o descuento"
              placeholderTextColor="#64748B"
              style={styles.input}
            />
            <TextInput
              value={img}
              onChangeText={setImg}
              placeholder="URL de imagen (https://...)"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              value={cta}
              onChangeText={setCta}
              placeholder="Texto del botón (CTA)"
              placeholderTextColor="#64748B"
              style={styles.input}
            />
            <Pressable onPress={handleCreate} disabled={saving} style={styles.saveBtn}>
              <Text style={styles.saveText}>{saving ? 'Publicando...' : 'Publicar banner'}</Text>
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
  preview: {width: '100%', height: 110, borderRadius: 10, marginBottom: 4},
  title: {color: '#F8FAFC', fontSize: 15, fontWeight: '700'},
  sub: {color: '#94A3B8', fontSize: 12},
  actions: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4},
  stateBtn: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1},
  stateActive: {backgroundColor: 'rgba(16,185,129,0.14)', borderColor: 'rgba(16,185,129,0.4)'},
  stateInactive: {backgroundColor: '#0D1E35', borderColor: '#334155'},
  stateText: {fontSize: 12, fontWeight: '700'},
  stateTextActive: {color: '#34D399'},
  stateTextInactive: {color: '#94A3B8'},
  delBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
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
