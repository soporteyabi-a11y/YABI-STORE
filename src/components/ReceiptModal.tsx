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

  const change = cashReceived && cashReceived > sale.total ? cashReceived - sale.total : 0;

  const handleCopyText = async () => {
    const lines = [
      `${empresa.nombre}`,
      empresa.nit ? `NIT: ${empresa.nit}` : '',
      `Comprobante ${sale.orden} · ${sale.fecha} ${sale.hora || ''}`,
      `Cliente: ${sale.cliente}`,
      `Pago: ${sale.pago}`,
      '----------------------------',
      ...(sale.items && sale.items.length > 0
        ? sale.items.map((it) => `${it.qty}x ${it.nombre} - ${formatCOP(it.precio * it.qty)}`)
        : [`${sale.qty}x ${sale.producto} - ${formatCOP(sale.total)}`]),
      '----------------------------',
      sale.desc > 0 ? `Descuento: -${formatCOP(sale.desc)}` : '',
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Venta registrada
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                Orden {sale.orden} · {sale.origen || 'POS'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar recibo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
            <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-700 pb-3">
              <p className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                {empresa.nombre}
              </p>
              {empresa.nit && (
                <p className="text-slate-500 dark:text-slate-400">NIT {empresa.nit}</p>
              )}
              {empresa.ciudad && (
                <p className="text-slate-500 dark:text-slate-400">{empresa.ciudad}</p>
              )}
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {sale.fecha} {sale.hora ? `· ${sale.hora}` : ''}
              </p>
            </div>

            <div className="space-y-1 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Cliente</span>
                <span className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                  {sale.cliente}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Medio de pago</span>
                <span className="font-medium text-slate-900 dark:text-white">{sale.pago}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-3 space-y-2">
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

            <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-3 space-y-1">
              {sale.desc > 0 && (
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Descuento</span>
                  <span className="tabular-nums">-{formatCOP(sale.desc)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white">
                <span>TOTAL PAGADO</span>
                <span className="tabular-nums">{formatCOP(sale.total)}</span>
              </div>
              {cashReceived && cashReceived > 0 && (
                <>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Efectivo recibido</span>
                    <span className="tabular-nums">{formatCOP(cashReceived)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Cambio</span>
                    <span className="tabular-nums">{formatCOP(change)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-3 pb-safe">
          <button
            onClick={handleCopyText}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <Share2 className="w-4 h-4" />
            Copiar recibo
          </button>
          <button
            onClick={() => window.print()}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};
