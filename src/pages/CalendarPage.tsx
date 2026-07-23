import { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon, ChevronRight, ChevronLeft, Plane, Clock,
  CreditCard, CheckCircle2, Hash, Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CalEvent {
  id: string;
  title: string;
  date: string;
  type: 'travel' | 'return' | 'follow_up' | 'installment' | 'task';
  meta?: string;
}

const typeConfig = {
  travel: { label: 'موعد سفر', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', icon: Plane },
  return: { label: 'موعد عودة', color: 'bg-cyan-500', text: 'text-cyan-700', bg: 'bg-cyan-50', icon: Plane },
  follow_up: { label: 'متابعة', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
  installment: { label: 'قسط', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', icon: CreditCard },
  task: { label: 'مهمة', color: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50', icon: CheckCircle2 },
};

const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const weekDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [opsRes, tasksRes, installmentsRes, customersRes] = await Promise.all([
      supabase.from('operation_files').select('id, op_number, travel_date, return_date, customer:customers(name, client_code)').or('travel_date.not.is.null,return_date.not.is.null'),
      supabase.from('tasks').select('id, title, due_date, client_code').neq('status', 'مكتملة'),
      supabase.from('installments').select('id, next_due_date, booking:bookings(customer:customers(name, client_code))').not('next_due_date', 'is', null),
      supabase.from('customers').select('id, name, client_code, next_follow_up').not('next_follow_up', 'is', null),
    ]);

    const evts: CalEvent[] = [];

    (opsRes.data as unknown as Array<{ id: string; op_number: string | null; travel_date: string | null; return_date: string | null; customer: { name: string; client_code: string | null } | null }> || []).forEach((op) => {
      if (op.travel_date) evts.push({ id: `${op.id}-t`, title: op.customer?.name || 'سفر', date: op.travel_date, type: 'travel', meta: op.op_number || op.customer?.client_code || '' });
      if (op.return_date) evts.push({ id: `${op.id}-r`, title: op.customer?.name || 'عودة', date: op.return_date, type: 'return', meta: op.op_number || op.customer?.client_code || '' });
    });

    (tasksRes.data as Array<{ id: string; title: string; due_date: string; client_code: string | null }> || []).forEach((t) => {
      evts.push({ id: t.id, title: t.title, date: t.due_date, type: 'task', meta: t.client_code || '' });
    });

    (installmentsRes.data as unknown as Array<{ id: string; next_due_date: string; booking: { customer: { name: string; client_code: string | null } } | null } | null> || []).forEach((ins) => {
      if (ins?.next_due_date && ins.booking?.customer) {
        evts.push({ id: ins.id, title: ins.booking.customer.name, date: ins.next_due_date, type: 'installment', meta: ins.booking.customer.client_code || '' });
      }
    });

    (customersRes.data as Array<{ id: string; name: string; client_code: string | null; next_follow_up: string }> || []).forEach((c) => {
      evts.push({ id: c.id, title: c.name, date: c.next_follow_up, type: 'follow_up', meta: c.client_code || '' });
    });

    setEvents(evts);
    setLoading(false);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dateStr = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const eventsForDate = (d: number) => events.filter((e) => e.date === dateStr(d));
  const selectedEvents = selectedDate ? events.filter((e) => e.date === selectedDate) : [];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = new Date().toISOString().split('T')[0];

  const typeCounts = {
    travel: events.filter((e) => e.type === 'travel').length,
    return: events.filter((e) => e.type === 'return').length,
    follow_up: events.filter((e) => e.type === 'follow_up').length,
    installment: events.filter((e) => e.type === 'installment').length,
    task: events.filter((e) => e.type === 'task').length,
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title">التقويم</h2>
        <p className="section-subtitle">مواعيد السفر، العودة، المتابعات، الأقساط، والمهام</p>
      </div>

      {/* Legend / stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.keys(typeConfig) as Array<keyof typeof typeConfig>).map((key) => {
          const cfg = typeConfig[key];
          const Icon = cfg.icon;
          return (
            <div key={key} className={`stat-card ${cfg.bg}`}>
              <div className={`w-9 h-9 rounded-xl ${cfg.color} flex items-center justify-center mb-1.5`}>
                <Icon size={16} className="text-white" />
              </div>
              <p className="text-xl font-black text-navy-900">{typeCounts[key]}</p>
              <p className={`text-xs ${cfg.text}`}>{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-navy-700" /></div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Calendar grid */}
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-navy-900">{monthNames[month]} {year}</h3>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"><ChevronRight size={18} /></button>
                <button onClick={() => setCurrentDate(new Date())} className="text-xs text-gold-600 font-bold px-3 py-1.5 rounded-lg hover:bg-gold-50">اليوم</button>
                <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"><ChevronLeft size={18} /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((d) => (
                <div key={d} className="text-center text-xs font-bold text-gray-400 py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const ds = dateStr(day);
                const dayEvents = eventsForDate(day);
                const isToday = ds === today;
                const isPast = ds < today;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(ds)}
                    className={`aspect-square rounded-xl p-1.5 text-right transition-all border ${
                      isToday ? 'border-gold-400 bg-gold-50' : selectedDate === ds ? 'border-navy-400 bg-navy-50' : 'border-transparent hover:border-gray-200'
                    } ${isPast ? 'opacity-50' : ''}`}
                  >
                    <span className={`text-xs font-bold ${isToday ? 'text-gold-700' : 'text-gray-700'}`}>{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {dayEvents.slice(0, 3).map((e) => (
                          <div key={e.id} className={`w-1.5 h-1.5 rounded-full ${typeConfig[e.type].color}`} />
                        ))}
                        {dayEvents.length > 3 && <span className="text-[8px] text-gray-400">+{dayEvents.length - 3}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected date events */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-navy-800 mb-4 flex items-center gap-2">
              <CalendarIcon size={16} className="text-gold-500" />
              {selectedDate ? new Date(selectedDate).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }) : 'اختر يوماً'}
            </h3>
            {selectedEvents.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <CalendarIcon size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{selectedDate ? 'لا توجد أحداث' : 'اختر تاريخاً لعرض الأحداث'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((e) => {
                  const cfg = typeConfig[e.type];
                  const Icon = cfg.icon;
                  return (
                    <div key={e.id} className={`rounded-xl p-4 ${cfg.bg} border border-gray-100`}>
                      <div className="flex items-center gap-3 mb-1">
                        <div className={`w-8 h-8 rounded-lg ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon size={14} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-navy-900 truncate">{e.title}</p>
                          <p className={`text-xs ${cfg.text}`}>{cfg.label}</p>
                        </div>
                      </div>
                      {e.meta && <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Hash size={10} />{e.meta}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
