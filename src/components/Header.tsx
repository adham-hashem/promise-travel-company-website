import { Search, Bell, CheckCircle2, Users, ListChecks, Clock, AlertCircle, Zap, UserPlus, CalendarCheck, CreditCard, FileText, Plane, Globe } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Employee, AppNotification, Page } from '../types';

const pageNames: Record<string, string> = {
  dashboard: 'لوحة التحكم',
  customers: 'العملاء',
  'customer-add': 'إضافة عميل جديد',
  'customer-details': 'تفاصيل العميل',
  bookings: 'الحجوزات',
  packages: 'الباقات',
  offers: 'العروض',
  employees: 'الموظفون',
  reports: 'التقارير',
  settings: 'الإعدادات',
  hotels: 'إدارة الفنادق',
  invoices: 'الفواتير',
  inquiries: 'الاستعلامات',
  'client-search': 'البحث الذكي',
  tasks: 'إدارة المهام',
  calendar: 'التقويم',
  profit: 'تحليل الأرباح',
  suppliers: 'إدارة الموردين',
  visa: 'إدارة التأشيرات',
  'flight-tickets': 'قسم الطيران',
};

const notifIcons: Record<string, React.ElementType> = {
  new_lead: Users,
  task_assigned: ListChecks,
  follow_up: Clock,
  overdue_task: AlertCircle,
  new_customer: UserPlus,
  new_booking: CalendarCheck,
  new_payment: CreditCard,
  new_invoice: FileText,
  missing_document: AlertCircle,
  travel_soon: Plane,
  website_booking: Globe,
  new_visa: Plane,
  visa_review: Clock,
  visa_approved: CheckCircle2,
  visa_rejected: AlertCircle,
  visa_expired: Clock,
};

const notifColors: Record<string, string> = {
  new_lead: 'bg-blue-100 text-blue-700',
  task_assigned: 'bg-purple-100 text-purple-700',
  follow_up: 'bg-amber-100 text-amber-700',
  overdue_task: 'bg-red-100 text-red-700',
  new_customer: 'bg-emerald-100 text-emerald-700',
  new_booking: 'bg-cyan-100 text-cyan-700',
  new_payment: 'bg-emerald-100 text-emerald-700',
  new_invoice: 'bg-navy-100 text-navy-700',
  missing_document: 'bg-amber-100 text-amber-700',
  travel_soon: 'bg-blue-100 text-blue-700',
  website_booking: 'bg-gold-100 text-gold-700',
  new_visa: 'bg-blue-100 text-blue-700',
  visa_review: 'bg-amber-100 text-amber-700',
  visa_approved: 'bg-emerald-100 text-emerald-700',
  visa_rejected: 'bg-red-100 text-red-700',
  visa_expired: 'bg-orange-100 text-orange-700',
};

interface Props {
  currentPage: string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  onNavigate?: (page: Page) => void;
}

