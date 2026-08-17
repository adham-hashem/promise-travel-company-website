import { useEffect, useMemo, useState } from 'react';
import { X, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Task, Booking, Customer, Employee } from '../types';

export type StatType = 'overdue' | 'today' | 'bookings' | 'clients';

interface Props {
  type: StatType | null;
  onClose: () => void;
}

const taskStatusColors: Record<string, string> = {
  جديدة: 'bg-blue-100 text-blue-700',
  'قيد التنفيذ': 'bg-amber-100 text-amber-700',
  مكتملة: 'bg-emerald-100 text-emerald-700',
  متأخرة: 'bg-red-100 text-red-700',
};

const bookingStatusColors: Record<string, string> = {
  مؤكد: 'bg-green-100 text-green-700',
  معلق: 'bg-amber-100 text-amber-700',
  ملغي: 'bg-red-100 text-red-700',
};

const customerStatusColors: Record<string, string> = {
  جديد: 'bg-blue-100 text-blue-700',
  مهتم: 'bg-amber-100 text-amber-700',
  متابعة: 'bg-purple-100 text-purple-700',
  'تم الحجز': 'bg-green-100 text-green-700',
  مكتمل: 'bg-emerald-100 text-emerald-700',
  ملغي: 'bg-red-100 text-red-700',
};

const getTaskColor = (s: string) => taskStatusColors[s] || 'bg-gray-100 text-gray-700';
const getBookingColor = (s: string) => bookingStatusColors[s] || 'bg-gray-100 text-gray-700';
const getCustomerColor = (s: string) => customerStatusColors[s] || 'bg-gray-100 text-gray-700';

const titles: Record<StatType, string> = {
  overdue: 'المهام المتأخرة',
  today: 'مهام اليوم',
  bookings: 'حجوزات الفريق',
  clients: 'عملاء الفريق',
};

type PeriodFilter = 'week' | 'month' | 'year' | 'all';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function StatDrillDownModal({ type, onClose }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>('all');

  useEffect(() => {
    if (!type) return;
    setSearch('');
    setPeriod('all');
    (async () => {
      setLoading(true);
      const [empRes] = await Promise.all([
        supabase.from('employees').select('*'),
      ]);
      setEmployees((empRes.data as Employee[]) || []);

      if (type === 'overdue' || type === 'today') {
        const { data } = await supabase
          .from('tasks')
          .select('*, employees(*)')
          .order('due_date', { ascending: true });
        const all = (data as Task[]) || [];
        const today = todayStr();
        setTasks(
          type === 'overdue'
            ? all.filter((t) => t.status === 'متأخرة')
            : all.filter((t) => t.start_date <= today && t.due_date >= today),
        );
      } else if (type === 'bookings') {
        const { data } = await supabase
          .from('bookings')
          .select('*, customers(*), packages(*), employees(*)')
          .order('created_at', { ascending: false });
        setBookings((data as Booking[]) || []);
      } else if (type === 'clients') {
        const { data } = await supabase
          .from('customers')
          .select('*, employees(*)')
          .order('created_at', { ascending: false });
        setCustomers((data as Customer[]) || []);
      }
      setLoading(false);
    })();
  }, [type]);

  const empName = (id?: string) => employees.find((e) => e.id === id)?.name || '—';

  const filteredBookings = useMemo(() => {
    if (period === 'all') return bookings;
    const now = new Date();
    let start: Date;
    if (period === 'week') {
      start = new Date(now); start.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
    }
    return bookings.filter((b) => new Date(b.booking_date || b.created_at) >= start);
  }, [bookings, period]);

  if (!type) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl animate-fadeIn max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-navy p-5 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <h3 className="text-white font-bold text-lg">{titles[type]}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          {type === 'bookings' ? (
            <div className="flex items-center gap-1.5">
              {([
                { id: 'week', label: 'هذا الأسبوع' },
                { id: 'month', label: 'هذا الشهر' },
                { id: 'year', label: 'هذه السنة' },
                { id: 'all', label: 'الكل' },
              ] as const).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === p.id ? 'bg-navy-800 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث..."
                className="form-input pr-9"
              />
            </div>
          )}
          {type === 'bookings' && (
            <div className="text-sm text-gray-500">
              العدد: <span className="font-bold text-navy-800">{filteredBookings.length}</span> حجز
            </div>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
            </div>
          ) : type === 'overdue' || type === 'today' ? (
            tasks.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="font-medium">لا توجد مهام {type === 'overdue' ? 'متأخرة' : 'لليوم'}</p>
              </div>
            ) : (
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th>المهمة</th><th>الموظف</th><th>تاريخ الاستحقاق</th><th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks
                    .filter((t) =>
                      !search ||
                      t.title.includes(search) ||
                      (t.employees?.name || '').includes(search),
                    )
                    .map((t) => (
                      <tr key={t.id}>
                        <td><p className="font-semibold text-gray-800 text-sm">{t.title}</p>
                          {t.description && <p className="text-xs text-gray-400">{t.description}</p>}</td>
                        <td className="text-gray-600 text-sm">{t.employees?.name || '—'}</td>
                        <td className="text-gray-500 text-xs">{new Date(t.due_date).toLocaleDateString('ar-EG')}</td>
                        <td><span className={`badge ${getTaskColor(t.status)}`}>{t.status}</span></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )
          ) : type === 'bookings' ? (
            filteredBookings.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="font-medium">لا توجد حجوزات في هذه الفترة</p>
              </div>
            ) : (
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th>العميل</th><th>الباقة</th><th>الموظف</th><th>التاريخ</th><th>الحالة</th><th>القيمة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.slice(0, 100).map((b) => (
                    <tr key={b.id}>
                      <td className="font-semibold text-gray-800 text-sm">{b.customers?.name || '—'}</td>
                      <td className="text-gray-600 text-xs">{b.packages?.name || '—'}</td>
                      <td className="text-gray-600 text-xs">{empName(b.employee_id)}</td>
                      <td className="text-gray-500 text-xs">{new Date(b.booking_date || b.created_at).toLocaleDateString('ar-EG')}</td>
                      <td><span className={`badge ${getBookingColor(b.status)}`}>{b.status}</span></td>
                      <td className="text-gray-700 text-xs font-semibold">{Number(b.total_amount || 0).toLocaleString('ar-EG')} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : type === 'clients' ? (
            customers.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="font-medium">لا يوجد عملاء</p>
              </div>
            ) : (
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th>العميل</th><th>الهاتف</th><th>المحافظة</th><th>الموظف المسؤول</th><th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {customers
                    .filter((c) =>
                      !search ||
                      c.name.includes(search) ||
                      (c.phone || '').includes(search) ||
                      (c.employees?.name || '').includes(search),
                    )
                    .slice(0, 200)
                    .map((c) => (
                      <tr key={c.id}>
                        <td className="font-semibold text-gray-800 text-sm">{c.name}</td>
                        <td className="text-gray-600 text-xs" dir="ltr">{c.phone || '—'}</td>
                        <td className="text-gray-600 text-xs">{c.governorate || '—'}</td>
                        <td className="text-gray-600 text-xs">{c.employees?.name || '—'}</td>
                        <td><span className={`badge ${getCustomerColor(c.status)}`}>{c.status}</span></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
