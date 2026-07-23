import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, ClipboardList, Loader2, X, Search,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { InternalTripBooking, InternalBookingStatus, PaymentStatus, Employee, InternalTrip } from '../types';

const bookingStatuses: InternalBookingStatus[] = ['جديدة', 'مؤكدة', 'ملغاة', 'مكتملة'];
const paymentStatuses: PaymentStatus[] = ['غير مدفوع', 'مدفوع جزئياً', 'مدفوع بالكامل'];

const bookingStatusColors: Record<InternalBookingStatus, string> = {
  جديدة: 'bg-blue-100 text-blue-700',
  مؤكدة: 'bg-emerald-100 text-emerald-700',
  مكتملة: 'bg-emerald-200 text-emerald-800',
  ملغاة: 'bg-red-100 text-red-700',
};

const paymentColors: Record<PaymentStatus, string> = {
  'غير مدفوع': 'bg-gray-100 text-gray-600',
  'مدفوع جزئياً': 'bg-amber-100 text-amber-700',
  'مدفوع بالكامل': 'bg-emerald-100 text-emerald-700',
};

interface FormState {
  customer_name: string;
  phone: string;
  trip_id: string;
  travelers_count: string;
  booking_status: InternalBookingStatus;
  payment_status: PaymentStatus;
  employee_id: string;
  total_amount: string;
  paid_amount: string;
}

const emptyForm = (): FormState => ({
  customer_name: '',
  phone: '',
  trip_id: '',
  travelers_count: '1',
  booking_status: 'جديدة',
  payment_status: 'غير مدفوع',
  employee_id: '',
  total_amount: '0',
  paid_amount: '0',
});

