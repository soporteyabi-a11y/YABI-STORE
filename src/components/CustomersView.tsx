import React, {useEffect, useMemo, useState} from 'react';
import {Plus, Search, X} from 'lucide-react';
import type {Customer, Supplier} from '../types/yabi';
import {formatCOP, genId} from '../utils/format';

interface CustomersViewProps {
  defaultSegment?: 'customers' | 'suppliers';
  customers: Customer[];
  suppliers: Supplier[];
  onSaveCustomer: (customer: Customer) => Promise<void>;
  onSaveSupplier: (supplier: Supplier) => Promise<void>;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  defaultSegment = 'customers',
  customers,
  suppliers,
  onSaveCustomer,
  onSaveSupplier,
}) => {
  const [segment, setSegment] = useState<'customers' | 'suppliers'>(defaultSegment);

  useEffect(() => {
    setSegment(defaultSegment);
  }, [defaultSegment]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const [cNombre, setCNombre] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cTel, setCTel] = useState('');
  const [cCiudad, setCCiudad] = useState('Medellín');
  const [cDir, setCDir] = useState('');

  const [sEmpresa, setSEmpresa] = useState('');
  const [sNit, setSNit] = useState('');
  const [sContacto, setSContacto] = useState('');
  const [sTel, setSTel] = useState('');
  const [sCat, setSCat] = useState('Ropa');

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.ciudad.toLowerCase().includes(q) ||
        c.tel.includes(q)
    );
  }, [customers, search]);

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.empresa.toLowerCase().includes(q) ||
        s.nit.includes(q) ||
        s.contacto.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (segment === 'customers') {
      if (!cNombre.trim()) return;
      await onSaveCustomer({
        id: genId('C'),
        nombre: cNombre.trim(),
        email: cEmail.trim() || 'sin-correo@cliente.co',
        tel: cTel.trim() || '—',
        ciudad: cCiudad.trim() || 'Colombia',
        dir: cDir.trim() || '—',
        estado: 'Activo',
      });
      setCNombre('');
      setCEmail('');
      setCTel('');
      setCDir('');
    } else {
      if (!sEmpresa.trim()) return;
      await onSaveSupplier({
        id: genId('PR'),
        empresa: sEmpresa.trim(),
        nit: sNit.trim() || '900.000.000-0',
        contacto: sContacto.trim() || 'Asesor comercial',
        email: 'compras@proveedor.co',
        tel: sTel.trim() || '—',
        cat: sCat,
        plazo: '30 días',
        saldo: 0,
        estado: 'Activo',
      });
      setSEmpresa('');
      setSNit('');
      setSContacto('');
      setSTel('');
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setSegment('customers')}
            className={`min-h-[38px] px-4 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              segment === 'customers'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Clientes ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setSegment('suppliers')}
            className={`min-h-[38px] px-4 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              segment === 'suppliers'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Proveedores ({suppliers.length})
          </button>
        </div>

        <div className="flex items-center gap-2.5 flex-1 sm:max-w-md justify-end">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={segment === 'customers' ? 'Buscar cliente…' : 'Buscar proveedor o NIT…'}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>
      </div>

      {segment === 'customers' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredCustomers.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                No se encontraron clientes.
              </p>
            ) : (
              filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {c.nombre}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {c.ciudad} · {c.dir}
                    </p>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums sm:text-right shrink-0">
                    <p>{c.tel}</p>
                    <p className="text-slate-400 font-sans">{c.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredSuppliers.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                No se encontraron proveedores.
              </p>
            ) : (
              filteredSuppliers.map((s) => (
                <div
                  key={s.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {s.empresa}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-mono">{s.nit}</span> · {s.contacto} · {s.cat}
                    </p>
                  </div>
                  <div className="text-xs font-mono tabular-nums sm:text-right shrink-0">
                    <p className="text-slate-900 dark:text-white font-semibold">
                      Saldo {formatCOP(s.saldo)}
                    </p>
                    <p className="text-slate-400 font-sans">Plazo {s.plazo} · {s.tel}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {segment === 'customers' ? 'Nuevo cliente' : 'Nuevo proveedor'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3 pb-safe">
              {segment === 'customers' ? (
                <>
                  <input
                    required
                    value={cNombre}
                    onChange={(e) => setCNombre(e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                  <input
                    value={cTel}
                    onChange={(e) => setCTel(e.target.value)}
                    placeholder="Teléfono / WhatsApp"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                  <input
                    type="email"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    placeholder="Correo electrónico"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      value={cCiudad}
                      onChange={(e) => setCCiudad(e.target.value)}
                      placeholder="Ciudad"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                    />
                    <input
                      value={cDir}
                      onChange={(e) => setCDir(e.target.value)}
                      placeholder="Dirección"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </>
              ) : (
                <>
                  <input
                    required
                    value={sEmpresa}
                    onChange={(e) => setSEmpresa(e.target.value)}
                    placeholder="Razón social / Empresa"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      value={sNit}
                      onChange={(e) => setSNit(e.target.value)}
                      placeholder="NIT"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white font-mono"
                    />
                    <input
                      value={sCat}
                      onChange={(e) => setSCat(e.target.value)}
                      placeholder="Categoría"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <input
                    value={sContacto}
                    onChange={(e) => setSContacto(e.target.value)}
                    placeholder="Nombre de contacto"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                  <input
                    value={sTel}
                    onChange={(e) => setSTel(e.target.value)}
                    placeholder="Teléfono"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  />
                </>
              )}

              <button
                type="submit"
                className="w-full min-h-[46px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold mt-2"
              >
                Guardar registro
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
