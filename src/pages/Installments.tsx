import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, CalendarClock, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Installment, Booking } from '../types';
import { exportToExcel } from '../lib/export';

const emptyForm = {
  booking_id: '',
  customer_id: '',
  total_amount: '',
  paid_amount: '',
  number_of_installments: '1',
  paid_installments: '0',
  next_due_date: '',
};

const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');
const today = new Date().toISOString().split('T')[0];

interface InstRow extends Installment {}

export default function Installments() {
  const [items, setItems] = useState<InstRow[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: instData }, { data: bkData }] = await Promise.all([
        supabase.from('installments').select('*, customers(*), bookings(*)').order('created_at', { ascending: false }),
        supabase.from('bookings').select('*, customers(*)').order('created_at', { ascending: false }),
      ]);
      setItems((instData as InstRow[]) || []);
      setBookings((bkData as Booking[]) || []);
      setLoading(false);
    })();
  }, []);

  const computeStatus = (paid: number, total: number, nextDue?: string): Installment['status'] => {
    if (paid >= total && total > 0) return 'مكتمل';
    if (nextDue && nextDue < today && paid < total) return 'متأخر';
    return 'نشط';
  };

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = (i: InstRow) => {
    setForm({
      booking_id: i.booking_id || '',
      customer_id: i.customer_id || '',
      total_amount: String(i.total_amount),
      paid_amount: String(i.paid_amount),
      number_of_installments: String(i.number_of_installments),
      paid_installments: String(i.paid_installments),
      next_due_date: i.next_due_date || '',
    });
    setEditId(i.id); setShowModal(true);
  };

  const onBookingChange = (bookingId: string) => {
    const bk = bookings.find(b => b.id === bookingId);
    setForm({ ...form, booking_id: bookingId, customer_id: bk?.customer_id || '', total_amount: bk ? String(bk.total_amount || '') : form.total_amount, paid_amount: bk ? String(bk.paid_amount || '') : form.paid_amount });
  };

  const handleSave = async () => {
    if (!form.total_amount || !form.number_of_installments) return;
    setSaving(true);
    const total = parseFloat(form.total_amount);
    const paid = parseFloat(form.paid_amount || '0');
    const remaining = total - paid;
    const status = computeStatus(paid, total, form.next_due_date);
    const payload = {
      booking_id: form.booking_id || null,
      customer_id: form.customer_id || null,
      total_amount: total,
      paid_amount: paid,
      remaining_amount: remaining,
      number_of_installments: parseInt(form.number_of_installments),
      paid_installments: parseInt(form.paid_installments),
      next_due_date: form.next_due_date || null,
      status,
    };
    if (editId) {
      const { data } = await supabase.from('installments').update(payload).eq('id', editId).select('*, customers(*), bookings(*)').single();
      if (data) setItems(items.map(x => x.id === editId ? (data as InstRow) : x));
    } else {
      const { data } = await supabase.from('installments').insert(payload).select('*, customers(*), bookings(*)').single();
      if (data) setItems([data as InstRow, ...items]);
    }
    setSaving(false); setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسط؟')) return;
    await supabase.from('installments').delete().eq('id', id);
    setItems(items.filter(x => x.id !== id));
  };

  const dueToday = items.filter(i => i.next_due_date === today && i.status !== 'مكتمل');
  const overdue = items.filter(i => i.status === 'متأخر');
  const active = items.filter(i => i.status === 'نشط');

  const handleExport = () => {
    exportToExcel(items.map((i, idx) => ({
      '#': idx + 1, 'العميل': i.customers?.name || '—', 'الحجز': i.booking_id?.slice(0, 8) || '—',
      'الإجمالي': i.total_amount, 'المدفوع': i.paid_amount, 'المتبقي': i.remaining_amount,
      'عدد الأقساط': i.number_of_installments, 'القسط التالي': i.next_due_date ? new Date(i.next_due_date).toLocaleDateString('ar-EG') : '—', 'الحالة': i.status,
    })), 'الأقساط');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">الأقساط</h2>
          <p className="section-subtitle">تتبع الدفعات بالتقسيط</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-outline">تصدير</button>
          <button onClick={openAdd} className="btn-gold"><Plus size={16} /> إضافة قسط</button>
        </div>
      </div>

      {/* Alert banners */}
      {dueToday.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <CalendarClock size={22} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-amber-800 text-sm">أقساط مستحقة اليوم ({dueToday.length})</p>
            <p className="text-amber-600 text-xs mt-0.5">{dueToday.map(d => d.customers?.name).join('، ')}</p>
          </div>
        </div>
      )}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle size={22} className="text-red-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-red-800 text-sm">أقساط متأخرة ({overdue.length})</p>
            <p className="text-red-600 text-xs mt-0.5">{overdue.map(d => d.customers?.name).join('، ')}</p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-gray-500">أقساط نشطة</p><p className="text-2xl font-black text-navy-900 mt-1">{active.length}</p></div>
            <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center text-navy-700"><Clock size={22} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-gray-500">مستحقة اليوم</p><p className="text-2xl font-black text-amber-600 mt-1">{dueToday.length}</p></div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><CalendarClock size={22} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-gray-500">متأخرة</p><p className="text-2xl font-black text-red-600 mt-1">{overdue.length}</p></div>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600"><AlertCircle size={22} /></div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-navy-700" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full data-table min-w-[1000px]">
            <thead>
              <tr>
                <th>رقم القسط</th><th>اسم العميل</th><th>رقم الحجز</th>
                <th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th>
                <th>عدد الأقساط</th><th>القسط التالي</th><th>الحالة</th><th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={10} className="text-center text-gray-400 py-10">لا توجد أقساط مسجلة</td></tr>
              ) : items.map(i => (
                <tr key={i.id}>
                  <td className="font-mono text-xs text-gray-500">#{i.id.slice(0, 8)}</td>
                  <td className="font-semibold text-gray-800">{i.customers?.name || '—'}</td>
                  <td className="font-mono text-xs text-gray-500">{i.booking_id ? '#' + i.booking_id.slice(0, 8) : '—'}</td>
                  <td className="font-bold text-navy-900">{fmt(i.total_amount)}</td>
                  <td className="text-emerald-600 font-semibold">{fmt(i.paid_amount)}</td>
                  <td className="text-amber-600 font-semibold">{fmt(i.remaining_amount)}</td>
                  <td className="text-gray-600 text-sm">{i.paid_installments}/{i.number_of_installments}</td>
                  <td className="text-gray-500 text-sm">{i.next_due_date ? new Date(i.next_due_date).toLocaleDateString('ar-EG') : '—'}</td>
                  <td>
                    <span className={`badge ${i.status === 'مكتمل' ? 'bg-emerald-100 text-emerald-700' : i.status === 'متأخر' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {i.status === 'مكتمل' ? <CheckCircle2 size={11} className="inline ml-1" /> : null}{i.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(i)} title="تعديل" className="p-1.5 rounded-lg hover:bg-gold-50 text-gold-600"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(i.id)} title="حذف" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-navy-900">{editId ? 'تعديل القسط' : 'إضافة قسط جديد'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">الحجز المرتبط</label>
                <select value={form.booking_id} onChange={(e) => onBookingChange(e.target.value)} className="form-input">
                  <option value="">— بدون حجز —</option>
                  {bookings.map(b => <option key={b.id} value={b.id}>{b.customers?.name || 'حجز'} — {fmt(Number(b.total_amount || 0))} ج.م</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">الإجمالي (ج.م) <span className="text-red-500">*</span></label>
                  <input type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} className="form-input" placeholder="20000" />
                </div>
                <div>
                  <label className="form-label">المدفوع (ج.م)</label>
                  <input type="number" value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} className="form-input" placeholder="5000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">عدد الأقساط <span className="text-red-500">*</span></label>
                  <input type="number" min="1" value={form.number_of_installments} onChange={(e) => setForm({ ...form, number_of_installments: e.target.value })} className="form-input" placeholder="4" />
                </div>
                <div>
                  <label className="form-label">الأقساط المدفوعة</label>
                  <input type="number" min="0" value={form.paid_installments} onChange={(e) => setForm({ ...form, paid_installments: e.target.value })} className="form-input" placeholder="1" />
                </div>
              </div>
              <div>
                <label className="form-label">تاريخ القسط التالي</label>
                <input type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} className="form-input" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowModal(false)} className="btn-outline">إلغاء</button>
              <button onClick={handleSave} disabled={saving || !form.total_amount} className="btn-gold">{saving ? 'جارٍ الحفظ...' : 'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
