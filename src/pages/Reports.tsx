import { useEffect, useState } from 'react';
import { FileDown, TrendingUp, Users, CalendarCheck, DollarSign, Loader2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { exportToExcel, exportToPDF } from '../lib/export';

const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const COLORS = ['#0c224f', '#c9941a', '#1e4a9e', '#e4b030', '#6b7280', '#10b981', '#ef4444'];

interface MonthlyDataRow {
  month: string;
  إيرادات: number;
  حجوزات: number;
  عملاء: number;
}

interface SourceDataRow {
  name: string;
  value: number;
}

interface EmployeePerfRow {
  name: string;
  target: number;
  achieved: number;
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [summaryCards, setSummaryCards] = useState([
    { label: 'إجمالي الإيرادات', value: '0 ج.م', sub: 'المبيعات المؤكدة', icon: DollarSign, color: 'bg-navy-800' },
    { label: 'إجمالي الحجوزات', value: '0', sub: 'جميع الحجوزات', icon: CalendarCheck, color: 'bg-gold-600' },
    { label: 'إجمالي العملاء', value: '0', sub: 'قاعدة العملاء', icon: Users, color: 'bg-emerald-600' },
    { label: 'متوسط قيمة الحجز', value: '0 ج.م', sub: 'لكل حجز مؤكد', icon: TrendingUp, color: 'bg-purple-600' },
  ]);
  const [monthlySales, setMonthlySales] = useState<MonthlyDataRow[]>([]);
  const [sourceData, setSourceData] = useState<SourceDataRow[]>([]);
  const [employeePerf, setEmployeePerf] = useState<EmployeePerfRow[]>([]);

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    setLoading(true);
    const [bookingsRes, customersRes, employeesRes] = await Promise.all([
      supabase.from('bookings').select('id, status, total_amount, booking_date, created_at, employee_id'),
      supabase.from('customers').select('id, source, created_at'),
      supabase.from('employees').select('id, name, target_percentage, bookings_count, is_active'),
    ]);

    const bookings = (bookingsRes.data as Array<{ id: string; status: string; total_amount: number | null; booking_date: string; created_at: string; employee_id: string | null }>) || [];
    const customers = (customersRes.data as Array<{ id: string; source: string | null; created_at: string }>) || [];
    const employees = (employeesRes.data as Array<{ id: string; name: string; target_percentage: number; bookings_count: number; is_active: boolean }>) || [];

    // Financial & totals summary
    const confirmedBookings = bookings.filter((b) => b.status === 'مؤكد');
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
    const totalBookingsCount = bookings.length;
    const totalCustomersCount = customers.length;
    const avgBookingValue = confirmedBookings.length > 0 ? Math.round(totalRevenue / confirmedBookings.length) : 0;

    const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');

    setSummaryCards([
      { label: 'إجمالي الإيرادات', value: `${fmt(totalRevenue)} ج.م`, sub: `${confirmedBookings.length} حجز مؤكد`, icon: DollarSign, color: 'bg-navy-800' },
      { label: 'إجمالي الحجوزات', value: String(totalBookingsCount), sub: `${confirmedBookings.length} مؤكد`, icon: CalendarCheck, color: 'bg-gold-600' },
      { label: 'إجمالي العملاء', value: String(totalCustomersCount), sub: 'مسجل بالنظام', icon: Users, color: 'bg-emerald-600' },
      { label: 'متوسط قيمة الحجز', value: `${fmt(avgBookingValue)} ج.م`, sub: 'لكل حجز مؤكد', icon: TrendingUp, color: 'bg-purple-600' },
    ]);

    // Monthly breakdown
    const monthlyMap = new Map<number, { revenue: number; bookings: number; customers: number }>();
    for (let i = 0; i < 12; i++) {
      monthlyMap.set(i, { revenue: 0, bookings: 0, customers: 0 });
    }

    bookings.forEach((b) => {
      const dt = new Date(b.booking_date || b.created_at);
      if (!isNaN(dt.getTime())) {
        const m = dt.getMonth();
        const cur = monthlyMap.get(m)!;
        cur.bookings += 1;
        if (b.status === 'مؤكد') {
          cur.revenue += Number(b.total_amount || 0);
        }
      }
    });

    customers.forEach((c) => {
      const dt = new Date(c.created_at);
      if (!isNaN(dt.getTime())) {
        const m = dt.getMonth();
        const cur = monthlyMap.get(m)!;
        cur.customers += 1;
      }
    });

    const mData: MonthlyDataRow[] = Array.from(monthlyMap.entries()).map(([mIndex, val]) => ({
      month: monthNames[mIndex],
      إيرادات: val.revenue,
      حجوزات: val.bookings,
      عملاء: val.customers,
    }));
    setMonthlySales(mData);

    // Customer source breakdown
    const srcMap = new Map<string, number>();
    customers.forEach((c) => {
      const src = c.source || 'أخرى';
      srcMap.set(src, (srcMap.get(src) || 0) + 1);
    });

    const totalCustCount = customers.length || 1;
    const sData: SourceDataRow[] = Array.from(srcMap.entries()).map(([name, count]) => ({
      name,
      value: Math.round((count / totalCustCount) * 100),
    }));
    setSourceData(sData.length > 0 ? sData : [{ name: 'لا يوجد بيانات', value: 100 }]);

    // Employee performance breakdown
    const empBookingsCount = new Map<string, number>();
    bookings.forEach((b) => {
      if (b.employee_id) {
        empBookingsCount.set(b.employee_id, (empBookingsCount.get(b.employee_id) || 0) + 1);
      }
    });

    const perfData: EmployeePerfRow[] = employees.map((e) => ({
      name: e.name,
      target: e.target_percentage || 0,
      achieved: empBookingsCount.get(e.id) || e.bookings_count || 0,
    }));

    setEmployeePerf(perfData);
    setLoading(false);
  };

  const handleExportExcel = () => {
    const reportRows = monthlySales.map((m, i) => ({
      '#': i + 1,
      'الشهر': m.month,
      'الإيرادات (ج.م)': m.إيرادات,
      'عدد الحجوزات': m.حجوزات,
      'عدد العملاء الجدد': m.عملاء,
    }));
    exportToExcel(reportRows, 'تقرير_الأداء_الشهري');
  };

  const handleExportPDF = () => {
    const tableHTML = `
      <table>
        <thead>
          <tr>
            <th>الشهر</th>
            <th>الإيرادات (ج.م)</th>
            <th>عدد الحجوزات</th>
            <th>عدد العملاء</th>
          </tr>
        </thead>
        <tbody>
          ${monthlySales.map((m) => `
            <tr>
              <td>${m.month}</td>
              <td>${m.إيرادات.toLocaleString('ar-EG')} ج.م</td>
              <td>${m.حجوزات}</td>
              <td>${m.عملاء}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    exportToPDF('تقرير الأداء الشهري للشركة', tableHTML);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-navy-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">التقارير والإحصاءات</h2>
          <p className="section-subtitle">تقارير تفصيلية عن أداء الشركة مأخوذة مباشرة من قاعدة البيانات</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportExcel} className="btn-outline text-sm py-2 px-4">
            <FileDown size={15} />
            Excel
          </button>
          <button onClick={handleExportPDF} className="btn-gold text-sm py-2 px-4">
            <FileDown size={15} />
            PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${c.color} flex items-center justify-center`}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-xs font-semibold text-gray-500">{c.label}</p>
              </div>
              <p className="text-2xl font-black text-navy-900 leading-tight">{c.value}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">{c.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-bold text-navy-900 mb-5">تقرير الإيرادات الشهرية</h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={monthlySales}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0c224f" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0c224f" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#6b7280' }} />
            <Tooltip
              formatter={(v) => [`${Number(v).toLocaleString('ar-EG')} ج.م`, 'الإيرادات']}
              contentStyle={{ fontFamily: 'Cairo', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            />
            <Area type="monotone" dataKey="إيرادات" stroke="#0c224f" strokeWidth={2.5} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Customers + Bookings Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-navy-900 mb-5">العملاء والحجوزات شهرياً</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlySales} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#6b7280' }} />
              <Tooltip contentStyle={{ fontFamily: 'Cairo', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Legend wrapperStyle={{ fontFamily: 'Cairo', fontSize: '12px' }} />
              <Bar dataKey="عملاء" fill="#0c224f" radius={[4, 4, 0, 0]} />
              <Bar dataKey="حجوزات" fill="#c9941a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Source Pie */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-navy-900 mb-5">مصادر العملاء</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="60%" height={180}>
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                  {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontFamily: 'Cairo', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {sourceData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600">{d.name}</span>
                  </div>
                  <span className="font-bold text-gray-800">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Employee Performance Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-bold text-navy-900 mb-5">تقرير أداء الموظفين</h3>
        {employeePerf.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">لا يوجد موظفون مسجلون حالياً</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>الموظف</th>
                  <th>نسبة تحقيق الهدف</th>
                  <th>عدد الحجوزات</th>
                  <th>المؤشر</th>
                </tr>
              </thead>
              <tbody>
                {employeePerf.map((e, i) => (
                  <tr key={i}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center text-navy-700 font-bold text-xs">{i + 1}</div>
                        <span className="font-semibold">{e.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-32">
                          <div
                            className={`h-full rounded-full ${e.target >= 80 ? 'bg-emerald-500' : e.target >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, e.target))}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-800">{e.target}%</span>
                      </div>
                    </td>
                    <td className="font-semibold text-gray-800">{e.achieved}</td>
                    <td>
                      <span className={`badge ${e.target >= 80 ? 'bg-emerald-100 text-emerald-700' : e.target >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {e.target >= 80 ? 'ممتاز' : e.target >= 60 ? 'جيد' : 'يحتاج تحسين'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

