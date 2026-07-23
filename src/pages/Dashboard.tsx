import { useEffect, useState } from 'react';
import {
  Users, UserPlus, CalendarCheck, Clock, XCircle, TrendingUp,
  ArrowUpRight, Star, Phone, Calendar, Wallet, TrendingDown,
  Plane, ClipboardList, DollarSign, Package, Award, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { supabase } from '../lib/supabase';

const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const COLORS = ['#c9941a', '#0c224f', '#16a34a', '#0891b2', '#dc2626', '#7c3aed'];

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCustomers: 0, newClients: 0, confirmed: 0, pending: 0,
    cancelled: 0, revenue: 0, expenses: 0, cost: 0, netProfit: 0,
  });
  const [employees, setEmployees] = useState<{ name: string; target_percentage: number; bookings_count: number }[]>([]);
  const [internalStats, setInternalStats] = useState({ activeTrips: 0, currentBookings: 0, revenue: 0 });
  const [topPackage, setTopPackage] = useState<{ name: string; count: number } | null>(null);
  const [topSource, setTopSource] = useState<{ source: string; count: number } | null>(null);
  const [bookingTypeData, setBookingTypeData] = useState<{ name: string; value: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; مبيعات: number; مصروفات: number; أرباح: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [custRes, bookRes, empRes, itRes, itbRes, expRes, pkgRes] = await Promise.all([
        supabase.from('customers').select('status, created_at, source, service_type'),
        supabase.from('bookings').select('status, total_amount, booking_date, package_id, payment_status, package:packages(name, cost_price)'),
        supabase.from('employees').select('name, target_percentage, bookings_count').order('target_percentage', { ascending: false }).limit(5),
        supabase.from('internal_trips').select('status'),
        supabase.from('internal_trip_bookings').select('booking_status, total_amount'),
        supabase.from('expenses').select('amount, expense_date, category'),
        supabase.from('packages').select('id, name'),
      ]);

      const customers = (custRes.data as Array<{ status: string; created_at: string; source: string | null; service_type: string | null }>) || [];
      const bookings = (bookRes.data as Array<{ status: string; total_amount: number | null; booking_date: string; package_id: string | null; payment_status: string; package: { name: string; cost_price: number | null } | null }>) || [];
      const expenses = (expRes.data as Array<{ amount: number; expense_date: string; category: string }>) || [];

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const totalRevenue = bookings.filter((b) => b.status === 'مؤكد').reduce((s, b) => s + Number(b.total_amount || 0), 0);
      const totalCost = bookings.filter((b) => b.status === 'مؤكد').reduce((s, b) => s + Number(b.package?.cost_price || 0), 0);
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

      setStats({
        totalCustomers: customers.length,
        newClients: customers.filter((c) => new Date(c.created_at) >= weekAgo).length,
        confirmed: bookings.filter((b) => b.status === 'مؤكد').length,
        pending: bookings.filter((b) => b.status === 'معلق').length,
        cancelled: bookings.filter((b) => b.status === 'ملغي').length,
        revenue: totalRevenue,
        expenses: totalExpenses,
        cost: totalCost,
        netProfit: totalRevenue - totalCost - totalExpenses,
      });

      if (empRes.data) setEmployees(empRes.data as { name: string; target_percentage: number; bookings_count: number }[]);
      if (itRes.data && itbRes.data) {
        setInternalStats({
          activeTrips: (itRes.data as Array<{ status: string }>).filter((t) => t.status === 'متاحة').length,
          currentBookings: (itbRes.data as Array<{ booking_status: string }>).filter((b) => b.booking_status === 'جديدة' || b.booking_status === 'مؤكدة').length,
          revenue: (itbRes.data as Array<{ booking_status: string; total_amount: number | null }>).filter((b) => b.booking_status === 'مؤكدة' || b.booking_status === 'مكتملة').reduce((s, b) => s + Number(b.total_amount || 0), 0),
        });
      }

      // Top package
      const pkgCounts = new Map<string, number>();
      bookings.forEach((b) => {
        if (b.package?.name) pkgCounts.set(b.package.name, (pkgCounts.get(b.package.name) || 0) + 1);
      });
      const topPkg = Array.from(pkgCounts.entries()).sort((a, b) => b[1] - a[1])[0];
      if (topPkg) setTopPackage({ name: topPkg[0], count: topPkg[1] });

      // Top source
      const srcCounts = new Map<string, number>();
      customers.forEach((c) => {
        if (c.source) srcCounts.set(c.source, (srcCounts.get(c.source) || 0) + 1);
      });
      const topSrc = Array.from(srcCounts.entries()).sort((a, b) => b[1] - a[1])[0];
      if (topSrc) setTopSource({ source: topSrc[0], count: topSrc[1] });

      // Booking type distribution
      const typeMap = new Map<string, number>();
      customers.forEach((c) => {
        if (c.service_type) typeMap.set(c.service_type, (typeMap.get(c.service_type) || 0) + 1);
      });
      setBookingTypeData(Array.from(typeMap.entries()).map(([name, value]) => ({ name, value })));

      // Monthly data
      const monthMap = new Map<number, { sales: number; expenses: number }>();
      bookings.forEach((b) => {
        const m = new Date(b.booking_date).getMonth();
        const row = monthMap.get(m) || { sales: 0, expenses: 0 };
        row.sales += Number(b.total_amount || 0);
        monthMap.set(m, row);
      });
      expenses.forEach((e) => {
        const m = new Date(e.expense_date).getMonth();
        const row = monthMap.get(m) || { sales: 0, expenses: 0 };
        row.expenses += Number(e.amount || 0);
        monthMap.set(m, row);
      });
      setMonthlyData(
        Array.from(monthMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([m, r]) => ({
            month: monthNames[m],
            مبيعات: r.sales,
            مصروفات: r.expenses,
            أرباح: r.sales - r.expenses,
          }))
      );

      setLoading(false);
    }
    load();
  }, []);

  const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');

  const statCards = [
    { label: 'إجمالي العملاء', value: String(stats.totalCustomers), icon: Users, color: 'from-navy-800 to-navy-600' },
    { label: 'العملاء الجدد', value: String(stats.newClients), icon: UserPlus, color: 'from-emerald-700 to-emerald-500' },
    { label: 'الحجوزات المؤكدة', value: String(stats.confirmed), icon: CalendarCheck, color: 'from-gold-700 to-gold-500' },
    { label: 'الحجوزات المعلقة', value: String(stats.pending), icon: Clock, color: 'from-orange-600 to-orange-400' },
    { label: 'إجمالي الإيرادات', value: fmt(stats.revenue) + ' ج.م', icon: TrendingUp, color: 'from-teal-700 to-teal-500' },
    { label: 'صافي الأرباح', value: fmt(stats.netProfit) + ' ج.م', icon: Wallet, color: 'from-emerald-800 to-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`bg-gradient-to-br ${card.color} rounded-2xl p-5 text-white shadow-lg`}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Icon size={20} className="text-white" />
                </div>
                <ArrowUpRight size={16} className="text-white/60" />
              </div>
              <p className="text-white/80 text-xs font-medium mb-1 leading-tight">{card.label}</p>
              <p className="text-2xl font-black leading-tight">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Financial summary + highlights */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-gradient-navy rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-gold-400" />
              <h3 className="text-white font-bold text-sm">الملخص المالي</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-emerald-300" /><span className="text-xs text-white/60 font-bold">الإيرادات</span></div>
              <p className="text-2xl font-black text-white">{fmt(stats.revenue)}</p><p className="text-[10px] text-white/40">ج.م</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><TrendingDown size={16} className="text-orange-300" /><span className="text-xs text-white/60 font-bold">التكلفة</span></div>
              <p className="text-2xl font-black text-white">{fmt(stats.cost)}</p><p className="text-[10px] text-white/40">ج.م</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><Wallet size={16} className="text-red-300" /><span className="text-xs text-white/60 font-bold">المصروفات</span></div>
              <p className="text-2xl font-black text-white">{fmt(stats.expenses)}</p><p className="text-[10px] text-white/40">ج.م</p>
            </div>
            <div className="bg-gold-400/20 rounded-xl p-4 border border-gold-400/30">
              <div className="flex items-center gap-2 mb-2"><Award size={16} className="text-gold-300" /><span className="text-xs text-white/60 font-bold">صافي الربح</span></div>
              <p className="text-2xl font-black text-gold-300">{fmt(stats.netProfit)}</p><p className="text-[10px] text-white/40">ج.م</p>
            </div>
          </div>
        </div>

        {/* Highlights */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-navy-900 text-sm mb-4 flex items-center gap-2"><Star size={16} className="text-gold-500" />أبرز المؤشرات</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-navy-50 rounded-xl">
              <span className="text-xs text-gray-600 flex items-center gap-2"><Award size={14} className="text-gold-600" />أفضل موظف</span>
              <span className="text-sm font-bold text-navy-900">{employees[0]?.name || '—'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
              <span className="text-xs text-gray-600 flex items-center gap-2"><Package size={14} className="text-emerald-600" />أعلى باقة</span>
              <span className="text-sm font-bold text-navy-900">{topPackage?.name || '—'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
              <span className="text-xs text-gray-600 flex items-center gap-2"><BarChart3 size={14} className="text-blue-600" />أفضل مصدر</span>
              <span className="text-sm font-bold text-navy-900">{topSource?.source || '—'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
              <span className="text-xs text-gray-600 flex items-center gap-2"><Plane size={14} className="text-amber-600" />رحلات نشطة</span>
              <span className="text-sm font-bold text-navy-900">{internalStats.activeTrips}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-base font-bold text-navy-900 mb-1">المبيعات مقابل المصروفات</h3>
          <p className="text-xs text-gray-500 mb-5">التحليل الشهري</p>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#6b7280' }} />
                <Tooltip formatter={(v) => `${Number(v).toLocaleString('ar-EG')} ج.م`} contentStyle={{ fontFamily: 'Cairo', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Legend wrapperStyle={{ fontFamily: 'Cairo', fontSize: 12 }} />
                <Bar dataKey="مبيعات" fill="#0c224f" radius={[6, 6, 0, 0]} />
                <Bar dataKey="مصروفات" fill="#ea580c" radius={[6, 6, 0, 0]} />
                <Bar dataKey="أرباح" fill="#16a34a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-gray-300 text-sm">لا توجد بيانات</div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-base font-bold text-navy-900 mb-1">توزيع العملاء</h3>
          <p className="text-xs text-gray-500 mb-4">حسب نوع الخدمة</p>
          {bookingTypeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={bookingTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {bookingTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} عميل`, '']} contentStyle={{ fontFamily: 'Cairo', borderRadius: '12px', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {bookingTypeData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-700 font-medium">{d.name}</span>
                    </div>
                    <span className="font-bold text-gray-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-300 text-sm">لا توجد بيانات</div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Employees */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <Star size={18} className="text-gold-500" />
            <h3 className="text-base font-bold text-navy-900">أفضل الموظفين</h3>
          </div>
          <div className="space-y-4">
            {(employees.length ? employees : [
              { name: 'نور الدين عمر', target_percentage: 92.1, bookings_count: 41 },
              { name: 'أحمد محمد السيد', target_percentage: 87.5, bookings_count: 32 },
              { name: 'فاطمة علي حسن', target_percentage: 75.0, bookings_count: 27 },
              { name: 'محمود إبراهيم', target_percentage: 62.3, bookings_count: 19 },
            ]).map((emp, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gold-100 flex items-center justify-center text-gold-700 font-bold text-xs">{i + 1}</div>
                    <span className="text-sm font-semibold text-gray-800">{emp.name}</span>
                  </div>
                  <span className="text-xs font-bold text-navy-700">{emp.target_percentage}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-l from-gold-500 to-gold-300 transition-all duration-500" style={{ width: `${emp.target_percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Internal Tourism */}
        <div className="bg-gradient-navy rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Plane size={18} className="text-gold-400" />
              <h3 className="text-white font-bold text-sm">الرحلات الداخلية</h3>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2"><Plane size={18} className="text-gold-300" /><span className="text-xs text-white/60 font-bold">رحلات نشطة</span></div>
              <p className="text-3xl font-black text-white">{internalStats.activeTrips}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2"><ClipboardList size={18} className="text-emerald-300" /><span className="text-xs text-white/60 font-bold">حجوزات</span></div>
              <p className="text-3xl font-black text-white">{internalStats.currentBookings}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2"><DollarSign size={18} className="text-gold-300" /><span className="text-xs text-white/60 font-bold">الإيرادات</span></div>
              <p className="text-2xl font-black text-white">{fmt(internalStats.revenue)}</p><p className="text-[10px] text-white/40">ج.م</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
