import { Search, Bell, CheckCircle2, Users, ListChecks, Clock, AlertCircle, Zap, UserPlus, CalendarCheck, CreditCard, FileText, Plane, Globe, Menu, Key, Lock, Eye, EyeOff, User, LogOut, X } from 'lucide-react';
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
  'approval-requests': 'طلبات الموافقة',
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
  approval_request: AlertCircle,
  installment_overdue: CreditCard,
  installment_due_soon: Clock,
  installment_due_today: CreditCard,
  document_required: FileText,
  urgent_travel_issue: AlertCircle,
  visa_incomplete: Plane,
  booking_pending: CalendarCheck,
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
  approval_request: 'bg-red-100 text-red-700',
  installment_overdue: 'bg-red-100 text-red-700',
  installment_due_soon: 'bg-amber-100 text-amber-700',
  installment_due_today: 'bg-orange-100 text-orange-700',
  document_required: 'bg-amber-100 text-amber-700',
  urgent_travel_issue: 'bg-red-100 text-red-700',
  visa_incomplete: 'bg-orange-100 text-orange-700',
  booking_pending: 'bg-cyan-100 text-cyan-700',
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
  onNavigate?: (page: Page, id?: string) => void;
  onToggleSidebar?: () => void;
}

export default function Header({ currentPage, searchValue, onSearchChange, onNavigate, onToggleSidebar }: Props) {
  const { profile, signOut } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [superResults, setSuperResults] = useState<Array<{ id: string; label: string; sub: string; type: string }>>([]);
  const [showSuper, setShowSuper] = useState(false);
  const superRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // User Profile & Change Password State
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError('يرجى ملء جميع الحقول');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('كلمتا المرور الجديدتان غير متطابقتين');
      return;
    }

    setPwdLoading(true);

    try {
      // 1. Verify current password hash
      const { data: isValid, error: verifyErr } = await supabase.rpc('verify_current_password', {
        p_password: currentPassword
      });

      if (verifyErr || !isValid) {
        setPwdError('كلمة المرور الحالية غير صحيحة');
        setPwdLoading(false);
        return;
      }

      // 2. Update password hash in database
      const { error: changeErr } = await supabase.rpc('change_user_password', {
        p_user_id: profile?.id,
        p_new_password: newPassword
      });

      if (changeErr) {
        setPwdError(changeErr.message);
        setPwdLoading(false);
        return;
      }

      setPwdSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPwdModal(false);
        setPwdSuccess(false);
      }, 2000);
    } catch (err: any) {
      setPwdError(err.message || 'حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setShowProfileMenu(false);
    window.location.hash = '/admin'; // Redirect to admin login area
  };

  // Load employee record matching this user's email, then their notifications
  useEffect(() => {
    if (!profile?.email) return;
    let cancelled = false;
    const loadNotifs = async () => {
      await supabase.rpc('refresh_action_notifications');
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
        .eq('requires_action', true)
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!cancelled) setNotifications((notifs as AppNotification[]) || []);
    };

    loadNotifs();
    const intervalId = setInterval(loadNotifs, 15000);

    return () => { 
      cancelled = true; 
      clearInterval(intervalId);
    };
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
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Super search: search across customers, operation files, invoices, visas
  const runSuperSearch = async (q: string) => {
    if (q.trim().length < 1) { setSuperResults([]); return; }
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

  const openNotification = async (notification: AppNotification) => {
    if (!employee) return;
    if (!notification.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
      setNotifications((items) => items.map((n) => n.id === notification.id ? { ...n, is_read: true } : n));
    }
    if (notification.target_page && onNavigate) {
      onNavigate(notification.target_page, notification.target_record_id);
      setShowDropdown(false);
    }
  };

  const getTypeLabel = (t: string) => {
    if (t === 'customer') return 'عميل';
    if (t === 'invoice') return 'فاتورة';
    if (t === 'operation') return 'تشغيل';
    if (t === 'visa') return 'تأشيرة';
    return '';
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-3 sm:px-4 md:px-6 gap-2 sm:gap-3 md:gap-4 fixed top-0 left-0 right-0 md:right-64 z-20 shadow-sm overflow-visible">
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 md:hidden flex-shrink-0 transition-colors"
          title="القائمة"
        >
          <Menu size={20} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-sm md:text-lg font-bold text-navy-900 truncate">{pageNames[currentPage] || 'لوحة التحكم'}</h2>
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

      <a
        href="/"
        title="الذهاب للموقع الرئيسي"
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-gold-200 bg-gold-50 text-gold-700 hover:bg-gold-100 transition-all transition-colors"
      >
        <Globe size={15} />
        <span className="hidden md:inline">الموقع الرئيسي</span>
      </a>

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
          <div className="absolute left-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fadeIn">
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
                    <button key={n.id} onClick={() => openNotification(n)} className={`w-full text-right flex items-start gap-3 p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${notifColors[n.type] || 'bg-gray-100 text-gray-600'}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-navy-800">{n.title}</p>
                        {n.body && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{n.body}</p>}
                        <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</p>
                      </div>
                      {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-8 bg-gray-200" />

      <div className="relative" ref={profileMenuRef}>
        <button
          onClick={() => setShowProfileMenu(v => !v)}
          className="flex items-center gap-3 hover:bg-gray-50 p-1.5 rounded-xl transition-all"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-navy-900 leading-tight">{profile?.name || 'مستخدم'}</p>
            <p className="text-xs text-gold-600 font-medium leading-tight">{profile?.role || ''}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-navy flex items-center justify-center text-white font-bold text-sm shadow-md">
            {profile?.name?.charAt(0) || 'م'}
          </div>
        </button>

        {showProfileMenu && (
          <div className="absolute left-0 top-full mt-2 w-48 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-fadeIn">
            <button
              onClick={() => { setShowPwdModal(true); setShowProfileMenu(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-right"
            >
              <Key size={14} className="text-gold-500" />
              <span>تغيير كلمة المرور</span>
            </button>
            <div className="h-px bg-gray-100 mx-3" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-right"
            >
              <LogOut size={14} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      {showPwdModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPwdModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                <Key size={18} className="text-gold-500" />
                تغيير كلمة المرور الخاصة بك
              </h3>
              <button onClick={() => setShowPwdModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordChange}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="form-label">كلمة المرور الحالية <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showCurrentPwd ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="form-input pl-9 text-left"
                      placeholder="••••••••"
                      dir="ltr"
                      required
                    />
                    <button type="button" onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="absolute top-1/2 -translate-y-1/2 left-2.5 text-gray-400 hover:text-gray-600">
                      {showCurrentPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label">كلمة المرور الجديدة <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="form-input pl-9 text-left"
                      placeholder="••••••••"
                      dir="ltr"
                      required
                    />
                    <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute top-1/2 -translate-y-1/2 left-2.5 text-gray-400 hover:text-gray-600">
                      {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label">تأكيد كلمة المرور الجديدة <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showConfirmPwd ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="form-input pl-9 text-left"
                      placeholder="••••••••"
                      dir="ltr"
                      required
                    />
                    <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="absolute top-1/2 -translate-y-1/2 left-2.5 text-gray-400 hover:text-gray-600">
                      {showConfirmPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-gray-400 leading-normal">
                  * يجب أن تتكون كلمة المرور من 8 أحرف على الأقل، وتحتوي على حرف كبير، حرف صغير، رقم، ورمز خاص (مثل !@#$%^&*).
                </p>

                {pwdError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
                    {pwdError}
                  </div>
                )}

                {pwdSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-2.5 text-sm">
                    تم تغيير كلمة المرور بنجاح! سيتم إغلاق النافذة...
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowPwdModal(false)} className="btn-outline">إلغاء</button>
                <button type="submit" disabled={pwdLoading || pwdSuccess} className="btn-gold">
                  {pwdLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      جارٍ الحفظ...
                    </span>
                  ) : 'حفظ كلمة المرور'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
