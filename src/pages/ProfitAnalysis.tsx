import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, DollarSign, Loader2,
  Package, Users, Calendar,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from 'recharts';
import { supabase } from '../lib/supabase';

const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

interface DataRow {
  label: string;
  sales: number;
  cost: number;
  profit: number;
}

export default function ProfitAnalysis() {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ sales: 0, expenses: 0, cost: 0, profit: 0 });
  const [byPackage, setByPackage] = useState<DataRow[]>([]);
  const [byMonth, setByMonth] = useState<DataRow[]>([]);
  const [byEmployee, setByEmployee] = useState<DataRow[]>([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [bookingsRes, expensesRes, packagesRes, employeesRes] = await Promise.all([
      supabase.from('bookings').select('total_amount, booking_date, package_id, employee_id, package:packages(name, cost_price, price)'),
      supabase.from('expenses').select('amount, category, expense_date'),
      supabase.from('packages').select('id, name, price, cost_price'),
      supabase.from('employees').select('id, name'),
    ]);

    const bookings = (bookingsRes.data as unknown as Array<{ total_amount: number | null; booking_date: string; package_id: string | null; employee_id: string | null; package: { name: string; cost_price: number | null; price: number } | null }>) || [];
    const expenses = (expensesRes.data as Array<{ amount: number; category: string; expense_date: string }>) || [];
    const _packages = (packagesRes.data as Array<{ id: string; name: string; price: number; cost_price: number | null }>) || [];
    const employees = (employeesRes.data as Array<{ id: string; name: string }>) || [];

    const totalSales = bookings.reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const totalCost = bookings.reduce((s, b) => {
      const costPerPerson = Number(b.package?.cost_price || 0);
      return s + costPerPerson;
    }, 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const netProfit = totalSales - totalCost - totalExpenses;
    setTotals({ sales: totalSales, expenses: totalExpenses, cost: totalCost, profit: netProfit });

    // By package
    const pkgMap = new Map<string, DataRow>();
    bookings.forEach((b) => {
      const pkgName = b.package?.name || 'بدون باقة';
      const row = pkgMap.get(pkgName) || { label: pkgName, sales: 0, cost: 0, profit: 0 };
      row.sales += Number(b.total_amount || 0);
      row.cost += Number(b.package?.cost_price || 0);
      pkgMap.set(pkgName, row);
    });
    setByPackage(Array.from(pkgMap.values()).map((r) => ({ ...r, profit: r.sales - r.cost })).sort((a, b) => b.profit - a.profit).slice(0, 6));

    // By month
    const monthMap = new Map<number, DataRow>();
    bookings.forEach((b) => {
      const m = new Date(b.booking_date).getMonth();
      const row = monthMap.get(m) || { label: monthNames[m], sales: 0, cost: 0, profit: 0 };
      row.sales += Number(b.total_amount || 0);
      row.cost += Number(b.package?.cost_price || 0);
      monthMap.set(m, row);
    });
    setByMonth(Array.from(monthMap.entries()).sort((a, b) => a[0] - b[0]).map(([, r]) => ({ ...r, profit: r.sales - r.cost })));

    // By employee
    const empMap = new Map<string, DataRow>();
    bookings.forEach((b) => {
      if (!b.employee_id) return;
      const emp = employees.find((e) => e.id === b.employee_id);
      const empName = emp?.name || 'غير معين';
      const row = empMap.get(empName) || { label: empName, sales: 0, cost: 0, profit: 0 };
      row.sales += Number(b.total_amount || 0);
      row.cost += Number(b.package?.cost_price || 0);
      empMap.set(empName, row);
    });
    setByEmployee(Array.from(empMap.values()).map((r) => ({ ...r, profit: r.sales - r.cost })).sort((a, b) => b.profit - a.profit));

    setLoading(false);
  };

  const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-navy-700" /></div>;
  }

  const summaryCards = [
    { label: 'إجمالي المبيعات', value: totals.sales, icon: TrendingUp, color: 'from-navy-800 to-navy-600' },
    { label: 'التكلفة', value: totals.cost, icon: DollarSign, color: 'from-orange-600 to-orange-400' },
    { label: 'المصروفات', value: totals.expenses, icon: TrendingDown, color: 'from-red-700 to-red-500' },
    { label: 'صافي الأرباح', value: totals.profit, icon: Wallet, color: 'from-emerald-700 to-emerald-500' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title">تحليل الأرباح</h2>
        <p className="section-subtitle">المبيعات، التكلفة، المصروفات، وصافي الربح</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`bg-gradient-to-br ${c.color} rounded-2xl p-5 text-white shadow-lg`}>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                <Icon size={20} />
              </div>
              <p className="text-white/80 text-xs mb-1">{c.label}</p>
              <p className="text-2xl font-black">{fmt(c.value)} <span className="text-xs font-normal">ج.م</span></p>
            </div>
          );
        })}
      </div>

      {/* Monthly chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-bold text-navy-900 mb-1 flex items-center gap-2"><Calendar size={16} className="text-gold-500" />الربح الشهري</h3>
        <p className="text-xs text-gray-500 mb-5">المبيعات مقابل التكلفة لكل شهر</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={byMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 11, fontFamily: 'Cairo', fill: '#6b7280' }} />
            <Tooltip
              formatter={(v) => [`${Number(v).toLocaleString('ar-EG')} ج.م`, '']}
              contentStyle={{ fontFamily: 'Cairo', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            />
            <Legend wrapperStyle={{ fontFamily: 'Cairo', fontSize: 12 }} />
            <Bar dataKey="sales" name="المبيعات" fill="#0c224f" radius={[6, 6, 0, 0]} />
            <Bar dataKey="cost" name="التكلفة" fill="#ea580c" radius={[6, 6, 0, 0]} />
            <Bar dataKey="profit" name="الربح" fill="#16a34a" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* By package */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-navy-900 mb-1 flex items-center gap-2"><Package size={16} className="text-gold-500" />الربح حسب الباقة</h3>
          <p className="text-xs text-gray-500 mb-5">سعر البيع، التكلفة، والربح</p>
          {byPackage.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">لا توجد بيانات</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byPackage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10, fontFamily: 'Cairo', fill: '#6b7280' }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fontFamily: 'Cairo', fill: '#6b7280' }} width={100} />
                <Tooltip formatter={(v) => [`${Number(v).toLocaleString('ar-EG')} ج.م`, '']} contentStyle={{ fontFamily: 'Cairo', borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="profit" name="الربح" fill="#c9941a" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* By employee */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-base font-bold text-navy-900 mb-1 flex items-center gap-2"><Users size={16} className="text-gold-500" />الربح حسب الموظف</h3>
          <p className="text-xs text-gray-500 mb-5">المبيعات والربح لكل موظف</p>
          {byEmployee.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">لا توجد بيانات</p>
          ) : (
            <div className="space-y-3">
              {byEmployee.map((r) => (
                <div key={r.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-navy-100 flex items-center justify-center text-navy-700 font-bold text-sm">
                      {r.label.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-navy-900">{r.label}</p>
                      <p className="text-xs text-gray-500">مبيعات: {fmt(r.sales)} ج.م</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-emerald-600">{fmt(r.profit)}</p>
                    <p className="text-xs text-gray-400">ربح ج.م</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Package detail table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-navy-900">تفصيل الربح لكل باقة</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="px-5 py-3 text-right font-semibold">الباقة</th>
                <th className="px-5 py-3 text-right font-semibold">المبيعات</th>
                <th className="px-5 py-3 text-right font-semibold">التكلفة</th>
                <th className="px-5 py-3 text-right font-semibold">الربح</th>
                <th className="px-5 py-3 text-right font-semibold">هامش الربح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {byPackage.map((r) => {
                const margin = r.sales > 0 ? ((r.profit / r.sales) * 100).toFixed(1) : '0';
                return (
                  <tr key={r.label} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-semibold text-navy-900">{r.label}</td>
                    <td className="px-5 py-3 text-gray-700">{fmt(r.sales)}</td>
                    <td className="px-5 py-3 text-orange-600">{fmt(r.cost)}</td>
                    <td className="px-5 py-3 font-bold text-emerald-600">{fmt(r.profit)}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${Number(margin) > 20 ? 'bg-emerald-100 text-emerald-700' : Number(margin) > 10 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {margin}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {byPackage.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">لا توجد بيانات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
