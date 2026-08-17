import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Plane, Pencil, Trash2, Loader2, X, MapPin,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { InternalTrip, InternalTripStatus } from '../types';

const statusOptions: InternalTripStatus[] = ['متاحة', 'ممتلئة', 'مغلقة', 'ملغاة'];

const statusColors: Record<InternalTripStatus, string> = {
  متاحة: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  ممتلئة: 'bg-amber-100 text-amber-700 border-amber-200',
  مغلقة: 'bg-gray-200 text-gray-700 border-gray-300',
  ملغاة: 'bg-red-100 text-red-700 border-red-200',
};

const todayStr = () => new Date().toISOString().split('T')[0];

interface FormState {
  name: string;
  destination: string;
  hotel: string;
  duration: string;
  start_date: string;
  end_date: string;
  price: string;
  total_seats: string;
  available_seats: string;
  status: InternalTripStatus;
}

const emptyForm = (): FormState => ({
  name: '',
  destination: '',
  hotel: '',
  duration: '',
  start_date: todayStr(),
  end_date: todayStr(),
  price: '0',
  total_seats: '0',
  available_seats: '0',
  status: 'متاحة',
});

export default function InternalTrips() {
  const [trips, setTrips] = useState<InternalTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InternalTripStatus | 'الكل'>('الكل');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTrip, setEditTrip] = useState<InternalTrip | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('internal_trips')
      .select('*')
      .order('start_date', { ascending: false });
    setTrips((data as InternalTrip[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditTrip(null); setForm(emptyForm()); setError(''); setModalOpen(true); };
  const openEdit = (t: InternalTrip) => {
    setEditTrip(t);
    setForm({
      name: t.name,
      destination: t.destination,
      hotel: t.hotel || '',
      duration: t.duration || '',
      start_date: t.start_date,
      end_date: t.end_date,
      price: String(t.price ?? 0),
      total_seats: String(t.total_seats ?? 0),
      available_seats: String(t.available_seats ?? 0),
      status: t.status,
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) { setError('اسم الرحلة مطلوب'); return; }
    if (!form.destination.trim()) { setError('الوجهة مطلوبة'); return; }
    if (!form.start_date || !form.end_date) { setError('التواريخ مطلوبة'); return; }
    setSaving(true);
    const payload = {
      name: form.name,
      destination: form.destination,
      hotel: form.hotel || null,
      duration: form.duration || null,
      start_date: form.start_date,
      end_date: form.end_date,
      price: Number(form.price) || 0,
      total_seats: Number(form.total_seats) || 0,
      available_seats: Number(form.available_seats) || 0,
      status: form.status,
    };
    let err: string | null = null;
    if (editTrip) {
      const { error: e } = await supabase.from('internal_trips').update(payload).eq('id', editTrip.id);
      err = e?.message || null;
    } else {
      const { error: e } = await supabase.from('internal_trips').insert(payload);
      err = e?.message || null;
    }
    if (err) { setError(err); setSaving(false); return; }
    setSaving(false);
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الرحلة؟ سيتم حذف كل الحجوزات المرتبطة بها.')) return;
    setDeletingId(id);
    await supabase.from('internal_trip_bookings').delete().eq('trip_id', id);
    await supabase.from('internal_trips').delete().eq('id', id);
    setDeletingId(null);
    load();
  };

  const filtered = useMemo(() => {
    return trips.filter((t) => {
      const matchSearch = !search || t.name.includes(search) || t.destination.includes(search);
      const matchStatus = statusFilter === 'الكل' || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [trips, search, statusFilter]);

  const counts = useMemo(() => ({
    متاحة: trips.filter(t => t.status === 'متاحة').length,
    ممتلئة: trips.filter(t => t.status === 'ممتلئة').length,
    مغلقة: trips.filter(t => t.status === 'مغلقة').length,
    ملغاة: trips.filter(t => t.status === 'ملغاة').length,
  }), [trips]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">إدارة الرحلات الداخلية</h2>
          <p className="section-subtitle">إنشاء وإدارة الرحلات والمقاعد المتاحة</p>
        </div>
        <button onClick={openAdd} className="btn-gold text-sm py-2 px-4">
          <Plus size={15} />إضافة رحلة
        </button>
      </div>

      {/* Status counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statusOptions.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? 'الكل' : s)}
            className={`stat-card text-right hover:ring-2 hover:ring-navy-300 transition-all cursor-pointer ${statusFilter === s ? 'ring-2 ring-navy-400' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <Plane size={18} className="text-navy-600" />
              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${statusColors[s]}`}>{s}</span>
            </div>
            <p className="text-2xl font-black text-navy-900">{counts[s]}</p>
            <p className="text-xs text-gray-400 mt-1">رحلة</p>
          </button>
        ))}
      </div>

      {/* Search + table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {(['الكل', ...statusOptions] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? 'bg-navy-800 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-navy-300'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم العميل أو الحجز..."
            className="form-input max-w-xs"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-navy-700" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Plane size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">لا توجد رحلات</p>
            <p className="text-sm mt-1">أضف أول رحلة داخلية</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>اسم الرحلة</th><th>الوجهة</th><th>الفندق</th><th>التواريخ</th>
                  <th>السعر</th><th>المقاعد</th><th>الحالة</th><th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const seatPct = t.total_seats > 0 ? Math.round((t.available_seats / t.total_seats) * 100) : 0;
                  return (
                    <tr key={t.id}>
                      <td>
                        <p className="font-semibold text-gray-800 text-sm">{t.name}</p>
                        {t.duration && <p className="text-xs text-gray-400">{t.duration}</p>}
                      </td>
                      <td className="text-gray-600 text-sm">
                        <span className="flex items-center gap-1"><MapPin size={12} />{t.destination}</span>
                      </td>
                      <td className="text-gray-600 text-xs">{t.hotel || '—'}</td>
                      <td className="text-gray-500 text-xs">
                        {new Date(t.start_date).toLocaleDateString('ar-EG')} ← {new Date(t.end_date).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="font-semibold text-navy-800 text-sm">{Number(t.price).toLocaleString('ar-EG')} ج.م</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800">{t.available_seats}/{t.total_seats}</span>
                          <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${seatPct > 50 ? 'bg-emerald-500' : seatPct > 20 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${seatPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td><span className={`badge border ${statusColors[t.status]}`}>{t.status}</span></td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-600 transition-colors" title="تعديل">
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            disabled={deletingId === t.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                            title="حذف"
                          >
                            {deletingId === t.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                  <Plane size={18} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">{editTrip ? 'تعديل رحلة' : 'إضافة رحلة جديدة'}</h3>
                  <p className="text-white/60 text-xs">{editTrip ? 'تحديث بيانات الرحلة' : 'إنشاء رحلة داخلية جديدة'}</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">اسم الرحلة <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" placeholder="مثال: رحلة شرم الشيخ الصيفية" />
                </div>
                <div>
                  <label className="form-label">الوجهة <span className="text-red-500">*</span></label>
                  <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="form-input" placeholder="شرم الشيخ" />
                </div>
                <div>
                  <label className="form-label">الفندق</label>
                  <input value={form.hotel} onChange={(e) => setForm({ ...form, hotel: e.target.value })} className="form-input" placeholder="فندق رمسيس" />
                </div>
                <div className="col-span-2">
                  <label className="form-label">المدة</label>
                  <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="form-input" placeholder="5 أيام / 4 ليالي" />
                </div>
                <div>
                  <label className="form-label">تاريخ البداية <span className="text-red-500">*</span></label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">تاريخ النهاية <span className="text-red-500">*</span></label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">السعر للفرد (ج.م)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">الحالة</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as InternalTripStatus })} className="form-input">
                    {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">إجمالي المقاعد</label>
                  <input type="number" value={form.total_seats} onChange={(e) => setForm({ ...form, total_seats: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">المقاعد المتاحة</label>
                  <input type="number" value={form.available_seats} onChange={(e) => setForm({ ...form, available_seats: e.target.value })} className="form-input" />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">{error}</div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="btn-outline">إلغاء</button>
              <button onClick={handleSave} disabled={saving} className="btn-gold">
                {saving ? <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />جارٍ الحفظ...</span> : editTrip ? 'حفظ التعديلات' : 'إضافة الرحلة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
