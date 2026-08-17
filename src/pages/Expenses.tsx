import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Receipt } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Expense, ExpenseCategory } from '../types';
import { exportToExcel } from '../lib/export';

const emptyForm = { name: '', category: 'أخرى' as ExpenseCategory, amount: '', expense_date: new Date().toISOString().split('T')[0], notes: '' };
const categories: ExpenseCategory[] = ['رواتب', 'تسويق', 'تشغيل', 'فنادق', 'نقل', 'إعلانات', 'إيجار', 'أخرى'];
const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');

const catColors: Record<ExpenseCategory, string> = {
  'رواتب': 'bg-blue-100 text-blue-700',
  'تسويق': 'bg-purple-100 text-purple-700',
  'تشغيل': 'bg-amber-100 text-amber-700',
  'فنادق': 'bg-cyan-100 text-cyan-700',
  'نقل': 'bg-indigo-100 text-indigo-700',
  'إعلانات': 'bg-pink-100 text-pink-700',
  'إيجار': 'bg-orange-100 text-orange-700',
  'أخرى': 'bg-gray-100 text-gray-700',
};

export default function Expenses() {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
      setItems((data as Expense[]) || []);
      setLoading(false);
    })();
  }, []);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };
  const openEdit = (e: Expense) => {
    setForm({ name: e.name, category: e.category, amount: String(e.amount), expense_date: e.expense_date, notes: e.notes || '' });
    setEditId(e.id); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.amount) return;
    setSaving(true);
    const payload = { name: form.name, category: form.category, amount: parseFloat(form.amount), expense_date: form.expense_date, notes: form.notes || null };
    if (editId) {
      const { data } = await supabase.from('expenses').update(payload).eq('id', editId).select().single();
      if (data) setItems(items.map(x => x.id === editId ? (data as Expense) : x));
    } else {
      const { data } = await supabase.from('expenses').insert(payload).select().single();
      if (data) setItems([data as Expense, ...items]);
    }
    setSaving(false); setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    await supabase.from('expenses').delete().eq('id', id);
    setItems(items.filter(x => x.id !== id));
  };

  const total = items.reduce((s, e) => s + Number(e.amount || 0), 0);
  const byCategory = categories.map(c => ({ cat: c, total: items.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount || 0), 0) }));

  const handleExport = () => {
    exportToExcel(items.map((e, i) => ({
      '#': i + 1, 'الاسم': e.name, 'الفئة': e.category, 'المبلغ': e.amount,
      'التاريخ': new Date(e.expense_date).toLocaleDateString('ar-EG'), 'ملاحظات': e.notes || '',
    })), 'المصروفات');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">المصروفات</h2>
          <p className="section-subtitle">تتبع مصروفات الشركة</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-outline">تصدير</button>
          <button onClick={openAdd} className="btn-gold"><Plus size={16} /> إضافة مصروف</button>
        </div>
      </div>

      {/* Total + category breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-navy rounded-2xl p-5 text-white md:col-span-1">
          <p className="text-white/60 text-xs">إجمالي المصروفات</p>
          <p className="text-3xl font-black mt-1">{fmt(total)} <span className="text-sm font-medium">ج.م</span></p>
        </div>
        {byCategory.filter(c => c.total > 0).slice(0, 3).map(c => (
          <div key={c.cat} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">{c.cat}</p>
            <p className="text-xl font-black text-navy-900 mt-1">{fmt(c.total)} <span className="text-xs font-medium">ج.م</span></p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-navy-700" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Receipt size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-medium">لا توجد مصروفات مسجلة</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full data-table min-w-[800px]">
            <thead>
              <tr><th>رقم المصروف</th><th>الاسم</th><th>الفئة</th><th>المبلغ</th><th>التاريخ</th><th>ملاحظات</th><th>إجراءات</th></tr>
            </thead>
            <tbody>
              {items.map(e => (
                <tr key={e.id}>
                  <td className="font-mono text-xs text-gray-500">#{e.id.slice(0, 8)}</td>
                  <td className="font-semibold text-gray-800">{e.name}</td>
                  <td><span className={`badge ${catColors[e.category]}`}>{e.category}</span></td>
                  <td className="font-bold text-red-600">{fmt(e.amount)} ج.م</td>
                  <td className="text-gray-500 text-sm">{new Date(e.expense_date).toLocaleDateString('ar-EG')}</td>
                  <td className="text-gray-400 text-sm max-w-[200px] truncate">{e.notes || '—'}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(e)} title="تعديل" className="p-1.5 rounded-lg hover:bg-gold-50 text-gold-600"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(e.id)} title="حذف" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>
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
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fadeIn">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-navy-900">{editId ? 'تعديل المصروف' : 'إضافة مصروف'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">اسم المصروف <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" placeholder="مثال: راتب يونيو" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">الفئة</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })} className="form-input">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">المبلغ (ج.م) <span className="text-red-500">*</span></label>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="form-input" placeholder="5000" />
                </div>
              </div>
              <div>
                <label className="form-label">التاريخ</label>
                <input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} className="form-input" />
              </div>
              <div>
                <label className="form-label">ملاحظات</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-input min-h-[60px] resize-none" placeholder="ملاحظات إضافية" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-outline">إلغاء</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.amount} className="btn-gold">{saving ? 'جارٍ الحفظ...' : 'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
