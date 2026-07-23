import { useState, useEffect } from 'react';
import {
  Building2, Plus, Search, Star, Wifi, Coffee, Utensils,
  Dumbbell, Car, Waves, BedDouble, X, Pencil, Trash2, Eye,
  MapPin, CheckCircle, XCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Hotel, HotelCategory, HotelStatus } from '../types';

const HOTEL_SERVICES = [
  { key: 'واي فاي', icon: Wifi },
  { key: 'إفطار', icon: Coffee },
  { key: 'غداء', icon: Utensils },
  { key: 'عشاء', icon: Utensils },
  { key: 'خدمة غرف', icon: BedDouble },
  { key: 'نقل', icon: Car },
  { key: 'مسبح', icon: Waves },
  { key: 'جيم', icon: Dumbbell },
];

const CATEGORIES: HotelCategory[] = ['3 نجوم', '4 نجوم', '5 نجوم', 'VIP'];
const CITIES = ['مكة المكرمة', 'المدينة المنورة', 'جدة', 'الرياض', 'الطائف', 'أخرى'];

const categoryColors: Record<HotelCategory, string> = {
  'VIP': 'bg-amber-100 text-amber-700 border-amber-200',
  '5 نجوم': 'bg-purple-100 text-purple-700 border-purple-200',
  '4 نجوم': 'bg-blue-100 text-blue-700 border-blue-200',
  '3 نجوم': 'bg-gray-100 text-gray-700 border-gray-200',
};



interface HotelModalProps {
  hotel?: Hotel | null;
  onClose: () => void;
  onSave: () => void;
}

