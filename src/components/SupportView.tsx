import React, {useState} from 'react';
import {Headphones, Mail, MessageSquare, Send} from 'lucide-react';
import type {SupportTicket, UserProfile} from '../types/yabi';
import {genId, todayISO} from '../utils/format';

interface SupportViewProps {
  empresaId: string;
  userProfile: UserProfile | null;
  tickets: SupportTicket[];
  onCreateTicket: (ticket: SupportTicket) => Promise<void>;
}

export const SupportView: React.FC<SupportViewProps> = ({
  empresaId,
  userProfile,
  tickets,
  onCreateTicket,
}) => {
  const [asunto, setAsunto] = useState('');
  const [prioridad, setPrioridad] = useState<SupportTicket['prioridad']>('Media');
  const [mensaje, setMensaje] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asunto.trim() || !mensaje.trim()) return;
    setSending(true);
    try {
      await onCreateTicket({
        id: genId('TK'),
        empresaId,
        asunto: asunto.trim(),
        mensaje: mensaje.trim(),
        prioridad,
        estado: 'Abierto',
        fecha: todayISO(),
        creadoPor: userProfile?.email || 'administracion@yabistore.co',
      });
      setAsunto('');
      setMensaje('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-8 max-w-5xl">
      {/* Direct Channels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-[#00E87C] flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Mesa de ayuda WhatsApp
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              +57 300 412 8890 · Lunes a sábado 8:00 a 19:00
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#00C8FF]/10 text-[#00C8FF] flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Correo de soporte técnico
            </p>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
              soporteyabi@gmail.com
            </p>
          </div>
        </div>
      </div>

      {/* New Ticket Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Headphones className="w-4 h-4 text-[#00C8FF]" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Nuevo ticket de soporte
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            required
            value={asunto}
            onChange={(e) => setAsunto(e.target.value)}
            placeholder="Asunto de la solicitud"
            className="sm:col-span-2 h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm text-slate-900 dark:text-white"
          />
          <select
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value as SupportTicket['prioridad'])}
            className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm text-slate-900 dark:text-white"
          >
            <option value="Baja">Prioridad Baja</option>
            <option value="Media">Prioridad Media</option>
            <option value="Alta">Prioridad Alta</option>
          </select>
        </div>

        <textarea
          required
          rows={3}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Describe el caso o requerimiento (ej. migración a Supabase, impresora térmica, inventario)…"
          className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] text-sm text-slate-900 dark:text-white resize-none"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending}
            className="min-h-[44px] px-5 rounded-xl bg-sky-600 dark:bg-[#00C8FF] text-white dark:text-[#050A14] text-sm font-semibold inline-flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Enviando…' : 'Enviar ticket'}
          </button>
        </div>
      </form>

      {/* Tickets History */}
      <div className="rounded-2xl bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-[#0D1E35]">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Historial de tickets ({tickets.length})
          </h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-[#0D1E35]">
          {tickets.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No has enviado tickets de soporte todavía.
            </p>
          ) : (
            tickets.map((t) => (
              <div key={t.id} className="p-4 sm:p-5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {t.asunto}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      {t.id} · {t.fecha} · Prioridad {t.prioridad}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
                      t.estado === 'Resuelto' || t.estado === 'Cerrado'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-[#00E87C]'
                        : t.estado === 'En Proceso'
                        ? 'border-[#00C8FF]/40 bg-[#00C8FF]/10 text-[#00C8FF]'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-500'
                    }`}
                  >
                    {t.estado}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{t.mensaje}</p>
                {t.respuesta && (
                  <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-[#070E1A] border border-slate-200 dark:border-[#0D1E35] text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-sky-600 dark:text-[#00C8FF]">Respuesta: </span>
                    {t.respuesta}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
