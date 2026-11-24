import React from 'react';
import {Check, Printer, Share2, X} from 'lucide-react';
import type {EmpresaConfig, Sale} from '../types/yabi';
import {formatCOP} from '../utils/format';

interface ReceiptModalProps {
  sale: Sale | null;
  empresa: EmpresaConfig;
  cashReceived?: number;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  empresa,
  cashReceived,
  onClose,
  onNotify,
}) => {
  if (!sale) return null;

  const ivaPct = Number(empresa.iva ?? 0);
  const baseGravable = ivaPct > 0 ? Math.round(sale.total / (1 + ivaPct / 100)) : sale.total;
  const ivaValor = ivaPct > 0 ? Math.max(0, sale.total - baseGravable) : 0;
  const change = cashReceived && cashReceived > sale.total ? cashReceived - sale.total : 0;

  const handleCopyText = async () => {
    const lines = [
      `${empresa.nombre}`,
      empresa.nit ? `NIT: ${empresa.nit}` : '',
      empresa.direccion ? `Dir: ${empresa.direccion}` : '',
      empresa.ciudad ? empresa.ciudad : '',
      empresa.telefono ? `Tel: ${empresa.telefono}` : '',
      `Comprobante ${sale.orden} · ${sale.fecha} ${sale.hora || ''}`,
      `Canal: ${sale.origen || 'POS'}`,
      `Cliente: ${sale.cliente}`,
      `Pago: ${sale.pago} (${sale.estado})`,
      sale.notas ? `Entrega: ${sale.notas}` : '',
      sale.transportadora ? `Envío: ${sale.transportadora}${sale.guia ? ` · Guía ${sale.guia}` : ''}` : '',
      '----------------------------',
      ...(sale.items && sale.items.length > 0
        ? sale.items.map((it) => `${it.qty}x ${it.nombre} - ${formatCOP(it.precio * it.qty)}`)
        : [`${sale.qty}x ${sale.producto} - ${formatCOP(sale.total)}`]),
      '----------------------------',
      sale.desc > 0 ? `Descuento: -${formatCOP(sale.desc)}` : '',
      ...(ivaPct > 0
        ? [`Base gravable: ${formatCOP(baseGravable)}`, `IVA (${ivaPct}%): ${formatCOP(ivaValor)}`]
        : ['Régimen: No responsable de IVA']),
      `TOTAL: ${formatCOP(sale.total)}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(lines);
      onNotify('Recibo copiado para compartir por WhatsApp');
    } catch {
      onNotify('Recibo listo para imprimir');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#0D1E35]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-[#00E87C] flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Comprobante {sale.orden}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {sale.origen || 'POS'} · {sale.estado}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-[#070E1A] transition-colors"
            aria-label="Cerrar recibo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="bg-slate-50 dark:bg-[#070E1A] border border-slate-200 dark:border-[#0D1E35] rounded-xl p-4 space-y-3 font-mono text-xs">
            <div className="text-center border-b border-dashed border-slate-300 dark:border-[#0D1E35] pb-3">
              <p className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                {empresa.nombre}
              </p>
              {empresa.nit && (
                <p className="text-slate-500 dark:text-slate-400">NIT {empresa.nit}</p>
              )}
              {empresa.direccion && (
                <p className="text-slate-500 dark:text-slate-400">{empresa.direccion}</p>
              )}
              {empresa.ciudad && (
                <p className="text-slate-500 dark:text-slate-400">{empresa.ciudad}</p>
              )}
              {empresa.telefono && (
                <p className="text-slate-500 dark:text-slate-400">Tel {empresa.telefono}</p>
              )}
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {sale.fecha} {sale.hora ? `· ${sale.hora}` : ''}
              </p>
            </div>

            <div className="space-y-1 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between gap-2">
                <span>Cliente</span>
                <span className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                  {sale.cliente}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Medio de pago</span>
                <span className="font-medium text-slate-900 dark:text-white">{sale.pago}</span>
              </div>
              {sale.notas && (
                <div className="flex justify-between gap-2">
                  <span>Entrega</span>
                  <span className="font-medium text-sky-600 dark:text-[#00C8FF] text-right max-w-[210px]">
                    {sale.notas}
                  </span>
                </div>
              )}
              {(sale.transportadora || sale.guia) && (
                <div className="flex justify-between gap-2">
                  <span>Guía envío</span>
                  <span className="font-medium text-slate-900 dark:text-white text-right">
                    {sale.transportadora || ''} {sale.guia ? `· ${sale.guia}` : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-slate-300 dark:border-[#0D1E35] pt-3 space-y-2">
              {sale.items && sale.items.length > 0 ? (
                sale.items.map((item, idx) => (
                  <div key={`${item.productoId}-${idx}`} className="flex justify-between gap-2">
                    <span className="text-slate-700 dark:text-slate-200">
                      {item.qty}x {item.nombre}
                    </span>
                    <span className="tabular-nums font-medium text-slate-900 dark:text-white shrink-0">
                      {formatCOP(item.precio * item.qty)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between gap-2">
                  <span className="text-slate-700 dark:text-slate-200">
                    {sale.qty}x {sale.producto}
                  </span>
                  <span className="tabular-nums font-medium text-slate-900 dark:text-white shrink-0">
                    {formatCOP(sale.total)}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-slate-300 dark:border-[#0D1E35] pt-3 space-y-1">
              {sale.desc > 0 && (
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Descuento</span>
                  <span className="tabular-nums">-{formatCOP(sale.desc)}</span>
                </div>
              )}
              {ivaPct > 0 ? (
                <>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Base gravable</span>
                    <span className="tabular-nums">{formatCOP(baseGravable)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>IVA ({ivaPct}%)</span>
                    <span className="tabular-nums">{formatCOP(ivaValor)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Régimen fiscal</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    No responsable de IVA
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-1">
                <span>TOTAL PAGADO</span>
                <span className="tabular-nums">{formatCOP(sale.total)}</span>
              </div>
              {cashReceived && cashReceived > 0 && (
                <>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Efectivo recibido</span>
                    <span className="tabular-nums">{formatCOP(cashReceived)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-[#00E87C] font-semibold">
                    <span>Cambio</span>
                    <span className="tabular-nums">{formatCOP(change)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-[#0D1E35] grid grid-cols-2 gap-3 pb-safe">
          <button
            type="button"
            onClick={handleCopyText}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#0D1E35] text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#070E1A] flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <Share2 className="w-4 h-4" />
            Copiar recibo
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-sky-600 dark:bg-[#00C8FF] text-white dark:text-[#050A14] text-sm font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};