export default function InternalTripBookings() {
  const [bookings, setBookings] = useState<InternalTripBooking[]>([]);
  const [trips, setTrips] = useState<InternalTrip[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InternalBookingStatus | 'الكل'>('الكل');
  const [modalOpen, setModalOpen] = useState(false);
  const [editBooking, setEditBooking] = useState<InternalTripBooking | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [bk, tr, em] = await Promise.all([
      supabase.from('internal_trip_bookings').select('*, internal_trips(*), employees(*)').order('created_at', { ascending: false }),
      supabase.from('internal_trips').select('*').order('start_date', { ascending: false }),
      supabase.from('employees').select('*'),
    ]);
    setBookings((bk.data as InternalTripBooking[]) || []);
    setTrips((tr.data as InternalTrip[]) || []);
    setEmployees((em.data as Employee[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditBooking(null); setForm(emptyForm()); setError(''); setModalOpen(true); };
  const openEdit = (b: InternalTripBooking) => {
    setEditBooking(b);
    setForm({
      customer_name: b.customer_name,
      phone: b.phone || '',
      trip_id: b.trip_id || '',
      travelers_count: String(b.travelers_count),
      booking_status: b.booking_status,
      payment_status: b.payment_status,
      employee_id: b.employee_id || '',
      total_amount: String(b.total_amount ?? 0),
      paid_amount: String(b.paid_amount ?? 0),
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.customer_name.trim()) { setError('اسم العميل مطلوب'); return; }
    setSaving(true);
    const payload = {
      customer_name: form.customer_name,
      phone: form.phone || null,
      trip_id: form.trip_id || null,
      travelers_count: Number(form.travelers_count) || 1,
      booking_status: form.booking_status,
      payment_status: form.payment_status,
      employee_id: form.employee_id || null,
      total_amount: Number(form.total_amount) || 0,
      paid_amount: Number(form.paid_amount) || 0,
    };
    let err: string | null = null;
    if (editBooking) {
      const { error: e } = await supabase.from('internal_trip_bookings').update(payload).eq('id', editBooking.id);
      err = e?.message || null;
    } else {
      const { error: e } = await supabase.from('internal_trip_bookings').insert(payload);
      err = e?.message || null;
    }
    if (err) { setError(err); setSaving(false); return; }
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchSearch = !search || b.customer_name.includes(search) || (b.phone || '').includes(search);
      const matchStatus = statusFilter === 'الكل' || b.booking_status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [bookings, search, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">حجوزات الرحلات الداخلية</h2>
          <p className="section-subtitle">إدارة حجوزات العملاء على الرحلات</p>
        </div>
        <button onClick={openAdd} className="btn-gold text-sm py-2 px-4">
          <Plus size={15} />إضافة حجز
        </button>
      </div>

      {/* Status filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {(['الكل', ...bookingStatuses] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? 'bg-navy-800 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-navy-300'}`}
              >
                {s}
              </button>
            ))}
          </div>
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
            <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">لا توجد حجوزات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>رقم الحجز</th><th>اسم العميل</th><th>الهاتف</th><th>الرحلة</th>
                  <th>المسافرون</th><th>حالة الحجز</th><th>حالة الدفع</th><th>الموظف</th>
                  <th>الإجمالي</th><th>المدفوع</th><th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-blue-50/30 cursor-pointer" onClick={() => openEdit(b)}>
                    <td className="text-xs font-mono text-gray-500">#{b.id.slice(0, 8)}</td>
                    <td className="font-semibold text-gray-800 text-sm">{b.customer_name}</td>
                    <td className="text-gray-600 text-xs" dir="ltr">{b.phone || '—'}</td>
                    <td className="text-gray-600 text-xs">{b.internal_trips?.name || '—'}</td>
                    <td className="text-center font-bold text-navy-800">{b.travelers_count}</td>
                    <td><span className={`badge ${bookingStatusColors[b.booking_status]}`}>{b.booking_status}</span></td>
                    <td><span className={`badge ${paymentColors[b.payment_status]}`}>{b.payment_status}</span></td>
                    <td className="text-gray-600 text-xs">{b.employees?.name || '—'}</td>
                    <td className="font-semibold text-navy-800 text-xs">{Number(b.total_amount ?? 0).toLocaleString('ar-EG')}</td>
                    <td className="text-emerald-600 text-xs font-semibold">{Number(b.paid_amount ?? 0).toLocaleString('ar-EG')}</td>
                    <td>
                      <button onClick={(e) => { e.stopPropagation(); openEdit(b); }} className="text-navy-600 hover:text-navy-800 text-xs font-semibold">
                        تعديل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl animate-fadeIn my-8" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-navy p-5 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">{editBooking ? 'تعديل حجز' : 'إضافة حجز جديد'}</h3>
                  <p className="text-white/60 text-xs">{editBooking ? 'تحديث بيانات الحجز' : 'حجز رحلة لعميل'}</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">اسم العميل <span className="text-red-500">*</span></label>
                  <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="form-input" placeholder="الاسم بالكامل" />
                </div>
                <div>
                  <label className="form-label">رقم الهاتف</label>
                  <input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="form-input" placeholder="01xxxxxxxxx" />
                </div>
                <div className="col-span-2">
                  <label className="form-label">الرحلة</label>
                  <select value={form.trip_id} onChange={(e) => setForm({ ...form, trip_id: e.target.value })} className="form-input">
                    <option value="">— اختر رحلة —</option>
                    {trips.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.destination}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">عدد المسافرين</label>
                  <input type="number" min="1" value={form.travelers_count} onChange={(e) => setForm({ ...form, travelers_count: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">الموظف المسؤول</label>
                  <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="form-input">
                    <option value="">— غير محدد —</option>
                    {employees.filter((e) => e.is_active).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">حالة الحجز</label>
                  <select value={form.booking_status} onChange={(e) => setForm({ ...form, booking_status: e.target.value as InternalBookingStatus })} className="form-input">
                    {bookingStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">حالة الدفع</label>
                  <select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value as PaymentStatus })} className="form-input">
                    {paymentStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">المبلغ الإجمالي (ج.م)</label>
                  <input type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">المدفوع (ج.م)</label>
                  <input type="number" value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} className="form-input" />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="btn-outline">إلغاء</button>
              <button onClick={handleSave} disabled={saving} className="btn-gold">
                {saving ? <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />جارٍ الحفظ...</span> : editBooking ? 'حفظ التعديلات' : 'إضافة الحجز'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
