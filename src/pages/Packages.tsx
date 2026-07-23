import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Package as PackageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Package } from '../types';



const emptyForm = { name: '', type: 'عمرة' as 'حج' | 'عمرة', hotel: '', airline: '', duration_days: '', price: '', image_url: '', description: '', featured: false };

export default function Packages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('packages').select('*').order('created_at').then(({ data }) => {
      setPackages((data as Package[]) || []);
      setLoading(false);
    });
  }, []);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = (p: Package) => {
    setForm({ name: p.name, type: p.type, hotel: p.hotel || '', airline: p.airline || '', duration_days: String(p.duration_days || ''), price: String(p.price), image_url: p.image_url || '', description: p.description || '', featured: p.featured || false });
    setEditId(p.id); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    const payload = { name: form.name, type: form.type, hotel: form.hotel || undefined, airline: form.airline || undefined, duration_days: form.duration_days ? parseInt(form.duration_days) : undefined, price: parseFloat(form.price), image_url: form.image_url || undefined, description: form.description || undefined, featured: form.featured };
    const dbPayload = { name: form.name, type: form.type, hotel: form.hotel || null, airline: form.airline || null, duration_days: form.duration_days ? parseInt(form.duration_days) : null, price: parseFloat(form.price), image_url: form.image_url || null, description: form.description || null, featured: form.featured };
    if (editId) {
      await supabase.from('packages').update(dbPayload).eq('id', editId);
      setPackages(packages.map(p => p.id === editId ? { ...p, ...payload } : p));
    } else {
      const { data } = await supabase.from('packages').insert(dbPayload).select().single();
      const newPkg: Package = data ? (data as unknown as Package) : { id: Date.now().toString(), ...payload, is_active: true, created_at: new Date().toISOString() };
      setPackages([...packages, newPkg]);
    }
    setSaving(false); setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الباقة؟')) return;
    await supabase.from('packages').delete().eq('id', id);
    setPackages(packages.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">الباقات</h2>
          <p className="section-subtitle">إدارة باقات الحج والعمرة</p>
        </div>
        <button onClick={openAdd} className="btn-gold"><Plus size={16} />إضافة باقة</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {packages.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className={`h-2 ${p.type === 'حج' ? 'bg-gradient-to-l from-gold-600 to-gold-400' : 'bg-gradient-navy'}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.type === 'حج' ? 'bg-gold-50 text-gold-600' : 'bg-navy-50 text-navy-700'}`}>
                      <PackageIcon size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm leading-tight">{p.name}</h3>
                      <span className={`badge mt-1 text-[10px] ${p.type === 'حج' ? 'bg-gold-100 text-gold-700' : 'bg-navy-100 text-navy-700'}`}>{p.type}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gold-50 text-gold-600 transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="space-y-2 text-xs text-gray-600">
                  {p.hotel && <div className="flex justify-between"><span className="text-gray-400">الفندق</span><span className="font-medium">{p.hotel}</span></div>}
                  {p.airline && <div className="flex justify-between"><span className="text-gray-400">شركة الطيران</span><span className="font-medium">{p.airline}</span></div>}
                  {p.duration_days && <div className="flex justify-between"><span className="text-gray-400">المدة</span><span className="font-medium">{p.duration_days} يوم</span></div>}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">السعر</span>
                  <span className="text-lg font-black text-navy-800">{p.price.toLocaleString('ar-EG')} <span className="text-xs font-medium text-gray-500">ج.م</span></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-navy-900">{editId ? 'تعديل الباقة' : 'إضافة باقة جديدة'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">اسم الباقة <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" placeholder="مثال: باقة عمرة رمضان" />
                </div>
                <div>
                  <label className="form-label">النوع</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'حج' | 'عمرة' })} className="form-input">
                    <option value="عمرة">عمرة</option>
                    <option value="حج">حج</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">المدة (أيام)</label>
                  <input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} className="form-input" placeholder="14" />
                </div>
                <div>
                  <label className="form-label">الفندق</label>
                  <input value={form.hotel} onChange={(e) => setForm({ ...form, hotel: e.target.value })} className="form-input" placeholder="اسم الفندق" />
                </div>
                <div>
                  <label className="form-label">شركة الطيران</label>
                  <input value={form.airline} onChange={(e) => setForm({ ...form, airline: e.target.value })} className="form-input" placeholder="مثال: مصر للطيران" />
                </div>
                <div className="col-span-2">
                  <label className="form-label">السعر (ج.م) <span className="text-red-500">*</span></label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="form-input" placeholder="18000" />
                </div>
                <div className="col-span-2">
                  <label className="form-label">رابط صورة الباقة (للموقع)</label>
                  <input dir="ltr" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="form-input" placeholder="https://..." />
                </div>
                <div className="col-span-2">
                  <label className="form-label">وصف الباقة (للموقع)</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="form-input min-h-[70px] resize-none" placeholder="وصف تسويقي يظهر على الموقع" />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="w-4 h-4 accent-navy-800" />
                    <span className="text-sm font-semibold text-gray-700">باقة مميزة (تظهر في الصفحة الرئيسية)</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-outline">إلغاء</button>
              <button onClick={handleSave} disabled={saving} className="btn-gold">
                {saving ? 'جارٍ الحفظ...' : editId ? 'حفظ التعديلات' : 'إضافة الباقة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
