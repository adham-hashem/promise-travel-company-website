import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Tag, EyeOff, Power, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Offer, OfferType, Package } from '../types';

interface OfferRow extends Offer {
  packages?: Package;
}

const emptyForm = {
  name: '',
  description: '',
  image_url: '',
  type: '' as OfferType | '',
  package_id: '',
  original_price: '',
  discounted_price: '',
  discount_percentage: '',
  start_date: '',
  end_date: '',
  is_active: true,
};

const typeLabels: Record<OfferType, string> = {
  'حج': 'حج',
  'عمرة': 'عمرة',
  'داخلي': 'رحلات داخلية',
};

export default function Offers() {
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: offData }, { data: pkgData }] = await Promise.all([
        supabase.from('offers').select('*, packages(*)').order('created_at', { ascending: false }),
        supabase.from('packages').select('*').eq('is_active', true).order('name'),
      ]);
      setOffers((offData as OfferRow[]) || []);
      setPackages((pkgData as Package[]) || []);
      setLoading(false);
    })();
  }, []);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = (o: OfferRow) => {
    setForm({
      name: o.name,
      description: o.description || '',
      image_url: o.image_url || '',
      type: o.type || '',
      package_id: o.package_id || '',
      original_price: o.original_price != null ? String(o.original_price) : '',
      discounted_price: o.discounted_price != null ? String(o.discounted_price) : '',
      discount_percentage: String(o.discount_percentage),
      start_date: o.start_date,
      end_date: o.end_date,
      is_active: o.is_active,
    });
    setEditId(o.id); setShowModal(true);
  };

  // Auto-calculate discount percentage when prices change
  const computeDiscount = (orig: string, disc: string) => {
    const o = parseFloat(orig), d = parseFloat(disc);
    if (!o || !d || o <= 0 || d >= o) return '';
    return String(Math.round(((o - d) / o) * 100));
  };

  const onPriceChange = (field: 'original_price' | 'discounted_price', val: string) => {
    const next = { ...form, [field]: val };
    next.discount_percentage = computeDiscount(next.original_price, next.discounted_price);
    setForm(next);
  };

  const handleSave = async () => {
    if (!form.name || !form.start_date || !form.end_date) return;
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      image_url: form.image_url || null,
      type: form.type || null,
      package_id: form.package_id || null,
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      discounted_price: form.discounted_price ? parseFloat(form.discounted_price) : null,
      discount_percentage: parseFloat(form.discount_percentage || '0'),
      start_date: form.start_date,
      end_date: form.end_date,
      is_active: form.is_active,
    };
    if (editId) {
      await supabase.from('offers').update(payload).eq('id', editId);
      const { data } = await supabase.from('offers').select('*, packages(*)').eq('id', editId).single();
      setOffers(offers.map(o => o.id === editId ? (data as OfferRow) || o : o));
    } else {
      const { data } = await supabase.from('offers').insert(payload).select('*, packages(*)').single();
      if (data) setOffers([data as OfferRow, ...offers]);
    }
    setSaving(false); setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) return;
    await supabase.from('offers').delete().eq('id', id);
    setOffers(offers.filter(o => o.id !== id));
  };

  const toggleActive = async (o: OfferRow) => {
    const next = !o.is_active;
    await supabase.from('offers').update({ is_active: next }).eq('id', o.id);
    setOffers(offers.map(x => x.id === o.id ? { ...x, is_active: next } : x));
  };

  const getOfferStatus = (o: OfferRow): { label: string; class: string } => {
    const now = new Date();
    const end = new Date(o.end_date);
    const start = new Date(o.start_date);
    if (!o.is_active) return { label: 'مخفي', class: 'bg-gray-100 text-gray-500' };
    if (now > end) return { label: 'منتهي', class: 'bg-red-100 text-red-700' };
    if (now < start) return { label: 'قادم', class: 'bg-blue-100 text-blue-700' };
    return { label: 'نشط', class: 'bg-emerald-100 text-emerald-700' };
  };

  const origPrice = (o: OfferRow) => o.original_price != null ? o.original_price : o.packages?.price;
  const discPrice = (o: OfferRow) => o.discounted_price != null ? o.discounted_price : (o.packages ? Math.round(Number(o.packages.price) * (1 - o.discount_percentage / 100)) : null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">إدارة العروض</h2>
          <p className="section-subtitle">إدارة العروض الظاهرة على الموقع العام</p>
        </div>
        <button onClick={openAdd} className="btn-gold"><Plus size={16} /> إضافة عرض</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي العروض', value: offers.length, color: 'navy' },
          { label: 'نشطة', value: offers.filter(o => getOfferStatus(o).label === 'نشط').length, color: 'emerald' },
          { label: 'مخفية', value: offers.filter(o => !o.is_active).length, color: 'gray' },
          { label: 'منتهية', value: offers.filter(o => getOfferStatus(o).label === 'منتهي').length, color: 'red' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className={`text-2xl font-black text-${s.color === 'navy' ? 'navy-900' : s.color + '-600'}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-navy-700" />
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Tag size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-medium">لا توجد عروض حالياً</p>
          <p className="text-gray-400 text-sm mt-1">ابدأ بإضافة عرض جديد</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full data-table min-w-[1100px]">
            <thead>
              <tr>
                <th>الصورة</th>
                <th>اسم العرض</th>
                <th>النوع</th>
                <th>نسبة الخصم</th>
                <th>السعر الأصلي</th>
                <th>السعر بعد الخصم</th>
                <th>تاريخ البداية</th>
                <th>تاريخ النهاية</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => {
                const status = getOfferStatus(o);
                const orig = origPrice(o);
                const disc = discPrice(o);
                return (
                  <tr key={o.id}>
                    <td>
                      {o.image_url || o.packages?.image_url ? (
                        <img src={o.image_url || o.packages?.image_url} alt={o.name} className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gold-50 flex items-center justify-center">
                          <ImageIcon size={18} className="text-gold-400" />
                        </div>
                      )}
                    </td>
                    <td>
                      <div>
                        <p className="font-semibold text-gray-800">{o.name}</p>
                        {o.packages && <p className="text-xs text-gray-400">{o.packages.name}</p>}
                      </div>
                    </td>
                    <td>
                      {o.type ? (
                        <span className="badge bg-navy-50 text-navy-700">{typeLabels[o.type]}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td>
                      <span className="font-black text-gold-600">{o.discount_percentage}%</span>
                    </td>
                    <td className="text-gray-600">{orig != null ? `${Number(orig).toLocaleString('ar-EG')} ج.م` : '—'}</td>
                    <td className="text-gray-600">{disc != null ? <span className="font-bold text-red-600">{Number(disc).toLocaleString('ar-EG')} ج.م</span> : '—'}</td>
                    <td className="text-gray-500 text-sm">{new Date(o.start_date).toLocaleDateString('ar-EG')}</td>
                    <td className="text-gray-500 text-sm">{new Date(o.end_date).toLocaleDateString('ar-EG')}</td>
                    <td>
                      <span className={`badge ${status.class}`}>{status.label}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(o)} title="تعديل" className="p-1.5 rounded-lg hover:bg-gold-50 text-gold-600 transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => toggleActive(o)} title={o.is_active ? 'إخفاء' : 'تفعيل'} className={`p-1.5 rounded-lg transition-colors ${o.is_active ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-emerald-50 text-emerald-600'}`}>
                          {o.is_active ? <EyeOff size={15} /> : <Power size={15} />}
                        </button>
                        <button onClick={() => handleDelete(o.id)} title="حذف" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-fadeIn max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-bold text-navy-900">{editId ? 'تعديل العرض' : 'إضافة عرض جديد'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="form-label">اسم العرض <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" placeholder="مثال: عرض رمضان المبارك" />
              </div>

              {/* Description */}
              <div>
                <label className="form-label">وصف مختصر</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="form-input min-h-[70px] resize-none" placeholder="وصف تسويقي قصير يظهر على الموقع" />
              </div>

              {/* Image */}
              <div>
                <label className="form-label">رابط صورة العرض</label>
                <div className="flex gap-2">
                  <input dir="ltr" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="form-input" placeholder="https://..." />
                  {form.image_url && <img src={form.image_url} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />}
                </div>
              </div>

              {/* Type + Package */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">نوع العرض</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as OfferType | '', package_id: '' })} className="form-input">
                    <option value="">— اختر —</option>
                    <option value="حج">حج</option>
                    <option value="عمرة">عمرة</option>
                    <option value="داخلي">رحلات داخلية</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">الباقة المرتبطة</label>
                  <select value={form.package_id} onChange={(e) => {
                    const pkg = packages.find(p => p.id === e.target.value);
                    setForm({ ...form, package_id: e.target.value, original_price: pkg ? String(pkg.price) : form.original_price });
                  }} className="form-input">
                    <option value="">— بدون باقة —</option>
                    {packages
                      .filter(p => !form.type || p.type === form.type)
                      .map(p => <option key={p.id} value={p.id}>{p.name} — {Number(p.price).toLocaleString('ar-EG')} ج.م</option>)}
                  </select>
                </div>
              </div>

              {/* Prices + Discount */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label">السعر الأصلي (ج.م)</label>
                  <input type="number" value={form.original_price} onChange={(e) => onPriceChange('original_price', e.target.value)} className="form-input" placeholder="20000" />
                </div>
                <div>
                  <label className="form-label">السعر بعد الخصم (ج.م)</label>
                  <input type="number" value={form.discounted_price} onChange={(e) => onPriceChange('discounted_price', e.target.value)} className="form-input" placeholder="17000" />
                </div>
                <div>
                  <label className="form-label">نسبة الخصم (%)</label>
                  <input type="number" min="0" max="100" value={form.discount_percentage} onChange={(e) => setForm({ ...form, discount_percentage: e.target.value })} className="form-input bg-gray-50" placeholder="محسوبة تلقائياً" />
                </div>
              </div>

              {/* Dates + Status */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label">تاريخ البداية <span className="text-red-500">*</span></label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">تاريخ النهاية <span className="text-red-500">*</span></label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">الحالة</label>
                  <select value={form.is_active ? 'true' : 'false'} onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })} className="form-input">
                    <option value="true">ظاهر</option>
                    <option value="false">مخفي</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="btn-outline">إلغاء</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.start_date || !form.end_date} className="btn-gold">
                {saving ? 'جارٍ الحفظ...' : editId ? 'حفظ التعديلات' : 'إضافة العرض'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
