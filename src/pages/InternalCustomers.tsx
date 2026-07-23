import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Users, Loader2, X, Pencil, Trash2, MapPin, Search,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { InternalCustomer, Employee } from '../types';

interface FormState {
  name: string;
  phone: string;
  interested_destination: string;
  last_follow_up: string;
  employee_id: string;
}

const emptyForm = (): FormState => ({
  name: '', phone: '', interested_destination: '', last_follow_up: '', employee_id: '',
});

export default function InternalCustomers() {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<InternalCustomer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<InternalCustomer | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [cr, em] = await Promise.all([
      supabase.from('internal_customers').select('*, employees(*)').order('created_at', { ascending: false }),
      supabase.from('employees').select('*'),
    ]);
    setCustomers((cr.data as InternalCustomer[]) || []);
    setEmployees((em.data as Employee[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditCustomer(null);
    setForm({ ...emptyForm(), employee_id: profile?.role === 'مندوب مبيعات' && profile.id ? profile.id : '' });
    setError('');
    setModalOpen(true);
  };
  const openEdit = (c: InternalCustomer) => {
    setEditCustomer(c);
    setForm({
      name: c.name,
      phone: c.phone || '',
      interested_destination: c.interested_destination || '',
      last_follow_up: c.last_follow_up || '',
      employee_id: c.employee_id || '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) { setError('اسم العميل مطلوب'); return; }
    setSaving(true);
    const payload = {
      name: form.name,
      phone: form.phone || null,
      interested_destination: form.interested_destination || null,
      last_follow_up: form.last_follow_up || null,
      employee_id: form.employee_id || null,
    };
    let err: string | null = null;
    if (editCustomer) {
      const { error: e } = await supabase.from('internal_customers').update(payload).eq('id', editCustomer.id);
      err = e?.message || null;
    } else {
      const { error: e } = await supabase.from('internal_customers').insert(payload);
      err = e?.message || null;
    }
    if (err) { setError(err); setSaving(false); return; }
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    setDeletingId(id);
    await supabase.from('internal_customers').delete().eq('id', id);
    setDeletingId(null);
    load();
  };

  const filtered = useMemo(() => {
    return customers.filter((c) =>
      !search || c.name.includes(search) || (c.phone || '').includes(search) || (c.interested_destination || '').includes(search),
    );
  }, [customers, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">عملاء الرحلات الداخلية</h2>
          <p className="section-subtitle">إدارة عملاء الرحلات الداخلية والمتابعة</p>
        </div>
        <button onClick={openAdd} className="btn-gold text-sm py-2 px-4">
          <Plus size={15} />إضافة عميل
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 gap-3 flex-wrap">
          <p className="text-sm text-gray-500">{filtered.length} عميل</p>
          <div className="relative max-w-xs">
            <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث..." className="form-input pr-9" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-navy-700" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">لا يوجد عملاء</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>الاسم</th><th>الهاتف</th><th>الوجهة المهتم بها</th>
                  <th>آخر متابعة</th><th>الموظف المسؤول</th><th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="font-semibold text-gray-800 text-sm">{c.name}</td>
                    <td className="text-gray-600 text-xs" dir="ltr">{c.phone || '—'}</td>
                    <td className="text-gray-600 text-xs">
                      {c.interested_destination ? <span className="flex items-center gap-1"><MapPin size={12} />{c.interested_destination}</span> : '—'}
                    </td>
                    <td className="text-gray-500 text-xs">
                      {c.last_follow_up ? new Date(c.last_follow_up).toLocaleDateString('ar-EG') : '—'}
                    </td>
                    <td className="text-gray-600 text-xs">{c.employees?.name || '—'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-600 transition-colors" title="تعديل">
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                          title="حذف"
                        >
                          {deletingId === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-navy p-5 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white"><Users size={18} /></div>
                <div>
                  <h3 className="text-white font-bold text-base">{editCustomer ? 'تعديل عميل' : 'إضافة عميل جديد'}</h3>
                  <p className="text-white/60 text-xs">عميل مهتم بالرحلات الداخلية</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors"><X size={20} /></button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="form-label">اسم العميل <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" placeholder="الاسم بالكامل" />
              </div>
              <div>
                <label className="form-label">رقم الهاتف</label>
                <input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="form-input" placeholder="01xxxxxxxxx" />
              </div>
              <div>
                <label className="form-label">الوجهة المهتم بها</label>
                <input value={form.interested_destination} onChange={(e) => setForm({ ...form, interested_destination: e.target.value })} className="form-input" placeholder="شرم الشيخ، الغردقة..." />
              </div>
              <div>
                <label className="form-label">آخر متابعة</label>
                <input type="date" value={form.last_follow_up} onChange={(e) => setForm({ ...form, last_follow_up: e.target.value })} className="form-input" />
              </div>
              <div>
                <label className="form-label">الموظف المسؤول</label>
                <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="form-input">
                  <option value="">— غير محدد —</option>
                  {employees.filter((e) => e.is_active).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>}
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="btn-outline">إلغاء</button>
              <button onClick={handleSave} disabled={saving} className="btn-gold">
                {saving ? <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />جارٍ الحفظ...</span> : editCustomer ? 'حفظ التعديلات' : 'إضافة العميل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
