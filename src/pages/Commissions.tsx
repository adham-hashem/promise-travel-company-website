import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, CheckCircle2, Clock, DollarSign, X, Calculator } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { EmployeeCommission, Employee, Booking } from '../types';
import { exportToExcel } from '../lib/export';

const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');

interface CommRow extends EmployeeCommission {}

export default function Commissions() {
  const [items, setItems] = useState<CommRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [calc, setCalc] = useState({ employeeId: '', rate: '5', period: new Date().toISOString().slice(0, 7) });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: commData }, { data: empData }, { data: bkData }] = await Promise.all([
        supabase.from('employee_commissions').select('*, user_profiles(*)').order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('*').eq('status', 'نشط'),
        supabase.from('bookings').select('*'),
      ]);
      setItems((commData as CommRow[]) || []);
      setEmployees((empData as Employee[]) || []);
      setBookings((bkData as Booking[]) || []);
      setLoading(false);
    })();
  }, []);

  // Auto-calculate commission for an employee based on their bookings
  const calculate = async () => {
    if (!calc.employeeId || !calc.rate) return;
    setSaving(true);
    const empBookings = bookings.filter(b => b.employee_id === calc.employeeId);
    const totalSales = empBookings.reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const rate = parseFloat(calc.rate);
    const commissionAmount = Math.round((totalSales * rate) / 100);
    const payload = {
      employee_id: calc.employeeId,
      bookings_count: empBookings.length,
      total_sales: totalSales,
      commission_rate: rate,
      commission_amount: commissionAmount,
      status: 'معلق' as const,
      period: calc.period,
    };
    const { data } = await supabase.from('employee_commissions').insert(payload).select('*, user_profiles(*)').single();
    if (data) setItems([data as CommRow, ...items]);
    setSaving(false); setShowModal(false);
    setCalc({ employeeId: '', rate: '5', period: new Date().toISOString().slice(0, 7) });
  };

  const markPaid = async (c: CommRow) => {
    await supabase.from('employee_commissions').update({ status: 'مدفوع' }).eq('id', c.id);
    setItems(items.map(x => x.id === c.id ? { ...x, status: 'مدفوع' } : x));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العمول؟')) return;
    await supabase.from('employee_commissions').delete().eq('id', id);
    setItems(items.filter(x => x.id !== id));
  };

  const totalCommission = items.reduce((s, c) => s + Number(c.commission_amount || 0), 0);
  const paidCommission = items.filter(c => c.status === 'مدفوع').reduce((s, c) => s + Number(c.commission_amount || 0), 0);
  const pendingCommission = totalCommission - paidCommission;

  const handleExport = () => {
    exportToExcel(items.map((c, i) => ({
      '#': i + 1, 'الموظف': c.user_profiles?.name || '—', 'عدد الحجوزات': c.bookings_count,
      'إجمالي المبيعات': c.total_sales, 'نسبة العمول': c.commission_rate + '%',
      'مبلغ العمول': c.commission_amount, 'الفترة': c.period || '', 'الحالة': c.status,
    })), 'عمولات_الموظفين');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">عمولات الموظفين</h2>
          <p className="section-subtitle">تتبع عمولات المبيعات للموظفين</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-outline">تصدير</button>
          <button onClick={() => setShowModal(true)} className="btn-gold"><Calculator size={16} /> حساب عمول</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-gray-500">إجمالي العمولات</p><p className="text-2xl font-black text-navy-900 mt-1">{fmt(totalCommission)} <span className="text-sm">ج.م</span></p></div>
            <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center text-navy-700"><DollarSign size={22} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-gray-500">المدفوع</p><p className="text-2xl font-black text-emerald-600 mt-1">{fmt(paidCommission)} <span className="text-sm">ج.م</span></p></div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><CheckCircle2 size={22} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-gray-500">المعلق</p><p className="text-2xl font-black text-amber-600 mt-1">{fmt(pendingCommission)} <span className="text-sm">ج.م</span></p></div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><Clock size={22} /></div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-navy-700" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Calculator size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-medium">لا توجد عمولات محسوبة</p>
          <p className="text-gray-400 text-sm mt-1">ابدأ بحساب عمول لموظف</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full data-table min-w-[900px]">
            <thead>
              <tr>
                <th>الموظف</th><th>عدد الحجوزات</th><th>إجمالي المبيعات</th>
                <th>نسبة العمول</th><th>مبلغ العمول</th><th>الفترة</th><th>الحالة</th><th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id}>
                  <td className="font-semibold text-gray-800">{c.user_profiles?.name || '—'}</td>
                  <td className="text-gray-600">{c.bookings_count}</td>
                  <td className="font-bold text-navy-900">{fmt(c.total_sales)} ج.م</td>
                  <td><span className="badge bg-gold-50 text-gold-700">{c.commission_rate}%</span></td>
                  <td className="font-black text-emerald-600">{fmt(c.commission_amount)} ج.م</td>
                  <td className="text-gray-500 text-sm">{c.period || '—'}</td>
                  <td>
                    <span className={`badge ${c.status === 'مدفوع' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {c.status === 'معلق' && (
                        <button onClick={() => markPaid(c)} title="تحديد كمدفوع" className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"><CheckCircle2 size={15} /></button>
                      )}
                      <button onClick={() => handleDelete(c.id)} title="حذف" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><RefreshCw size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calculate modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fadeIn">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-navy-900">حساب عمول جديد</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">الموظف <span className="text-red-500">*</span></label>
                <select value={calc.employeeId} onChange={(e) => setCalc({ ...calc, employeeId: e.target.value })} className="form-input">
                  <option value="">— اختر موظف —</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">نسبة العمول (%) <span className="text-red-500">*</span></label>
                  <input type="number" min="0" max="100" value={calc.rate} onChange={(e) => setCalc({ ...calc, rate: e.target.value })} className="form-input" placeholder="5" />
                </div>
                <div>
                  <label className="form-label">الفترة</label>
                  <input type="month" value={calc.period} onChange={(e) => setCalc({ ...calc, period: e.target.value })} className="form-input" />
                </div>
              </div>
              {calc.employeeId && (
                <div className="bg-navy-50 rounded-xl p-4 text-sm">
                  <p className="text-gray-600">عدد الحجوزات: <span className="font-bold text-navy-900">{bookings.filter(b => b.employee_id === calc.employeeId).length}</span></p>
                  <p className="text-gray-600 mt-1">إجمالي المبيعات: <span className="font-bold text-navy-900">{fmt(bookings.filter(b => b.employee_id === calc.employeeId).reduce((s, b) => s + Number(b.total_amount || 0), 0))} ج.م</span></p>
                  <p className="text-gray-600 mt-1">العمول المتوقع: <span className="font-black text-emerald-600">{fmt(Math.round(bookings.filter(b => b.employee_id === calc.employeeId).reduce((s, b) => s + Number(b.total_amount || 0), 0) * (parseFloat(calc.rate) / 100)))} ج.م</span></p>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-outline">إلغاء</button>
              <button onClick={calculate} disabled={saving || !calc.employeeId} className="btn-gold">{saving ? 'جارٍ الحساب...' : 'حساب وحفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
