import React, {useState} from 'react';
import {Eye, EyeOff, Image as ImageIcon, Plus, Trash2, Upload} from 'lucide-react';
import {uploadImageToFirebaseStorage} from '../services/yabiDb';
import type {StoreBanner} from '../types/yabi';
import {genId} from '../utils/format';

interface BannersViewProps {
  empresaId: string;
  isCloudConnected: boolean;
  banners: StoreBanner[];
  onSaveBanner: (banner: StoreBanner) => Promise<void>;
  onDeleteBanner: (bannerId: string) => Promise<void>;
  onNotify: (msg: string, tone?: 'success' | 'info' | 'error') => void;
}

export const BannersView: React.FC<BannersViewProps> = ({
  empresaId,
  isCloudConnected,
  banners,
  onSaveBanner,
  onDeleteBanner,
  onNotify,
}) => {
  const [titulo, setTitulo] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [cta, setCta] = useState('Explorar catálogo');
  const [img, setImg] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      if (isCloudConnected) {
        const url = await uploadImageToFirebaseStorage(empresaId, 'banners', file);
        setImg(url);
        onNotify('Banner subido a Firebase Storage', 'success');
      } else {
        const reader = new FileReader();
        reader.onload = () => setImg(String(reader.result || ''));
        reader.readAsDataURL(file);
      }
    } catch {
      onNotify('Error al subir imagen a Storage', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    await onSaveBanner({
      id: genId('B'),
      titulo: titulo.trim(),
      subtitulo: subtitulo.trim() || 'Promoción destacada en tienda online',
      cta: cta.trim() || 'Ver colección',
      img: img || '/src/assets/images/product_running_sneakers_1795380206507.jpg',
      estado: 'Activo',
    });
    setTitulo('');
    setSubtitulo('');
    setImg('');
  };

  const toggleBannerStatus = async (banner: StoreBanner) => {
    await onSaveBanner({
      ...banner,
      estado: banner.estado === 'Activo' ? 'Inactivo' : 'Activo',
    });
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-8 max-w-5xl">
      {/* Create Banner Form */}
      <form
        onSubmit={handleCreate}
        className="rounded-2xl bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] p-5 space-y-4"
      >
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Publicidad Activa y Banners de Tienda
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Los banners activos se muestran en la cabecera de tu Tienda Online y se almacenan en{' '}
            <span className="font-mono">empresas/{empresaId}/banners</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título principal del banner"
            className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50/65 dark:bg-[#070E1A]/50 text-sm text-slate-900 dark:text-white"
          />
          <input
            value={subtitulo}
            onChange={(e) => setSubtitulo(e.target.value)}
            placeholder="Subtítulo o descuento"
            className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50/65 dark:bg-[#070E1A]/50 text-sm text-slate-900 dark:text-white"
          />
          <input
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            placeholder="Texto del botón"
            className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50/65 dark:bg-[#070E1A]/50 text-sm text-slate-900 dark:text-white"
          />
          <div className="flex gap-2">
            <label className="flex-1 min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50/65 dark:bg-[#070E1A]/50 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-4 h-4 text-[#00C8FF]" />
              <span>{uploading ? 'Subiendo…' : img ? 'Lista' : 'Imagen'}</span>
              <input type="file" accept="image/*" onChange={handleUploadFile} className="hidden" />
            </label>
            <button
              type="submit"
              disabled={uploading}
              className="min-h-[44px] px-4 rounded-xl bg-sky-600 dark:bg-[#00C8FF] text-white dark:text-[#050A14] text-sm font-semibold flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Publicar
            </button>
          </div>
        </div>
      </form>

      {/* Banners List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {banners.length === 0 ? (
          <div className="md:col-span-2 rounded-2xl bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] py-12 text-center">
            <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No hay banners configurados para tu tienda.
            </p>
          </div>
        ) : (
          banners.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl bg-white/65 dark:bg-[#0B1525]/45 border border-slate-200/80 dark:border-[#0D1E35] overflow-hidden flex flex-col"
            >
              <div className="relative h-40 bg-slate-100 dark:bg-[#070E1A]">
                <img
                  src={b.img}
                  alt={b.titulo}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <p className="text-sm font-bold text-white truncate">{b.titulo}</p>
                  <p className="text-xs text-slate-200 truncate">{b.subtitulo}</p>
                </div>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span
                  className={`text-xs font-semibold ${
                    b.estado === 'Activo'
                      ? 'text-emerald-600 dark:text-[#00E87C]'
                      : 'text-slate-400'
                  }`}
                >
                  {b.estado === 'Activo' ? 'Visible en Tienda' : 'Oculto'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleBannerStatus(b)}
                    className="min-h-[36px] px-3 rounded-lg border border-slate-200 dark:border-[#0D1E35] text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5"
                  >
                    {b.estado === 'Activo' ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-[#00C8FF]" />
                        Activar
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteBanner(b.id)}
                    aria-label="Eliminar banner"
                    className="min-h-[36px] min-w-[36px] rounded-lg border border-slate-200 dark:border-[#0D1E35] text-slate-400 hover:text-rose-500 inline-flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
