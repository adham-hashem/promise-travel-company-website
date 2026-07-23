import { useEffect, useState } from 'react';
import {
  Plus, X, Loader2, Hash, Phone, Mail, MapPin, FileText,
  Search, Filter, Building2, Plane, Bus, Compass,
  Wallet,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Supplier, SupplierPayment, SupplierType } from '../types';

const supplierTypes: { value: SupplierType; label: string; icon: React.ElementType }[] = [
  { value: 'فنادق', label: 'فنادق', icon: Building2 },
  { value: 'طيران', label: 'طيران', icon: Plane },
  { value: 'نقل', label: 'نقل', icon: Bus },
  { value: 'مرشدين', label: 'مرشدين', icon: Compass },
  { value: 'أخرى', label: 'أخرى', icon: FileText },
];

const typeColors: Record<SupplierType, string> = {
  فنادق: 'bg-blue-100 text-blue-700',
  طيران: 'bg-cyan-100 text-cyan-700',
  نقل: 'bg-amber-100 text-amber-700',
  مرشدين: 'bg-emerald-100 text-emerald-700',
  أخرى: 'bg-gray-100 text-gray-600',
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState({
    name: '', type: 'فنادق' as SupplierType, phone: '', email: '',
    address: '', contract_ref: '', notes: '', status: 'نشط',
  });
  const [saving, setSaving] = useState(false);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'كاش', notes: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
    setSuppliers((data as Supplier[]) || []);
    setLoading(false);
  };

  const filtered = suppliers.filter((s) => {
    if (filterType && s.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.name.toLowerCase().includes(q) && !(s.supplier_code || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const createSupplier = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from('suppliers')
      .insert({
        name: form.name, type: form.type, phone: form.phone || null,
        email: form.email || null, address: form.address || null,
        contract_ref: form.contract_ref || null, notes: form.notes || null,
        status: form.status,
      })
      .select('*')
      .single();
    if (data) setSuppliers([data as Supplier, ...suppliers]);
    setForm({ name: '', type: 'فنادق', phone: '', email: '', address: '', contract_ref: '', notes: '', status: 'نشط' });
    setShowForm(false);
    setSaving(false);
  };

  const openSupplier = async (s: Supplier) => {
    setSelected(s);
    const { data } = await supabase.from('supplier_payments').select('*').eq('supplier_id', s.id).order('payment_date', { ascending: false });
    setPayments((data as SupplierPayment[]) || []);
  };

  const addPayment = async () => {
    if (!selected || !payForm.amount) return;
    const { data } = await supabase
      .from('supplier_payments')
      .insert({
        supplier_id: selected.id,
        amount: parseFloat(payForm.amount),
        payment_method: payForm.payment_method,
        notes: payForm.notes || null,
      })
      .select('*')
      .single();
    if (data) setPayments([data as SupplierPayment, ...payments]);
    setPayForm({ amount: '', payment_method: 'كاش', notes: '' });
    setShowPayForm(false);
  };

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">إدارة الموردين</h2>
          <p className="section-subtitle">الفنادق، الطيران، النقل، والمرشدين</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold">
          <Plus size={16} /> مورد جديد
        </button>
      </div>

      {/* Type stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {supplierTypes.map((t) => {
          const Icon = t.icon;
          const count = suppliers.filter((s) => s.type === t.value).length;
          return (
            <button
              key={t.value}
              onClick={() => setFilterType(filterType === t.value ? '' : t.value)}
              className={`stat-card text-left transition-all ${filterType === t.value ? 'ring-2 ring-gold-400' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl ${typeColors[t.value]} flex items-center justify-center mb-2`}>
                <Icon size={20} />
              </div>
              <p className="text-2xl font-black text-navy-900">{count}</p>
              <p className="text-xs text-gray-500">{t.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو كود المورد..." className="form-input pr-9" />
        </div>
        {filterType && (
          <button onClick={() => setFilterType('')} className="btn-outline text-xs">
            <Filter size={14} /> {filterType} <X size={12} />
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy-800">إضافة مورد جديد</h3>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">الاسم <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" placeholder="اسم المورد" />
            </div>
            <div>
              <label className="form-label">النوع</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SupplierType })} className="form-input">
                {supplierTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">الهاتف</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="form-input" dir="ltr" placeholder="01xxxxxxxxx" />
            </div>
            <div>
              <label className="form-label">البريد الإلكتروني</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="form-input" dir="ltr" placeholder="email@example.com" />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">العنوان</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="form-input" placeholder="العنوان" />
            </div>
            <div>
              <label className="form-label">رقع التعاقد</label>
              <input value={form.contract_ref} onChange={(e) => setForm({ ...form, contract_ref: e.target.value })} className="form-input" dir="ltr" placeholder="CT-2026-001" />
            </div>
            <div>
              <label className="form-label">الحالة</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="form-input">
                <option value="نشط">نشط</option>
                <option value="غير نشط">غير نشط</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="form-label">ملاحظات</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="form-input resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-outline text-xs py-2 px-4">إلغاء</button>
            <button onClick={createSupplier} disabled={!form.name.trim() || saving} className="btn-gold text-xs py-2 px-4">{saving ? 'جارٍ الحفظ...' : 'حفظ'}</button>
          </div>
        </div>
      )}

      {/* Suppliers grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-navy-700" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16 text-gray-400">
          <Building2 size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">لا يوجد موردين</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const TypeIcon = supplierTypes.find((t) => t.value === s.type)?.icon || FileText;
            return (
              <button
                key={s.id}
                onClick={() => openSupplier(s)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-right hover:shadow-md hover:border-gold-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl ${typeColors[s.type]} flex items-center justify-center`}>
                    <TypeIcon size={22} />
                  </div>
                  {s.supplier_code && (
                    <span className="font-mono text-xs font-bold text-gold-600 bg-gold-50 px-2 py-1 rounded-md flex items-center gap-1">
                      <Hash size={10} />{s.supplier_code}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-navy-900 text-sm mb-1">{s.name}</h3>
                <span className={`badge text-[10px] ${typeColors[s.type]}`}>{s.type}</span>
                <div className="mt-3 space-y-1.5">
                  {s.phone && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone size={11} /><span dir="ltr">{s.phone}</span></p>}
                  {s.email && <p className="text-xs text-gray-500 flex items-center gap-1.5 truncate"><Mail size={11} /><span dir="ltr" className="truncate">{s.email}</span></p>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Supplier detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-navy p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${typeColors[selected.type]} flex items-center justify-center`}>
                    {(() => { const Icon = supplierTypes.find((t) => t.value === selected.type)?.icon || FileText; return <Icon size={22} />; })()}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{selected.name}</h3>
                    {selected.supplier_code && <p className="text-gold-300 font-mono text-sm">{selected.supplier_code}</p>}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-white/10"><X size={18} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {selected.phone && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400">الهاتف</p><p className="text-sm font-semibold" dir="ltr">{selected.phone}</p></div>}
                {selected.email && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400">البريد</p><p className="text-sm font-semibold truncate" dir="ltr">{selected.email}</p></div>}
                {selected.address && <div className="bg-gray-50 rounded-xl p-3 col-span-2"><p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={11} />العنوان</p><p className="text-sm font-semibold">{selected.address}</p></div>}
                {selected.contract_ref && <div className="bg-gray-50 rounded-xl p-3 col-span-2"><p className="text-xs text-gray-400 flex items-center gap-1"><FileText size={11} />التعاقد</p><p className="text-sm font-semibold" dir="ltr">{selected.contract_ref}</p></div>}
              </div>
              {selected.notes && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-400 mb-1">ملاحظات</p><p className="text-sm text-gray-700">{selected.notes}</p></div>}

              {/* Payments */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-navy-800 flex items-center gap-2"><Wallet size={15} className="text-gold-500" />المدفوعات</h4>
                  <button onClick={() => setShowPayForm(!showPayForm)} className="btn-gold text-xs py-1.5 px-3"><Plus size={12} />دفعة</button>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 mb-3 flex items-center justify-between">
                  <span className="text-xs text-emerald-600">إجمالي المدفوع للمورد</span>
                  <span className="font-bold text-emerald-700">{fmt(totalPaid)} ج.م</span>
                </div>
                {showPayForm && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} className="form-input" placeholder="المبلغ" />
                      <select value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })} className="form-input">
                        <option>كاش</option><option>تحويل بنكي</option><option>فودافون كاش</option>
                      </select>
                    </div>
                    <input value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} className="form-input" placeholder="ملاحظات" />
                    <button onClick={addPayment} className="btn-gold text-xs py-2 px-4 w-full">حفظ الدفعة</button>
                  </div>
                )}
                {payments.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">لا توجد مدفوعات</p>
                ) : (
                  <div className="space-y-2">
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-sm font-semibold text-emerald-700">{fmt(p.amount)} ج.م</p>
                          <p className="text-xs text-gray-500">{new Date(p.payment_date).toLocaleDateString('ar-EG')} · {p.payment_method}</p>
                        </div>
                        {p.notes && <p className="text-xs text-gray-400 truncate max-w-[150px]">{p.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