export default function Header({ currentPage, searchValue, onSearchChange, onNavigate }: Props) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [superResults, setSuperResults] = useState<Array<{ id: string; label: string; sub: string; type: string }>>([]);
  const [showSuper, setShowSuper] = useState(false);
  const superRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load employee record matching this user's email, then their notifications
  useEffect(() => {
    if (!profile?.email) return;
    let cancelled = false;
    (async () => {
      const { data: emp } = await supabase
        .from('employees')
        .select('*')
        .eq('email', profile.email)
        .maybeSingle();
      if (cancelled || !emp) return;
      setEmployee(emp as Employee);
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('employee_id', (emp as Employee).id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!cancelled) setNotifications((notifs as AppNotification[]) || []);
    })();
    return () => { cancelled = true; };
  }, [profile?.email]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (superRef.current && !superRef.current.contains(e.target as Node)) {
        setShowSuper(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Super search: search across customers, operation files, invoices, visas
  const runSuperSearch = async (q: string) => {
    if (q.trim().length < 2) { setSuperResults([]); return; }
    const query = q.trim();
    const [custRes, invRes, opRes, visaRes] = await Promise.all([
      supabase.from('customers').select('id, name, client_code, phone').or(`name.ilike.%${query}%,client_code.ilike.%${query}%,phone.ilike.%${query}%`).limit(4),
      supabase.from('invoices').select('id, invoice_number, customer:customers(name)').ilike('invoice_number', `%${query}%`).limit(4),
      supabase.from('operation_files').select('id, op_number, customer:customers(name, client_code)').ilike('op_number', `%${query}%`).limit(4),
      supabase.from('visa_management').select('id, visa_id, full_name, visa_type').or(`visa_id.ilike.%${query}%,full_name.ilike.%${query}%`).limit(4),
    ]);
    const results: Array<{ id: string; label: string; sub: string; type: string }> = [];
    (custRes.data as Array<{ id: string; name: string; client_code: string | null; phone: string }> || []).forEach((c) => {
      results.push({ id: c.id, label: c.name, sub: c.client_code || c.phone, type: 'customer' });
    });
    (invRes.data as Array<{ id: string; invoice_number: string; customer: { name: string } | null }> || []).forEach((inv) => {
      results.push({ id: inv.id, label: inv.invoice_number, sub: inv.customer?.name || 'فاتورة', type: 'invoice' });
    });
    (opRes.data as unknown as Array<{ id: string; op_number: string; customer: { name: string; client_code: string | null } | null }> || []).forEach((op) => {
      results.push({ id: op.id, label: op.op_number || 'ملف تشغيل', sub: op.customer?.name || '', type: 'operation' });
    });
    (visaRes.data as Array<{ id: string; visa_id: string; full_name: string; visa_type: string }> || []).forEach((v) => {
      results.push({ id: v.id, label: v.full_name, sub: `${v.visa_type} - ${v.visa_id || ''}`, type: 'visa' });
    });
    setSuperResults(results.slice(0, 8));
  };

  const onSuperInput = (v: string) => {
    onSearchChange?.(v);
    setShowSuper(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSuperSearch(v), 250);
  };

  const onSuperSelect = (r: { id: string; type: string }) => {
    if (r.type === 'customer') onNavigate?.('client-search', r.id);
    else if (r.type === 'invoice') onNavigate?.('invoices');
    else if (r.type === 'operation') onNavigate?.('operations');
    else if (r.type === 'visa') onNavigate?.('visa');
    setShowSuper(false);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    if (!employee || unreadCount === 0) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('employee_id', employee.id)
      .eq('is_read', false);
    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
  };

  const getTypeLabel = (t: string) => {
    if (t === 'customer') return 'عميل';
    if (t === 'invoice') return 'فاتورة';
    if (t === 'operation') return 'تشغيل';
    if (t === 'visa') return 'تأشيرة';
    return '';
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 fixed top-0 left-0 right-64 z-20 shadow-sm">
      <div className="flex-1">
        <h2 className="text-lg font-bold text-navy-900">{pageNames[currentPage] || 'لوحة التحكم'}</h2>
      </div>

      {onSearchChange && (
        <div className="relative hidden md:block w-72" ref={superRef}>
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input
            type="text" value={searchValue} onChange={(e) => onSuperInput(e.target.value)}
            onFocus={() => setShowSuper(true)}
            placeholder="بحث شامل: كود، اسم، هاتف، فاتورة..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-transparent"
          />
          {showSuper && superResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-96 overflow-y-auto">
              {superResults.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => onSuperSelect(r)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-right"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${r.type === 'customer' ? 'bg-navy-100 text-navy-700' : r.type === 'invoice' ? 'bg-gold-100 text-gold-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {r.type === 'customer' ? <Users size={14} /> : r.type === 'invoice' ? <FileText size={14} /> : <Plane size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-900 truncate">{r.label}</p>
                    <p className="text-xs text-gray-500 truncate">{r.sub}</p>
                  </div>
                  <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{getTypeLabel(r.type)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {onNavigate && (
        <button
          onClick={() => onNavigate('client-search')}
          title="البحث الذكي"
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
            currentPage === 'client-search'
              ? 'bg-navy-900 text-white border-navy-900'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <Zap size={15} />
          <span className="hidden md:inline">البحث الذكي</span>
        </button>
      )}

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown((v) => !v)}
          className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <Bell size={20} className="text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {showDropdown && (
          <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <p className="text-sm font-bold text-navy-900">الإشعارات</p>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-navy-700 font-semibold hover:underline flex items-center gap-1">
                  <CheckCircle2 size={12} />تعليم الكل كمقروء
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Bell size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">لا توجد إشعارات</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = notifIcons[n.type] || Bell;
                  return (
                    <div key={n.id} className={`flex items-start gap-3 p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${notifColors[n.type] || 'bg-gray-100 text-gray-600'}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-navy-800">{n.title}</p>
                        {n.body && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{n.body}</p>}
                        <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</p>
                      </div>
                      {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-8 bg-gray-200" />

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-navy-900 leading-tight">{profile?.name || 'مستخدم'}</p>
          <p className="text-xs text-gold-600 font-medium leading-tight">{profile?.role || ''}</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-gradient-navy flex items-center justify-center text-white font-bold text-sm shadow-md">
          {profile?.name?.charAt(0) || 'م'}
        </div>
      </div>
    </header>
  );
}
