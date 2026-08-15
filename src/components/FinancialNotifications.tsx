import React, { useEffect, useState } from 'react';
import { CalendarClock, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { FinancialInstallment } from '../types';

export default function FinancialNotifications() {
  const [dueToday, setDueToday] = useState<FinancialInstallment[]>([]);
  const [overdue, setOverdue] = useState<FinancialInstallment[]>([]);
  const [dueSoon, setDueSoon] = useState<FinancialInstallment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    
    const dueSoonDate = new Date();
    dueSoonDate.setDate(dueSoonDate.getDate() + 3);
    const dueSoonString = dueSoonDate.toISOString().split('T')[0];

    const { data } = await supabase
      .from('financial_installments')
      .select('*, customers(name)')
      .in('status', ['مستحق', 'متأخر'])
      .order('due_date', { ascending: true });

    if (data) {
      const items = data as FinancialInstallment[];
      
      const over = items.filter(i => i.due_date < today && i.status === 'مستحق' || i.status === 'متأخر');
      const todayItems = items.filter(i => i.due_date === today && i.status === 'مستحق');
      const soonItems = items.filter(i => i.due_date > today && i.due_date <= dueSoonString && i.status === 'مستحق');

      setOverdue(over);
      setDueToday(todayItems);
      setDueSoon(soonItems);
    }
    setLoading(false);
  };

  const fmt = (n: number) => Number(n || 0).toLocaleString('ar-EG');

  if (loading || (overdue.length === 0 && dueToday.length === 0 && dueSoon.length === 0)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 mb-6">
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-red-800">🔔 يوجد أقساط متأخرة تحتاج إلى متابعة عاجلة ({overdue.length})</p>
            <div className="mt-2 space-y-1">
              {overdue.slice(0, 3).map(d => (
                <div key={d.id} className="text-red-700 text-sm bg-red-100/50 p-2 rounded flex justify-between gap-4">
                  <span>{d.customers?.name}</span>
                  <span className="font-bold">{fmt(d.amount)} ج.م (تاريخ الاستحقاق: {new Date(d.due_date).toLocaleDateString('ar-EG')})</span>
                </div>
              ))}
              {overdue.length > 3 && <p className="text-red-600 text-xs">و {overdue.length - 3} آخرين... (يرجى مراجعة قسم الأقساط)</p>}
            </div>
          </div>
        </div>
      )}
      
      {dueToday.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <CalendarClock size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-amber-800">🔔 أقساط مستحقة اليوم ({dueToday.length})</p>
            <p className="text-amber-700 text-sm mt-1">{dueToday.map(d => d.customers?.name).join('، ')}</p>
          </div>
        </div>
      )}

      {dueSoon.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <Clock size={24} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-blue-800">🔔 أقساط قريبة الاستحقاق (خلال 3 أيام) ({dueSoon.length})</p>
            <p className="text-blue-700 text-sm mt-1">{dueSoon.map(d => d.customers?.name).join('، ')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
