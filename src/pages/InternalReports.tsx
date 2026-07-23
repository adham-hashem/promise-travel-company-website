import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plane, ClipboardList, Users, DollarSign, Loader2, FileSpreadsheet, FileText,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { exportToCSV, exportToPDF } from '../lib/export';
import type { InternalTrip, InternalTripBooking, InternalCustomer } from '../types';

type Period = 'weekly' | 'monthly' | 'yearly';

const PIE_COLORS = ['#0c224f', '#c9941a', '#10b981', '#ef4444'];

const periodLabel: Record<Period, string> = {
  weekly: 'أسبوعي',
  monthly: 'شهري',
  yearly: 'سنوي',
};

function periodStart(period: Period): Date {
  const now = new Date();
  if (period === 'weekly') {
    const d = new Date(now); d.setDate(now.getDate() - 7); return d;
  }
  if (period === 'monthly') return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getFullYear(), 0, 1);
}

export default function InternalReports() {
  const [trips, setTrips] = useState<InternalTrip[]>([]);
  const [bookings, setBookings] = useState<InternalTripBooking[]>([]);
  const [customers, setCustomers] = useState<InternalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('monthly');

  const load = useCallback(async () => {
    setLoading(true);
    const [tr, bk, cu] = await Promise.all([
      supabase.from('internal_trips').select('*').order('created_at', { ascending: false }),
      supabase.from('internal_trip_bookings').select('*, internal_trips(*)').order('created_at', { ascending: false }),
      supabase.from('internal_customers').select('*').order('created_at', { ascending: false }),
    ]);
    setTrips((tr.data as InternalTrip[]) || []);
    setBookings((bk.data as InternalTripBooking[]) || []);
    setCustomers((cu.data as InternalCustomer[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const start = periodStart(period);
    const fTrips = trips.filter((t) => new Date(t.created_at) >= start);
    const fBookings = bookings.filter((b) => new Date(b.created_at) >= start);
    const fCustomers = customers.filter((c) => new Date(c.created_at) >= start);
    const revenue = fBookings
      .filter((b) => b.booking_status === 'مؤكدة' || b.booking_status === 'مكتملة')
      .reduce((s, b) => s + (b.total_amount ?? 0), 0);
    return {
      totalTrips: fTrips.length,
      totalBookings: fBookings.length,
      totalCustomers: fCustomers.length,
      revenue,
    };
  }, [trips, bookings, customers, period]);

  const statusChart = useMemo(() => {
    const start = periodStart(period);
    const map = new Map<string, number>();
    bookings
      .filter((b) => new Date(b.created_at) >= start)
      .forEach((b) => map.set(b.booking_status, (map.get(b.booking_status) || 0) + 1));
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [bookings, period]);

  const paymentChart = useMemo(() => {
    const start = periodStart(period);
    const map = new Map<string, number>();
    bookings
      .filter((b) => new Date(b.created_at) >= start)
      .forEach((b) => map.set(b.payment_status, (map.get(b.payment_status) || 0) + 1));
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [bookings, period]);

  const topTrips = useMemo(() => {
    const start = periodStart(period);
    const map = new Map<string, { name: string; bookings: number; revenue: number }>();
    bookings
      .filter((b) => new Date(b.created_at) >= start)
      .forEach((b) => {
        const name = b.internal_trips?.name || 'بدون رحلة';
        const cur = map.get(b.trip_id || name) || { name, bookings: 0, revenue: 0 };
        cur.bookings += 1;
        cur.revenue += b.total_amount ?? 0;
        map.set(b.trip_id || name, cur);
      });
    return Array.from(map.values()).sort((a, b) => b.bookings - a.bookings).slice(0, 5);
  }, [bookings, period]);

  const handleExportExcel = () => {
    const start = periodStart(period);
    const rows = bookings
      .filter((b) => new Date(b.created_at) >= start)
      .map((b) => [
        `#${b.id.slice(0, 8)}`,
        b.customer_name,
        b.phone || '',
        b.internal_trips?.name || '',
        b.travelers_count,
        b.booking_status,
        b.payment_status,
        b.total_amount ?? 0,
        b.paid_amount ?? 0,
        new Date(b.created_at).toLocaleDateString('ar-EG'),
      ]);
    exportToCSV(
      `تقرير_الرحلات_${periodLabel[period]}`,
      ['رقم الحجز', 'العميل', 'الهاتف', 'الرحلة', 'المسافرون', 'الحالة', 'الدفع', 'الإجمالي', 'المدفوع', 'التاريخ'],
      rows,
    );
  };

  const handleExportPDF = () => {
    const start = periodStart(period);
    const rowsHtml = bookings
      .filter((b) => new Date(b.created_at) >= start)
      .map((b) => `<tr>
        <td>#${b.id.slice(0, 8)}</td>
        <td>${b.customer_name}</td>
        <td>${b.phone || ''}</td>
        <td>${b.internal_trips?.name || ''}</td>
        <td>${b.travelers_count}</td>
        <td>${b.booking_status}</td>
        <td>${b.payment_status}</td>
        <td>${(b.total_amount ?? 0).toLocaleString('ar-EG')}</td>
        <td>${(b.paid_amount ?? 0).toLocaleString('ar-EG')}</td>
      </tr>`).join('');
    exportToPDF(
      `تقرير الرحلات الداخلية — ${periodLabel[period]}`,
      `<table>
        <thead><tr>
          <th>رقم الحجز</th><th>العميل</th><th>الهاتف</th><th>الرحلة</th>
          <th>المسافرون</th><th>الحالة</th><th>الدفع</th><th>الإجمالي</th><th>المدفوع</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`,
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">تقارير الرحلات الداخلية</h2>
          <p className="section-subtitle">إحصائيات وأداء الرحلات والحجوزات</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white rounded-xl p-1.5 border border-gray-200">
            {(['weekly', 'monthly', 'yearly'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === p ? 'bg-navy-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {periodLabel[p]}
              </button>
            ))}
          </div>
          <button onClick={handleExportExcel} className="btn-outline text-xs py-2 px-3">
            <FileSpreadsheet size={14} />Excel
          </button>
          <button onClick={handleExportPDF} className="btn-outline text-xs py-2 px-3">
            <FileText size={14} />PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-navy-700" />
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <Plane size={20} className="text-navy-600" />
                <span className="text-xs text-gray-400 font-bold">رحلات</span>
              </div>
              <p className="text-3xl font-black text-navy-900">{stats.totalTrips}</p>
              <p className="text-xs text-gray-400 mt-1">إجمالي الرحلات ({periodLabel[period]})</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <ClipboardList size={20} className="text-gold-600" />
                <span className="text-xs text-gray-400 font-bold">حجوزات</span>
              </div>
              <p className="text-3xl font-black text-navy-900">{stats.totalBookings}</p>
              <p className="text-xs text-gray-400 mt-1">إجمالي الحجوزات</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <Users size={20} className="text-purple-600" />
                <span className="text-xs text-gray-400 font-bold">عملاء</span>
              </div>
              <p className="text-3xl font-black text-navy-900">{stats.totalCustomers}</p>
              <p className="text-xs text-gray-400 mt-1">عملاء جدد</p>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <DollarSign size={20} className="text-emerald-600" />
                <span className="text-xs text-gray-400 font-bold">إيرادات</span>
              </div>
              <p className="text-2xl font-black text-navy-900">{stats.revenue.toLocaleString('ar-EG')}</p>
              <p className="text-xs text-gray-400 mt-1">ج.م</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-base font-bold text-navy-900 mb-5">حالات الحجوزات</h3>
              {statusChart.length === 0 ? (
                <p className="text-center text-gray-400 py-10">لا توجد بيانات</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={statusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {statusChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontFamily: 'Cairo', borderRadius: '12px', border: 'none' }} />
                    <Legend wrapperStyle={{ fontFamily: 'Cairo', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-base font-bold text-navy-900 mb-5">حالات الدفع</h3>
              {paymentChart.length === 0 ? (
                <p className="text-center text-gray-400 py-10">لا توجد بيانات</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={paymentChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {paymentChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[(i + 1) % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontFamily: 'Cairo', borderRadius: '12px', border: 'none' }} />
                    <Legend wrapperStyle={{ fontFamily: 'Cairo', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top trips chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-base font-bold text-navy-900 mb-5">أكثر الرحلات حجزاً</h3>
            {topTrips.length === 0 ? (
              <p className="text-center text-gray-400 py-10">لا توجد بيانات</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topTrips} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#6b7280' }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ fontFamily: 'Cairo', borderRadius: '12px', border: 'none' }} />
                  <Legend wrapperStyle={{ fontFamily: 'Cairo', fontSize: 12 }} />
                  <Bar dataKey="bookings" name="حجوزات" fill="#c9941a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}
