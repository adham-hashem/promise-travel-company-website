import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, Wallet, Clock, Download, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Booking, Customer, Package } from '../types';
import { exportToExcel } from '../lib/export';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface RevenueRow extends Booking {
  customers?: Customer;
  packages?: Package;
}

const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');

export default function Revenue() {
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('monthly');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, customers(*), packages(*)')
        .order('created_at', { ascending: false });
      setRows((data as RevenueRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (period === 'daily') start.setDate(now.getDate() - 1);
    else if (period === 'weekly') start.setDate(now.getDate() - 7);
    else if (period === 'monthly') start.setMonth(now.getMonth() - 1);
    else if (period === 'yearly') start.setFullYear(now.getFullYear() - 1);
    return rows.filter(r => new Date(r.created_at) >= start);
  }, [rows, period]);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const paid = filtered.reduce((s, r) => s + Number(r.paid_amount || 0), 0);
    return { total, paid, remaining: total - paid };
  }, [filtered]);

  const handleExport = () => {
    const data = filtered.map((r, i) => ({
      '#': i + 1,
      'العميل': r.customers?.name || '—',
      'الخدمة': r.packages?.type || '—',
      'رقم الحجز': r.id.slice(0, 8),
      'الإجمالي': Number(r.total_amount || 0),
      'المدفوع': Number(r.paid_amount || 0),
      'المتبقي': Number(r.total_amount || 0) - Number(r.paid_amount || 0),
      'التاريخ': new Date(r.created_at).toLocaleDateString('ar-EG'),
    }));
    exportToExcel(data, `الإيرادات_${period}`);
  };

  const periods: { id: Period; label: string }[] = [
    { id: 'daily', label: 'يومي' },
    { id: 'weekly', label: 'أسبوعي' },
    { id: 'monthly', label: 'شهري' },
    { id: 'yearly', label: 'سنوي' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">الإيرادات</h2>
          <p className="section-subtitle">إجمالي إيرادات الشركة من الحج والعمرة والرحلات الداخلية</p>
        </div>
        <button onClick={handleExport} className="btn-outline"><Download size={16} /> تصدير Excel</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">إجمالي الإيرادات</p>
              <p className="text-2xl font-black text-navy-900 mt-1">{fmt(totals.total)} <span className="text-sm font-medium">ج.م</span></p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center text-navy-700"><TrendingUp size={22} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">المبلغ المدفوع</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{fmt(totals.paid)} <span className="text-sm font-medium">ج.م</span></p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><Wallet size={22} /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">المبلغ المتبقي</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{fmt(totals.remaining)} <span className="text-sm font-medium">ج.م</span></p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><Clock size={22} /></div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {periods.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${period === p.id ? 'bg-navy-800 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:border-navy-300'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={28} className="animate-spin text-navy-700" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
          <table className="w-full data-table min-w-[1000px]">
            <thead>
              <tr>
                <th>رقم العملية</th>
                <th>اسم العميل</th>
                <th>نوع الخدمة</th>
                <th>رقم الحجز</th>
                <th>الإجمالي</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
                <th>تاريخ الدفع</th>
                <th>طريقة الدفع</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-gray-400 py-10">لا توجد إيرادات في هذه الفترة</td></tr>
              ) : filtered.map((r) => {
                const remaining = Number(r.total_amount || 0) - Number(r.paid_amount || 0);
                return (
                  <tr key={r.id}>
                    <td className="font-mono text-xs text-gray-500">#{r.id.slice(0, 8)}</td>
                    <td className="font-semibold text-gray-800">{r.customers?.name || '—'}</td>
                    <td><span className="badge bg-navy-50 text-navy-700">{r.packages?.type || '—'}</span></td>
                    <td className="font-mono text-xs text-gray-500">{r.id.slice(0, 8)}</td>
                    <td className="font-bold text-navy-900">{fmt(Number(r.total_amount || 0))}</td>
                    <td className="text-emerald-600 font-semibold">{fmt(Number(r.paid_amount || 0))}</td>
                    <td className="text-amber-600 font-semibold">{fmt(remaining)}</td>
                    <td className="text-gray-500 text-sm">{new Date(r.booking_date).toLocaleDateString('ar-EG')}</td>
                    <td className="text-gray-500 text-sm">{r.payment_status || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