function HotelModal({ hotel, onClose, onSave }: HotelModalProps) {
  const [form, setForm] = useState({
    name: hotel?.name ?? '',
    city: hotel?.city ?? 'مكة المكرمة',
    country: hotel?.country ?? 'السعودية',
    address: hotel?.address ?? '',
    stars: hotel?.stars ?? 3,
    category: hotel?.category ?? ('3 نجوم' as HotelCategory),
    price_per_night: hotel?.price_per_night ?? 0,
    services: hotel?.services ?? [],
    status: hotel?.status ?? ('نشط' as HotelStatus),
    description: hotel?.description ?? '',
  });
  const [saving, setSaving] = useState(false);

  const toggleService = (svc: string) => {
    setForm(prev => ({
      ...prev,
      services: prev.services.includes(svc)
        ? prev.services.filter(s => s !== svc)
        : [...prev.services, svc],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (hotel) {
      await supabase.from('hotels').update({ ...form, updated_at: new Date().toISOString() }).eq('id', hotel.id);
    } else {
      await supabase.from('hotels').insert([form]);
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-navy-900">{hotel ? 'تعديل الفندق' : 'إضافة فندق جديد'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم الفندق</label>
              <input className="input-field" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="أدخل اسم الفندق" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المدينة</label>
              <select className="input-field" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الدولة</label>
              <input className="input-field" value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
              <input className="input-field" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="العنوان التفصيلي" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
              <select className="input-field" value={form.category} onChange={e => {
                const cat = e.target.value as HotelCategory;
                const starsMap: Record<HotelCategory, number> = { 'VIP': 5, '5 نجوم': 5, '4 نجوم': 4, '3 نجوم': 3 };
                setForm(p => ({ ...p, category: cat, stars: starsMap[cat] }));
              }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">السعر للليلة (ج.م)</label>
              <input type="number" className="input-field" min="0" value={form.price_per_night} onChange={e => setForm(p => ({ ...p, price_per_night: +e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
              <select className="input-field" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as HotelStatus }))}>
                <option value="نشط">نشط</option>
                <option value="غير نشط">غير نشط</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الخدمات المتاحة</label>
            <div className="grid grid-cols-4 gap-2">
              {HOTEL_SERVICES.map(({ key, icon: Icon }) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => toggleService(key)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-xs font-medium
                    ${form.services.includes(key) ? 'border-navy-600 bg-navy-50 text-navy-700' : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'}`}
                >
                  <Icon size={16} />
                  <span>{key}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">وصف الفندق</label>
            <textarea className="input-field resize-none" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="وصف موجز للفندق ومميزاته" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-gold flex-1 justify-center">
              {saving ? 'جارٍ الحفظ...' : hotel ? 'حفظ التعديلات' : 'إضافة الفندق'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface HotelDetailModalProps {
  hotel: Hotel;
  onClose: () => void;
  onEdit: () => void;
}

function HotelDetailModal({ hotel, onClose, onEdit }: HotelDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-navy-900">تفاصيل الفندق</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-700 to-navy-900 flex items-center justify-center shadow-lg flex-shrink-0">
              <Building2 size={26} className="text-gold-400" />
            </div>
            <div>
              <h3 className="font-bold text-navy-900 text-xl">{hotel.name}</h3>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: hotel.stars }).map((_, i) => (
                  <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                ))}
                <span className={`badge border text-xs mr-2 ${categoryColors[hotel.category]}`}>{hotel.category}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-0.5">المدينة</p>
              <p className="font-semibold text-navy-900 flex items-center gap-1"><MapPin size={13} className="text-navy-400" />{hotel.city}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-0.5">الدولة</p>
              <p className="font-semibold text-navy-900">{hotel.country}</p>
            </div>
            {hotel.address && (
              <div className="col-span-2 bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">العنوان</p>
                <p className="font-semibold text-navy-900">{hotel.address}</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-0.5">السعر للليلة</p>
              <p className="font-bold text-emerald-600">{hotel.price_per_night.toLocaleString('ar-EG')} ج.م</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-0.5">الحالة</p>
              <span className={`badge border text-xs ${hotel.status === 'نشط' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                {hotel.status}
              </span>
            </div>
          </div>

          {hotel.services.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">الخدمات المتاحة</p>
              <div className="flex flex-wrap gap-2">
                {hotel.services.map(svc => {
                  const svcObj = HOTEL_SERVICES.find(s => s.key === svc);
                  const Icon = svcObj?.icon ?? Wifi;
                  return (
                    <span key={svc} className="flex items-center gap-1 px-2.5 py-1 bg-navy-50 text-navy-700 rounded-lg text-xs font-medium border border-navy-100">
                      <Icon size={12} />{svc}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {hotel.description && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">الوصف</p>
              <p className="text-sm text-gray-700">{hotel.description}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onEdit} className="btn-gold flex-1 justify-center"><Pencil size={15} />تعديل</button>
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">إغلاق</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hotels() {
  const { can } = useAuth();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<HotelStatus | 'الكل'>('الكل');
  const [filterCategory, setFilterCategory] = useState<HotelCategory | 'الكل'>('الكل');
  const [showModal, setShowModal] = useState(false);
  const [editHotel, setEditHotel] = useState<Hotel | null>(null);
  const [detailHotel, setDetailHotel] = useState<Hotel | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('hotels').select('*').order('created_at', { ascending: false });
    setHotels((data as Hotel[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفندق؟')) return;
    await supabase.from('hotels').delete().eq('id', id);
    load();
  };

  const filtered = hotels.filter(h => {
    const matchSearch = !search || h.name.includes(search) || h.city.includes(search);
    const matchStatus = filterStatus === 'الكل' || h.status === filterStatus;
    const matchCat = filterCategory === 'الكل' || h.category === filterCategory;
    return matchSearch && matchStatus && matchCat;
  });

  const stats = {
    total: hotels.length,
    active: hotels.filter(h => h.status === 'نشط').length,
    vip: hotels.filter(h => h.category === 'VIP').length,
    makkah: hotels.filter(h => h.city === 'مكة المكرمة').length,
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">إدارة الفنادق</h1>
          <p className="text-gray-500 text-sm mt-0.5">إدارة الفنادق المرتبطة بباقات الحج والعمرة</p>
        </div>
        {can('hotels_add') && (
          <button onClick={() => { setEditHotel(null); setShowModal(true); }} className="btn-gold">
            <Plus size={18} /> إضافة فندق
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الفنادق', value: stats.total, icon: Building2, color: 'text-navy-600', bg: 'bg-navy-50' },
          { label: 'فنادق نشطة', value: stats.active, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'فنادق VIP', value: stats.vip, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'مكة المكرمة', value: stats.makkah, icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <p className="text-2xl font-bold text-navy-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pr-9 py-2 text-sm" placeholder="بحث باسم الفندق أو المدينة..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {(['الكل', 'نشط', 'غير نشط'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${filterStatus === s ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-gray-600 border-gray-200 hover:border-navy-300'}`}>{s}</button>
            ))}
          </div>
          <div className="flex gap-2">
            {(['الكل', ...CATEGORIES] as const).map(c => (
              <button key={c} onClick={() => setFilterCategory(c)} className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${filterCategory === c ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-gray-600 border-gray-200 hover:border-navy-300'}`}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-navy-900">قائمة الفنادق</h2>
          <span className="text-sm text-gray-500">{filtered.length} فندق</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
            <p>لا توجد فنادق مطابقة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-right">
                  {['الفندق', 'المدينة', 'التصنيف', 'السعر / ليلة', 'الخدمات', 'الحالة', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(hotel => (
                  <tr key={hotel.id} className="hover:bg-navy-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 flex items-center justify-center flex-shrink-0">
                          <Building2 size={16} className="text-gold-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-navy-900 text-sm">{hotel.name}</p>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {Array.from({ length: hotel.stars }).map((_, i) => (
                              <Star key={i} size={10} className="fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-sm text-gray-700"><MapPin size={13} className="text-gray-400" />{hotel.city}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge border text-xs ${categoryColors[hotel.category]}`}>{hotel.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-emerald-600 text-sm">{hotel.price_per_night.toLocaleString('ar-EG')} ج.م</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap max-w-[180px]">
                        {hotel.services.slice(0, 3).map(svc => (
                          <span key={svc} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-xs">{svc}</span>
                        ))}
                        {hotel.services.length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-lg text-xs">+{hotel.services.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge border text-xs ${hotel.status === 'نشط' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                        {hotel.status === 'نشط' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {hotel.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDetailHotel(hotel)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-navy-700"><Eye size={15} /></button>
                        {can('hotels_edit') && (
                          <button onClick={() => { setEditHotel(hotel); setShowModal(true); }} className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-gray-500 hover:text-blue-600"><Pencil size={15} /></button>
                        )}
                        {can('hotels_delete') && (
                          <button onClick={() => handleDelete(hotel.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-500 hover:text-red-600"><Trash2 size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <HotelModal
          hotel={editHotel}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); load(); }}
        />
      )}
      {detailHotel && (
        <HotelDetailModal
          hotel={detailHotel}
          onClose={() => setDetailHotel(null)}
          onEdit={() => { setEditHotel(detailHotel); setDetailHotel(null); setShowModal(true); }}
        />
      )}
    </div>
  );
}
