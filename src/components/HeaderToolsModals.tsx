import React, {useMemo, useState} from 'react';
import {Camera, Mail, Search, ShoppingCart, X} from 'lucide-react';
import type {EmailLog, Product} from '../types/yabi';
import {formatCOP} from '../utils/format';
import {CameraBarcodeScanner} from './CameraBarcodeScanner';
import {ProductImage} from './ProductImage';

interface ScannerModalProps {
  open: boolean;
  products: Product[];
  onClose: () => void;
  onSelectProductToPos: (product: Product) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  open,
  products,
  onClose,
  onSelectProductToPos,
}) => {
  const [code, setCode] = useState('');

  const matches = useMemo(() => {
    const q = code.trim().toLowerCase();
    if (!q) return products.slice(0, 5);
    return products.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.nombre.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [code, products]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#0D1E35] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#00C8FF]" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Escáner de cámara y SKU
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 pb-safe">
          <CameraBarcodeScanner
            onDetected={(scanned) => {
              setCode(scanned);
              const exact = products.find(
                (p) =>
                  p.sku.toLowerCase() === scanned.toLowerCase() ||
                  p.id.toLowerCase() === scanned.toLowerCase()
              );
              if (exact) {
                onSelectProductToPos(exact);
                onClose();
              }
            }}
          />

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Escanea código de barras o escribe SKU (ej. ROP-001)…"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-[#0D1E35] bg-slate-50 dark:bg-[#070E1A] font-mono text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-[#0D1E35] max-h-64 overflow-y-auto">
            {matches.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">
                No se encontró ningún producto con ese código.
              </p>
            ) : (
              matches.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ProductImage
                      src={p.img}
                      alt={p.nombre}
                      category={p.cat}
                      className="w-10 h-10 rounded-lg shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {p.nombre}
                      </p>
                      <p className="text-xs font-mono text-slate-400">
                        {p.sku} · Stock {p.stock} · {formatCOP(p.precio)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectProductToPos(p);
                      onClose();
                    }}
                    className="min-h-[38px] px-3 rounded-xl bg-sky-600 dark:bg-[#00C8FF] text-white dark:text-[#050A14] text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Ir a POS
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface EmailsModalProps {
  open: boolean;
  emails: EmailLog[];
  onClose: () => void;
}

export const EmailsModal: React.FC<EmailsModalProps> = ({open, emails, onClose}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white dark:bg-[#0B1525] border border-slate-200 dark:border-[#0D1E35] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#0D1E35] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#00C8FF]" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Registro de correos enviados ({emails.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 divide-y divide-slate-100 dark:divide-[#0D1E35] max-h-96 overflow-y-auto pb-safe">
          {emails.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No hay correos enviados recientemente.
            </p>
          ) : (
            emails.map((em) => (
              <div key={em.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {em.asunto}
                  </p>
                  <p className="text-xs font-mono text-slate-400 truncate mt-0.5">
                    Para: {em.para} · {em.fecha}
                  </p>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded border border-[#00C8FF]/40 bg-[#00C8FF]/10 text-[#00C8FF] text-[10px] font-bold uppercase">
                  {em.tipo}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
