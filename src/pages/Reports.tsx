import { FileDown, TrendingUp, Users, CalendarCheck, DollarSign } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const monthlySales = [
  { month: 'يناير', إيرادات: 42000, حجوزات: 12, عملاء: 18 },
  { month: 'فبراير', إيرادات: 58000, حجوزات: 18, عملاء: 24 },
  { month: 'مارس', إيرادات: 95000, حجوزات: 29, عملاء: 35 },
  { month: 'أبريل', إيرادات: 76000, حجوزات: 23, عملاء: 29 },
  { month: 'مايو', إيرادات: 110000, حجوزات: 35, عملاء: 42 },
  { month: 'يونيو', إيرادات: 145000, حجوزات: 48, عملاء: 56 },
];

const sourceData = [
  { name: 'فيسبوك', value: 38 },
  { name: 'توصية', value: 25 },
  { name: 'جوجل', value: 20 },
  { name: 'إنستجرام', value: 12 },
  { name: 'أخرى', value: 5 },
];

const COLORS = ['#0c224f', '#c9941a', '#1e4a9e', '#e4b030', '#6b7280'];

const employeePerf = [
  { name: 'نور الدين', target: 92, achieved: 41 },
  { name: 'أحمد محمد', target: 87, achieved: 32 },
  { name: 'فاطمة علي', target: 75, achieved: 27 },
  { name: 'محمود', target: 62, achieved: 19 },
];

const summaryCards = [
  { label: 'إجمالي الإيرادات', value: '526,000 ج.م', sub: '+24% عن الشهر الماضي', icon: DollarSign, color: 'bg-navy-800' },
  { label: 'إجمالي الحجوزات', value: '165', sub: '48 حجز هذا الشهر', icon: CalendarCheck, color: 'bg-gold-600' },
  { label: 'إجمالي العملاء', value: '204', sub: '56 عميل جديد هذا الشهر', icon: Users, color: 'bg-emerald-600' },
  { label: 'متوسط قيمة الحجز', value: '18,400 ج.م', sub: 'لكل حجز مؤكد', icon: TrendingUp, color: 'bg-purple-600' },
];

export default function Reports() {
  const exportPDF = () => alert('سيتم تصدير التقرير كـ PDF قريباً');
  const exportExcel = () => alert('سيتم تصدير التقرير كـ Excel قريباً');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">التقارير والإحصاءات</h2>
          <p className="section-subtitle">تقارير تفصيلية عن أداء الشركة</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportExcel} className="btn-outline text-sm py-2 px-4">
            <FileDown size={15} />
            Excel
          </button>
          <button onClick={exportPDF} className="btn-gold text-sm py-2 px-4">
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
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
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
                          style={{ width: `${e.target}%` }}
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
      </div>
    </div>
  );
}
