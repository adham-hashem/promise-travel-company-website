import { useEffect, useMemo, useState } from 'react';
import {
  X, Search, Users, CalendarCheck, ListChecks, Calendar,
  Clock, CheckCircle2, AlertCircle, Filter, FileSpreadsheet, FileText, ChevronLeft,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { supabase } from '../lib/supabase';
import { exportToCSV, exportToPDF } from '../lib/export';
import type { Employee, Customer, Booking, Task, Page } from '../types';

type Tab = 'info' | 'clients' | 'bookings' | 'tasks';

type PeriodFilter = 'week' | 'month' | 'year' | 'custom';

const statusColors: Record<string, string> = {
  جديد: 'bg-blue-100 text-blue-700',
  مهتم: 'bg-amber-100 text-amber-700',
  متابعة: 'bg-purple-100 text-purple-700',
  'تم الحجز': 'bg-green-100 text-green-700',
  مكتمل: 'bg-emerald-100 text-emerald-700',
  ملغي: 'bg-red-100 text-red-700',
};

const bookingStatusColors: Record<string, string> = {
  مؤكد: 'bg-green-100 text-green-700',
  معلق: 'bg-amber-100 text-amber-700',
  ملغي: 'bg-red-100 text-red-700',
};

const taskStatusColors: Record<string, string> = {
  جديدة: 'bg-blue-100 text-blue-700',
  'قيد التنفيذ': 'bg-amber-100 text-amber-700',
  مكتملة: 'bg-emerald-100 text-emerald-700',
  متأخرة: 'bg-red-100 text-red-700',
};

const priorityColors: Record<string, string> = {
  منخفضة: 'bg-gray-100 text-gray-700',
  متوسطة: 'bg-amber-100 text-amber-700',
  عالية: 'bg-red-100 text-red-700',
};

const PIE_COLORS = ['#0c224f', '#c9941a', '#10b981', '#ef4444', '#a855f7'];

interface Props {
  employee: Employee | null;
  onClose: () => void;
  onNavigate: (page: Page, id?: string) => void;
}

export default function EmployeeDetailsModal({ employee, onClose, onNavigate }: Props) {
  const [tab, setTab] = useState<Tab>('info');
  const [clients, setClients] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('الكل');
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    if (!employee) return;
    setTab('info');
    setSearch('');
    setStatusFilter('الكل');
    setPeriod('month');
    loadAll(employee.id);
  }, [employee?.id]);

  const loadAll = async (empId: string) => {
    setLoading(true);
    const [c, b, t] = await Promise.all([
      supabase.from('customers').select('*, employees(*)').eq('assigned_employee_id', empId).order('created_at', { ascending: false }),
      supabase.from('bookings').select('*, customers(*), packages(*), employees(*)').eq('employee_id', empId).order('created_at', { ascending: false }),
      supabase.from('tasks').select('*, employees(*)').eq('employee_id', empId).order('due_date', { ascending: true }),
    ]);
    setClients((c.data as Customer[]) || []);
    setBookings((b.data as Booking[]) || []);
    setTasks((t.data as Task[]) || []);
    setLoading(false);
  };

  // ===== Client filter + export =====
  const allStatuses = ['جديد', 'مهتم', 'متابعة', 'تم الحجز', 'مكتمل', 'ملغي'];
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const s = !search || c.name.includes(search) || (c.phone || '').includes(search);
      const st = statusFilter === 'الكل' || c.status === statusFilter;
      return s && st;
    });
  }, [clients, search, statusFilter]);

  const exportClientsCSV = () => {
    exportToCSV(`عملاء_${employee?.name || ''}`, [
      'الاسم', 'الهاتف', 'المحافظة', 'الحالة', 'آخر متابعة',
    ], filteredClients.map((c) => [c.name, c.phone || '', c.governorate || '', c.status, c.last_follow_up ? new Date(c.last_follow_up).toLocaleDateString('ar-EG') : '']));
  };

  const exportClientsPDF = () => {
    const rows = filteredClients.map((c) => `<tr><td>${c.name}</td><td>${c.phone || ''}</td><td>${c.governorate || ''}</td><td>${c.status}</td><td>${c.last_follow_up ? new Date(c.last_follow_up).toLocaleDateString('ar-EG') : ''}</td></tr>`).join('');
    exportToPDF(`عملاء ${employee?.name || ''}`,
      `<table><thead><tr><th>الاسم</th><th>الهاتف</th><th>المحافظة</th><th>الحالة</th><th>آخر متابعة</th></tr></thead><tbody>${rows}</tbody></table>`);
  };

  // ===== Booking period filter =====
  const filteredBookings = useMemo(() => {
    if (period === 'custom') {
      if (!customFrom && !customTo) return bookings;
      return bookings.filter((b) => {
        const d = new Date(b.booking_date || b.created_at);
        if (customFrom && d < new Date(customFrom)) return false;
        if (customTo && d > new Date(customTo + 'T23:59:59')) return false;
        return true;
      });
    }
    const now = new Date();
    let start: Date;
    if (period === 'week') {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
    }
    return bookings.filter((b) => new Date(b.booking_date || b.created_at) >= start);
  }, [bookings, period, customFrom, customTo]);

  const bookingStats = useMemo(() => {
    const count = filteredBookings.length;
    const revenue = filteredBookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
    const confirmed = filteredBookings.filter(b => b.status === 'مؤكد').length;
    const actualTarget = Math.max(employee?.target_percentage || 0, 1);
    const completionRate = count > 0 ? Math.round((confirmed / count) * 100) : 0;
    return { count, revenue, confirmed, completionRate, actualTarget };
  }, [filteredBookings, employee]);

  const bookingChartData = useMemo(() => {
    const map = new Map<string, number>();
    filteredBookings.forEach((b) => {
      const k = new Date(b.booking_date || b.created_at).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' });
      map.set(k, (map.get(k) || 0) + Number(b.total_amount || 0));
    });
    return Array.from(map, ([name, value]) => ({ name, value })).slice(-10);
  }, [filteredBookings]);

  const bookingStatusPie = useMemo(() => {
    const map = new Map<string, number>();
    filteredBookings.forEach((b) => map.set(b.status, (map.get(b.status) || 0) + 1));
    return Array.from(map, ([name, value]) => ({ name, value }));
  }, [filteredBookings]);

  const exportBookingsCSV = () => {
    exportToCSV(`حجوزات_${employee?.name || ''}`, [
      'العميل', 'الباقة', 'تاريخ الحجز', 'الحالة', 'القيمة',
    ], filteredBookings.map((b) => [
      b.customers?.name || '',
      b.packages?.name || '',
      new Date(b.booking_date || b.created_at).toLocaleDateString('ar-EG'),
      b.status,
      Number(b.total_amount || 0).toLocaleString('ar-EG'),
    ]));
  };

  // ===== Task stats =====
  const taskStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return {
      total: tasks.length,
      today: tasks.filter(t => t.start_date <= todayStr && t.due_date >= todayStr).length,
      completed: tasks.filter(t => t.status === 'مكتملة').length,
      pending: tasks.filter(t => t.status !== 'مكتملة').length,
      overdue: tasks.filter(t => t.status === 'متأخرة').length,
    };
  }, [tasks]);

  if (!employee) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl animate-fadeIn max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-navy p-5 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-xl">
              {employee.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{employee.name}</h3>
              <p className="text-gold-300 text-sm">{employee.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <Users size={14} className="text-navy-600 mx-auto mb-1" />
            <p className="text-xl font-black text-navy-800">{employee.clients_count}</p>
            <p className="text-[10px] text-gray-500">عميل</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <CalendarCheck size={14} className="text-gold-600 mx-auto mb-1" />
            <p className="text-xl font-black text-gold-700">{employee.bookings_count}</p>
            <p className="text-[10px] text-gray-500">حجز</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <ListChecks size={14} className="text-purple-600 mx-auto mb-1" />
            <p className="text-xl font-black text-purple-700">{taskStats.total}</p>
            <p className="text-[10px] text-gray-500">مهمة</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
            <CheckCircle2 size={14} className="text-emerald-600 mx-auto mb-1" />
            <p className="text-xl font-black text-emerald-700">{employee.target_percentage}%</p>
            <p className="text-[10px] text-gray-500">نسبة الهدف</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
          {[
            { id: 'info' as Tab, label: 'البيانات', icon: Users },
            { id: 'clients' as Tab, label: 'العملاء', icon: Users, count: clients.length },
            { id: 'bookings' as Tab, label: 'الحجوزات', icon: CalendarCheck, count: bookings.length },
            { id: 'tasks' as Tab, label: 'المهام', icon: ListChecks, count: tasks.length },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${tab === t.id ? 'border-gold-500 text-navy-900' : 'border-transparent text-gray-500 hover:text-navy-700'}`}>
                <Icon size={15} />{t.label}
                {typeof t.count === 'number' && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-gold-100 text-gold-700' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Info Tab */}
              {tab === 'info' && (
                <div className="space-y-4 max-w-2xl">
                  <h4 className="text-xs font-bold text-navy-700 mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-gold-500 rounded-full" />البيانات الشخصية
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-[10px] text-gray-400 mb-1">الاسم الكامل</p>
                      <p className="text-sm font-semibold text-navy-800">{employee.name}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-[10px] text-gray-400 mb-1">الوظيفة</p>
                      <p className="text-sm font-semibold text-navy-800">{employee.role}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-[10px] text-gray-400 mb-1">رقم الهاتف</p>
                      <p className="text-sm font-semibold text-navy-800" dir="ltr">{employee.phone || '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-[10px] text-gray-400 mb-1">البريد الإلكتروني</p>
                      <p className="text-sm font-semibold text-navy-800" dir="ltr">{employee.email || '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-[10px] text-gray-400 mb-1">الحالة</p>
                      <span className={`badge ${employee.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {employee.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-[10px] text-gray-400 mb-1">تاريخ التعيين</p>
                      <p className="text-sm font-semibold text-navy-800">{new Date(employee.created_at).toLocaleDateString('ar-EG')}</p>
                    </div>
                  </div>

                  {/* Task summary */}
                  <h4 className="text-xs font-bold text-navy-700 mb-3 mt-6 flex items-center gap-2">
                    <div className="w-1 h-4 bg-gold-500 rounded-full" />ملخص المهام
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-blue-700">{taskStats.today}</p>
                      <p className="text-[10px] text-gray-500">يومية</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-emerald-700">{taskStats.completed}</p>
                      <p className="text-[10px] text-gray-500">مكتملة</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-amber-700">{taskStats.pending}</p>
                      <p className="text-[10px] text-gray-500">متبقية</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-red-700">{taskStats.overdue}</p>
                      <p className="text-[10px] text-gray-500">متأخرة</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Clients Tab */}
              {tab === 'clients' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                      <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                      <input
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث بالاسم أو الهاتف..."
                        className="form-input pr-9"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => setStatusFilter('الكل')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter === 'الكل' ? 'bg-navy-800 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>الكل</button>
                      {allStatuses.map((s) => (
                        <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${statusFilter === s ? 'bg-navy-800 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{s}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={exportClientsCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                        <FileSpreadsheet size={13} />Excel
                      </button>
                      <button onClick={exportClientsPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                        <FileText size={13} />PDF
                      </button>
                    </div>
                  </div>

                  {filteredClients.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <Users size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="font-medium">{clients.length === 0 ? 'لا يوجد عملاء تابعون لهذا الموظف' : 'لا نتائج مطابقة'}</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      <table className="w-full data-table">
                        <thead>
                          <tr>
                            <th>العميل</th><th>الهاتف</th><th>المحافظة</th><th>الحالة</th><th>آخر متابعة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredClients.map((c) => (
                            <tr key={c.id} className="cursor-pointer hover:bg-blue-50/30" onClick={() => onNavigate('customer-details', c.id)}>
                              <td><p className="font-semibold text-gray-800 text-sm">{c.name}</p></td>
                              <td className="text-gray-600 text-xs" dir="ltr">{c.phone || '—'}</td>
                              <td className="text-gray-600 text-xs">{c.governorate || '—'}</td>
                              <td><span className={`badge ${statusColors[c.status] || 'bg-gray-100 text-gray-700'}`}>{c.status}</span></td>
                              <td className="text-gray-500 text-xs">{c.last_follow_up ? new Date(c.last_follow_up).toLocaleDateString('ar-EG') : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Bookings Tab */}
              {tab === 'bookings' && (
                <div className="space-y-4">
                  {/* Period filter */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Filter size={15} className="text-gray-400" />
                      {([
                        { id: 'week', label: 'هذا الأسبوع' },
                        { id: 'month', label: 'هذا الشهر' },
                        { id: 'year', label: 'هذه السنة' },
                        { id: 'custom', label: 'فترة مخصصة' },
                      ] as const).map((p) => (
                        <button key={p.id} onClick={() => setPeriod(p.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${period === p.id ? 'bg-navy-800 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                    {period === 'custom' && (
                      <div className="flex items-center gap-2">
                        <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="form-input w-auto py-1.5 text-xs" />
                        <span className="text-gray-400 text-xs">إلى</span>
                        <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="form-input w-auto py-1.5 text-xs" />
                      </div>
                    )}
                    <button onClick={exportBookingsCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                      <FileSpreadsheet size={13} />Excel
                    </button>
                  </div>

                  {/* Stats cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gradient-navy rounded-xl p-4 text-white">
                      <CalendarCheck size={18} className="mb-2 opacity-80" />
                      <p className="text-2xl font-black">{bookingStats.count}</p>
                      <p className="text-xs text-gold-300">عدد الحجوزات</p>
                    </div>
                    <div className="bg-gradient-to-br from-gold-600 to-gold-400 rounded-xl p-4 text-white">
                      <p className="text-sm opacity-80 mb-2">إجمالي الإيرادات</p>
                      <p className="text-xl font-black">{bookingStats.revenue.toLocaleString('ar-EG')} ج.م</p>
                    </div>
                    <div className="bg-emerald-600 rounded-xl p-4 text-white">
                      <CheckCircle2 size={18} className="mb-2 opacity-80" />
                      <p className="text-2xl font-black">{bookingStats.completionRate}%</p>
                      <p className="text-xs opacity-90">نسبة الإنجاز</p>
                    </div>
                  </div>

                  {/* Charts */}
                  {filteredBookings.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <h4 className="text-xs font-bold text-navy-700 mb-3">الإيرادات عبر الوقت</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={bookingChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'Cairo', fill: '#6b7280' }} />
                            <YAxis tick={{ fontSize: 10, fontFamily: 'Cairo', fill: '#6b7280' }} />
                            <Tooltip contentStyle={{ fontFamily: 'Cairo', borderRadius: '12px', border: 'none' }} />
                            <Bar dataKey="value" fill="#c9941a" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <h4 className="text-xs font-bold text-navy-700 mb-3">حالات الحجوزات</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={bookingStatusPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                              {bookingStatusPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ fontFamily: 'Cairo', borderRadius: '12px', border: 'none' }} />
                            <Legend wrapperStyle={{ fontFamily: 'Cairo', fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Bookings table */}
                  {filteredBookings.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <CalendarCheck size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="font-medium">لا توجد حجوزات في هذه الفترة</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      <table className="w-full data-table">
                        <thead>
                          <tr>
                            <th>العميل</th><th>الباقة</th><th>تاريخ الحجز</th><th>الحالة</th><th>القيمة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBookings.slice(0, 50).map((b) => (
                            <tr key={b.id} className="cursor-pointer" onClick={() => onNavigate('customer-details', b.customer_id)}>
                              <td><p className="font-semibold text-gray-800 text-sm">{b.customers?.name || '—'}</p></td>
                              <td className="text-gray-600 text-xs">{b.packages?.name || '—'}</td>
                              <td className="text-gray-500 text-xs">{new Date(b.booking_date || b.created_at).toLocaleDateString('ar-EG')}</td>
                              <td><span className={`badge ${bookingStatusColors[b.status] || 'bg-gray-100 text-gray-700'}`}>{b.status}</span></td>
                              <td className="text-gray-700 text-xs font-semibold">{Number(b.total_amount || 0).toLocaleString('ar-EG')} ج.م</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredBookings.length > 50 && (
                        <div className="text-center py-3 text-xs text-gray-400">عرض 50 من {filteredBookings.length} حجز</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tasks Tab */}
              {tab === 'tasks' && (
                <div className="space-y-4">
                  {tasks.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <ListChecks size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="font-medium">لا توجد مهام لهذا الموظف</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {tasks.map((t) => (
                        <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 hover:shadow-sm transition-shadow">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${taskStatusColors[t.status]}`}>
                            {t.status === 'مكتملة' ? <CheckCircle2 size={16} /> : t.status === 'متأخرة' ? <AlertCircle size={16} /> : <Clock size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-bold text-navy-800 text-sm">{t.title}</p>
                              <span className={`badge ${priorityColors[t.priority]}`}>{t.priority}</span>
                              <span className={`badge ${taskStatusColors[t.status]}`}>{t.status}</span>
                            </div>
                            {t.description && <p className="text-xs text-gray-500 mb-2">{t.description}</p>}
                            <div className="flex items-center gap-4 text-[11px] text-gray-400">
                              <span className="flex items-center gap-1"><Calendar size={11} />{new Date(t.start_date).toLocaleDateString('ar-EG')}</span>
                              <span className="flex items-center gap-1"><Clock size={11} />{new Date(t.due_date).toLocaleDateString('ar-EG')}</span>
                            </div>
                          </div>
                          <ChevronLeft size={14} className="text-gray-300 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
