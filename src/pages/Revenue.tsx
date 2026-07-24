import { useEffect, useState } from 'react';
import { TrendingUp, Wallet, BarChart3, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const COLORS = ['#c9941a', '#0c224f', '#16a34a', '#0891b2', '#7c3aed', '#dc2626'];

const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');

export default function Revenue() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalRevenue: 0, thisMonth: 0, lastMonth: 0, growth: 0 });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [typeData, setTypeData] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      // Fetch actual payments that are completed
      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount, payment_date, payment_type')
        .in('status', ['مكتمل', 'معتمد']);

      if (error) {
        console.error(error);
        alert('خطأ في جلب الإيرادات');
      }

      const pays = (payments || []).map(p => ({
        amount: Number(p.amount),
        date: new Date(p.payment_date),
        type: p.payment_type || 'أخرى'
      }));

      // Calculate totals
      const totalRevenue = pays.reduce((s, p) => s + p.amount, 0);
      
      const now = new Date();
      const thisMonthPays = pays.filter(p => p.date.getMonth() === now.getMonth() && p.date.getFullYear() === now.getFullYear());
      const lastMonthPays = pays.filter(p => p.date.getMonth() === (now.getMonth() === 0 ? 11 : now.getMonth() - 1) && p.date.getFullYear() === (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()));
      
      const thisMonth = thisMonthPays.reduce((s, p) => s + p.amount, 0);
      const lastMonth = lastMonthPays.reduce((s, p) => s + p.amount, 0);
      const growth = lastMonth === 0 ? 100 : ((thisMonth - lastMonth) / lastMonth) * 100;

      setStats({ totalRevenue, thisMonth, lastMonth, growth });

      // Monthly Chart Data (last 6 months)
      const mData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mPays = pays.filter(p => p.date.getMonth() === d.getMonth() && p.date.getFullYear() === d.getFullYear());
        mData.push({
          month: monthNames[d.getMonth()],
          الإيرادات: mPays.reduce((s, p) => s + p.amount, 0)
        });
      }
      setMonthlyData(mData);

      // Type Chart Data
      const tMap = new Map<string, number>();
      pays.forEach(p => tMap.set(p.type, (tMap.get(p.type) || 0) + p.amount));
      setTypeData(Array.from(tMap.entries()).map(([name, value]) => ({ name, value })));

      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="section-title">تحليل الإيرادات</h2>
        <p className="section-subtitle">نظرة عامة على الإيرادات والتدفقات النقدية الفعلية (المدفوعات المعتمدة)</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold-500" size={32} /></div>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">إجمالي الإيرادات (تراكمي)</p>
                <p className="text-3xl font-black text-navy-900">{fmt(stats.totalRevenue)} <span className="text-sm font-medium text-gray-500">ج.م</span></p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gold-50 text-gold-600 flex items-center justify-center"><Wallet size={28} /></div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">إيرادات الشهر الحالي</p>
                <p className="text-3xl font-black text-emerald-600">{fmt(stats.thisMonth)} <span className="text-sm font-medium text-gray-500">ج.م</span></p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CalendarIcon size={28} /></div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">معدل النمو (عن الشهر السابق)</p>
                <p className="text-3xl font-black text-navy-900 flex items-center gap-2">
                  <span className={stats.growth >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                    {stats.growth > 0 ? '+' : ''}{stats.growth.toFixed(1)}%
                  </span>
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><TrendingUp size={28} /></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Area Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-navy-900 mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-gold-500"/> التدفق النقدي (آخر 6 أشهر)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c9941a" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#c9941a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `${(value/1000)}k`} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="الإيرادات" stroke="#c9941a" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-navy-900 mb-6 flex items-center gap-2"><Wallet size={18} className="text-gold-500"/> مصادر الإيرادات</h3>
              <div className="h-72 flex items-center justify-center">
                {typeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                        {typeData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${fmt(value)} ج.م`, 'المبلغ']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-400">لا توجد بيانات كافية</p>
                )}
              </div>
              {/* Custom Legend */}
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {typeData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-gray-600">{entry.name}</span>
                    <span className="font-bold text-navy-900">{fmt(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
