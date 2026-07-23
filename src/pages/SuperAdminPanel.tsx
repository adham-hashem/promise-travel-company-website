import { useEffect, useState } from 'react';
import {
  ShieldCheck, Shield, RefreshCw, Key, AlertCircle, Trash2,
  Database, AlertTriangle, CheckCircle, Calendar, Filter, Eye,
  Lock, Bell, MessageSquare, Clock, CheckSquare, Plane, FileText,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ALL_PAGES, PERMISSION_GROUPS, type Permissions } from '../lib/permissions';

interface ProfileItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  permissions: Permissions;
  page_permissions?: Record<string, boolean>;
  created_at: string;
}

interface CleanupModule {
  id: string;
  title: string;
  description: string;
  table: string;
  icon: React.ElementType;
  color: string;
  conditionDescription: string;
}

const CLEANUP_MODULES: CleanupModule[] = [
  {
    id: 'notifications',
    title: 'الإشعارات المقروءة والقديمة',
    description: 'تنظيف الإشعارات القديمة أو المقروءة بالنظام لتخفيف استعلامات الشريط العلوي.',
    table: 'notifications',
    icon: Bell,
    color: 'text-blue-600 bg-blue-50',
    conditionDescription: 'الإشعارات المقروءة أو المسجلة قبل التاريخ المحدد',
  },
  {
    id: 'communication_logs',
    title: 'سجلات الاتصال والمتابعة',
    description: 'حذف سجلات اتصالات المكالمات والواتساب التاريخية القديمة للعملاء.',
    table: 'communication_logs',
    icon: MessageSquare,
    color: 'text-emerald-600 bg-emerald-50',
    conditionDescription: 'سجلات المتابعة والاتصال المنفذة قبل التاريخ المحدد',
  },
  {
    id: 'inquiries',
    title: 'الاستعلامات المغلقة أو المحولة',
    description: 'حذف الاستعلامات القديمة التي حسمت بحالة (مغلق) أو (تم التحويل).',
    table: 'inquiries',
    icon: Filter,
    color: 'text-amber-600 bg-amber-50',
    conditionDescription: 'الاستعلامات بحالة (مغلق) أو (تم التحويل) قبل التاريخ المحدد',
  },
  {
    id: 'timeline',
    title: 'سجل أحداث خط زمن العملاء',
    description: 'تنظيف أرشيف تتبع حركة العملاء القديمة (customer_timeline).',
    table: 'customer_timeline',
    icon: Clock,
    color: 'text-purple-600 bg-purple-50',
    conditionDescription: 'أحداث الخط الزمني المسجلة قبل التاريخ المحدد',
  },
  {
    id: 'tasks',
    title: 'المهام المكتملة والقديمة',
    description: 'حذف المهام المنفذة والمكتملة التي مر عليها مدة طويلة.',
    table: 'tasks',
    icon: CheckSquare,
    color: 'text-teal-600 bg-teal-50',
    conditionDescription: 'المهام ذات الحالة (مكتملة) قبل التاريخ المحدد',
  },
  {
    id: 'operation_docs',
    title: 'مستندات التشغيل المؤرشفة',
    description: 'حذف سجلات مستندات ملفات التشغيل القديمة المؤرشفة.',
    table: 'operation_file_documents',
    icon: FileText,
    color: 'text-orange-600 bg-orange-50',
    conditionDescription: 'مستندات ملفات التشغيل المرفوعة قبل التاريخ المحدد',
  },
  {
    id: 'visa_records',
    title: 'التأشيرات المنتهية أو المرفوضة',
    description: 'تنظيف طلبات التأشيرات التاريخية المنتهية الصلاحية أو المرفوضة.',
    table: 'visa_management',
    icon: Plane,
    color: 'text-indigo-600 bg-indigo-50',
    conditionDescription: 'التأشيرات بحالة (منتهية) أو (مرفوضة) قبل التاريخ المحدد',
  },
  {
    id: 'cancelled_bookings',
    title: 'الحجوزات والرحلات الملغاة',
    description: 'حذف الحجوزات أو الرحلات الداخلية التي تم إلغاؤها سابقاً.',
    table: 'bookings',
    icon: Trash2,
    color: 'text-red-600 bg-red-50',
    conditionDescription: 'الحجوزات بحالة (ملغي) المسجلة قبل التاريخ المحدد',
  },
];

type CutoffPeriod = '1_month' | '3_months' | '6_months' | '1_year' | '2_years' | 'custom';

export default function SuperAdminPanel() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'permissions' | 'cleanup'>('permissions');
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdmin, setSelectedAdmin] = useState<ProfileItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Page access checkboxes
  const [pagePerms, setPagePerms] = useState<Record<string, boolean>>({});
  // Action perms checkboxes
  const [actionPerms, setActionPerms] = useState<Permissions>({} as Permissions);

  // Advanced Cleanup State
  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>({
    notifications: true,
    communication_logs: true,
    inquiries: false,
    timeline: false,
    tasks: false,
    operation_docs: false,
    visa_records: false,
    cancelled_bookings: false,
  });
  const [cutoffPeriod, setCutoffPeriod] = useState<CutoffPeriod>('6_months');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewCounts, setPreviewCounts] = useState<Record<string, number>>({});
  const [previewExecuted, setPreviewExecuted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmPhraseInput, setConfirmPhraseInput] = useState('');
  const [purging, setPurging] = useState(false);
  const [purgeMessage, setPurgeMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [cleanupAuditLog, setCleanupAuditLog] = useState<Array<{ date: string; admin: string; count: number; modules: string }>>([]);

  const isSuper = profile?.role === 'super_admin' || profile?.role === 'مالك النظام';

  const fetchProfiles = async () => {
    setLoading(true);
    const { data } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
    if (data) setProfiles(data as ProfileItem[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleSelectUser = (p: ProfileItem) => {
    setSelectedAdmin(p);
    setMessage('');
    const pages: Record<string, boolean> = {};
    ALL_PAGES.forEach((pg) => {
      pages[pg.key] = p.page_permissions?.[pg.key] ?? true;
    });
    setPagePerms(pages);
    setActionPerms({ ...p.permissions });
  };

  const handleTogglePage = (key: string) => {
    setPagePerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleAction = (key: keyof Permissions) => {
    setActionPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveUserPermissions = async () => {
    if (!selectedAdmin) return;
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('user_profiles')
      .update({
        permissions: actionPerms,
        page_permissions: pagePerms,
      })
      .eq('id', selectedAdmin.id);

    if (error) {
      setMessage(`خطأ أثناء الحفظ: ${error.message}`);
    } else {
      setMessage('تم حفظ الواجهات والصلاحيات بنجاح!');
      fetchProfiles();
    }
    setSaving(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (!error) {
      fetchProfiles();
      if (selectedAdmin?.id === userId) {
        setSelectedAdmin((prev) => (prev ? { ...prev, role: newRole } : null));
      }
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'نشط' ? 'غير نشط' : 'نشط';
    const { error } = await supabase
      .from('user_profiles')
      .update({ status: nextStatus })
      .eq('id', userId);

    if (!error) {
      fetchProfiles();
    }
  };

  // Helper date calculation
  const getCutoffDateISO = (): string => {
    const now = new Date();
    if (cutoffPeriod === '1_month') now.setMonth(now.getMonth() - 1);
    else if (cutoffPeriod === '3_months') now.setMonth(now.getMonth() - 3);
    else if (cutoffPeriod === '6_months') now.setMonth(now.getMonth() - 6);
    else if (cutoffPeriod === '1_year') now.setFullYear(now.getFullYear() - 1);
    else if (cutoffPeriod === '2_years') now.setFullYear(now.getFullYear() - 2);
    else if (cutoffPeriod === 'custom' && customToDate) return new Date(customToDate).toISOString();
    return now.toISOString();
  };

  // Run dry-run count estimation
  const runPreviewCount = async () => {
    setPreviewLoading(true);
    setPurgeMessage(null);
    const counts: Record<string, number> = {};
    const cutoffIso = getCutoffDateISO();

    for (const mod of CLEANUP_MODULES) {
      if (!selectedModules[mod.id]) continue;

      let q = supabase.from(mod.table).select('id', { count: 'exact', head: true });

      if (cutoffPeriod === 'custom' && customFromDate && customToDate) {
        q = q.gte('created_at', new Date(customFromDate).toISOString()).lte('created_at', new Date(customToDate).toISOString());
      } else {
        q = q.lt('created_at', cutoffIso);
      }

      // Add category conditions
      if (mod.id === 'notifications') q = q.or('is_read.eq.true,created_at.lt.' + cutoffIso);
      if (mod.id === 'inquiries') q = q.in('status', ['مغلق', 'تم التحويل']);
      if (mod.id === 'tasks') q = q.eq('status', 'مكتملة');
      if (mod.id === 'visa_records') q = q.in('visa_status', ['منتهية', 'مرفوضة']);
      if (mod.id === 'cancelled_bookings') q = q.eq('status', 'ملغي');

      const { count } = await q;
      counts[mod.id] = count || 0;
    }

    setPreviewCounts(counts);
    setPreviewExecuted(true);
    setPreviewLoading(false);
  };

  // Execute safe deletion
  const executePurge = async () => {
    if (confirmPhraseInput.trim() !== 'حذف_نهائي') {
      alert('رمز التأكيد غير صحيح! يُرجى كتابة "حذف_نهائي" تماماً كالمطلوب.');
      return;
    }

    setPurging(true);
    setPurgeMessage(null);
    const cutoffIso = getCutoffDateISO();
    let totalPurged = 0;
    const purgedModuleNames: string[] = [];

    try {
      for (const mod of CLEANUP_MODULES) {
        if (!selectedModules[mod.id]) continue;

        let q = supabase.from(mod.table).delete();

        if (cutoffPeriod === 'custom' && customFromDate && customToDate) {
          q = q.gte('created_at', new Date(customFromDate).toISOString()).lte('created_at', new Date(customToDate).toISOString());
        } else {
          q = q.lt('created_at', cutoffIso);
        }

        if (mod.id === 'notifications') q = q.or('is_read.eq.true,created_at.lt.' + cutoffIso);
        if (mod.id === 'inquiries') q = q.in('status', ['مغلق', 'تم التحويل']);
        if (mod.id === 'tasks') q = q.eq('status', 'مكتملة');
        if (mod.id === 'visa_records') q = q.in('visa_status', ['منتهية', 'مرفوضة']);
        if (mod.id === 'cancelled_bookings') q = q.eq('status', 'ملغي');

        const { error } = await q;
        if (error) {
          console.error(`Error purging ${mod.table}:`, error);
        } else {
          const c = previewCounts[mod.id] || 0;
          totalPurged += c;
          purgedModuleNames.push(mod.title);
        }
      }

      const logEntry = {
        date: new Date().toLocaleString('ar-EG'),
        admin: profile?.name || 'Super Admin',
        count: totalPurged,
        modules: purgedModuleNames.join(', ') || 'الأقسام المحددة',
      };

      setCleanupAuditLog([logEntry, ...cleanupAuditLog]);
      setPurgeMessage({
        text: `تم تنظيف البيانات بنجاح! إجمالي السجلات المحذوفة: ${totalPurged} سجل.`,
        type: 'success',
      });
      setShowConfirmModal(false);
      setConfirmPhraseInput('');
      setPreviewExecuted(false);
      setPreviewCounts({});
    } catch (err: any) {
      setPurgeMessage({ text: 'حدث خطأ أثناء عملية التنظيف: ' + (err?.message || 'خطأ غير معروف'), type: 'error' });
    }
    setPurging(false);
  };

  const totalPreviewItems = Object.values(previewCounts).reduce((a, b) => a + b, 0);

  if (!isSuper) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center text-red-700" dir="rtl">
        <AlertCircle size={40} className="mx-auto mb-2 text-red-500" />
        <h2 className="text-xl font-bold">وصول غير مصرح به</h2>
        <p className="text-sm mt-1">هذه الشاشة مخصصة فقط للـ Super Admin ومالك النظام.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-navy p-6 rounded-2xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gold-400/20 flex items-center justify-center text-gold-400">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">لوحة التحكم الفائقة (Super Admin Control Center)</h1>
            <p className="text-white/70 text-sm mt-1">
              إدارة الصلاحيات، تخصيص الواجهات، وصيانة البيانات والحذف المتقدم لقاعدة البيانات.
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl backdrop-blur">
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'permissions' ? 'bg-gold-500 text-navy-950 shadow' : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Key size={15} />
            إدارة الصلاحيات والواجهات
          </button>
          <button
            onClick={() => setActiveTab('cleanup')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'cleanup' ? 'bg-gold-500 text-navy-950 shadow' : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Database size={15} />
            الحذف والتنظيف المتقدم
          </button>
        </div>
      </div>

      {/* TAB 1: PERMISSIONS MANAGEMENT */}
      {activeTab === 'permissions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: List of Admins & Staff */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                <Key size={20} className="text-gold-500" />
                المستخدمون ({profiles.length})
              </h2>
              <button onClick={fetchProfiles} className="text-xs text-navy-700 hover:text-navy-900 flex items-center gap-1 font-bold">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                تحديث
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-400">جارٍ التحميل...</div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {profiles.map((p) => {
                  const isSelected = selectedAdmin?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectUser(p)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-gold-500 bg-gold-500/10 shadow-sm'
                          : 'border-gray-100 hover:border-navy-200 bg-gray-50/50'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-sm text-navy-900">{p.name}</p>
                        <p className="text-xs text-gray-500 dir-ltr text-right">{p.email}</p>
                        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-navy-100 text-navy-800 font-semibold">
                          {p.role}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusToggle(p.id, p.status);
                          }}
                          className={`text-[10px] px-2 py-1 rounded-lg font-bold ${
                            p.status === 'نشط' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {p.status}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Customizer */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
            {selectedAdmin ? (
              <>
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-navy-900">{selectedAdmin.name}</h3>
                    <p className="text-xs text-gray-500">{selectedAdmin.email}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-col text-xs">
                      <span className="text-gray-500 font-semibold">تغيير الوظيفة:</span>
                      <select
                        value={selectedAdmin.role}
                        onChange={(e) => handleRoleChange(selectedAdmin.id, e.target.value)}
                        className="form-input py-1 px-2 text-xs"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="مالك النظام">مالك النظام</option>
                        <option value="مدير النظام">مدير النظام</option>
                        <option value="مدير المبيعات">مدير المبيعات</option>
                        <option value="محاسب">محاسب</option>
                        <option value="موظف التشغيل">موظف التشغيل</option>
                        <option value="مسؤول طيران">مسؤول طيران</option>
                        <option value="مندوب مبيعات">مندوب مبيعات</option>
                      </select>
                    </div>
                    <button
                      onClick={handleSaveUserPermissions}
                      disabled={saving}
                      className="btn-gold text-xs py-2.5 px-4"
                    >
                      {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
                    </button>
                  </div>
                </div>

                {message && (
                  <div className={`p-3 rounded-xl text-sm ${message.includes('خطأ') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {message}
                  </div>
                )}

                {/* 1. Page Access Control */}
                <div className="space-y-3">
                  <h4 className="font-bold text-navy-900 text-sm flex items-center gap-2">
                    <Shield size={16} className="text-gold-500" />
                    1. الواجهات المتاحة لهذا الحساب (Page Access)
                  </h4>
                  <p className="text-xs text-gray-500">
                    حدد الشاشات والواجهات التي تظهر للمستخدم في القائمة الجانبية ويُسمح له بالدخول إليها:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-gray-50 rounded-xl border border-gray-100 max-h-60 overflow-y-auto">
                    {ALL_PAGES.map((p) => {
                      const isChecked = pagePerms[p.key] ?? true;
                      return (
                        <label key={p.key} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-100 hover:border-gold-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePage(p.key)}
                            className="w-4 h-4 rounded accent-gold-500"
                          />
                          <div>
                            <span className="text-xs font-semibold text-navy-900 block">{p.label}</span>
                            <span className="text-[9px] text-gray-400">{p.group}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Action Permissions Control */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h4 className="font-bold text-navy-900 text-sm flex items-center gap-2">
                    <ShieldCheck size={16} className="text-gold-500" />
                    2. الصلاحيات الدقيقة (الإضافة، التعديل، الحذف، والاعتماد)
                  </h4>
                  <p className="text-xs text-gray-500">
                    حدد الصلاحيات والإجراءات التي يُسمح للمستخدم بتنفيذها داخل الأقسام المصرح له بها:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-72 overflow-y-auto p-4 bg-gray-50 rounded-xl border border-gray-100">
                    {PERMISSION_GROUPS.map((grp) => (
                      <div key={grp.label} className="bg-white p-3 rounded-xl border border-gray-100 space-y-2">
                        <p className="text-xs font-bold text-gold-600 border-b pb-1">{grp.label}</p>
                        <div className="space-y-1.5">
                          {grp.items.map((item) => (
                            <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={actionPerms[item.key as keyof Permissions] ?? false}
                                onChange={() => handleToggleAction(item.key as keyof Permissions)}
                                className="w-3.5 h-3.5 rounded accent-navy-700"
                              />
                              <span className="text-xs text-gray-700">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <Shield size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-base font-semibold">اختر مستخدماً من القائمة لتحديد واجهاته وصلاحياته</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ADVANCED DATA PURGE & CLEANUP */}
      {activeTab === 'cleanup' && (
        <div className="space-y-6">
          {/* Banner note */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-800 text-sm">
            <AlertTriangle size={22} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-base">نظام الحذف والتنظيف المتقدم (Advanced Database Cleanup)</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                يُتيح لك هذا القسم تحديد الأرشيفات القديمة أو السجلات غير الضرورية وتفريغ مساحتها في قاعدة البيانات. 
                جميع العمليات مزودة بخاصية المعاينة وحساب السجلات قبل الحذف وبقفل أمان يمنع الحذف الخطأ.
              </p>
            </div>
          </div>

          {purgeMessage && (
            <div className={`p-4 rounded-2xl text-sm font-semibold flex items-center justify-between ${purgeMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                {purgeMessage.type === 'success' ? <CheckCircle size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-red-600" />}
                <span>{purgeMessage.text}</span>
              </div>
              <button onClick={() => setPurgeMessage(null)} className="text-xs underline font-normal">إغلاق</button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Box: Cutoff Range & Controls */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
              <div className="space-y-2">
                <h3 className="font-bold text-navy-900 text-sm flex items-center gap-2">
                  <Calendar size={18} className="text-gold-500" />
                  1. تحديد المهلة الزمنية والنطاق (Cutoff Period)
                </h3>
                <p className="text-xs text-gray-500">اختر عمر السجلات المراد حذفها لتفريغ مساحتها:</p>
              </div>

              <div className="space-y-2">
                {[
                  { key: '1_month', label: 'السجلات الأقدم من شهر واحد' },
                  { key: '3_months', label: 'السجلات الأقدم من 3 أشهر' },
                  { key: '6_months', label: 'السجلات الأقدم من 6 أشهر' },
                  { key: '1_year', label: 'السجلات الأقدم من سنة واحدة' },
                  { key: '2_years', label: 'السجلات الأقدم من سنتين' },
                  { key: 'custom', label: 'نطاق تواريخ مخصص (Custom Range)' },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      cutoffPeriod === opt.key ? 'border-gold-500 bg-gold-50/50 text-navy-900 font-bold' : 'border-gray-100 hover:border-gray-200 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cutoffPeriod"
                      checked={cutoffPeriod === opt.key}
                      onChange={() => setCutoffPeriod(opt.key as CutoffPeriod)}
                      className="accent-gold-500"
                    />
                    <span className="text-xs">{opt.label}</span>
                  </label>
                ))}
              </div>

              {cutoffPeriod === 'custom' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">من تاريخ:</label>
                    <input
                      type="date"
                      value={customFromDate}
                      onChange={(e) => setCustomFromDate(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">إلى تاريخ:</label>
                    <input
                      type="date"
                      value={customToDate}
                      onChange={(e) => setCustomToDate(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-gray-200"
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={runPreviewCount}
                  disabled={previewLoading}
                  className="btn-outline w-full justify-center text-xs py-3 gap-2"
                >
                  {previewLoading ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Eye size={16} className="text-navy-700" />
                  )}
                  معاينة وحساب السجلات المتأثرة (Dry Run)
                </button>

                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={!previewExecuted || totalPreviewItems === 0}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                    !previewExecuted || totalPreviewItems === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  <Trash2 size={16} />
                  تنفيذ حذف السجلات المحددة ({totalPreviewItems})
                </button>
              </div>
            </div>

            {/* Middle Box: Selectable Categories */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-navy-900 text-sm flex items-center gap-2">
                    <Database size={18} className="text-gold-500" />
                    2. تحديد الأقسام والجداول المراد تنظيفها
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">اختر الأقسام التي ترغب بتفريغ سجلاتها القديمة:</p>
                </div>
                {previewExecuted && (
                  <span className="text-xs font-bold bg-navy-50 text-navy-800 px-3 py-1 rounded-full border border-navy-100">
                    مجموع السجلات المعاينة: <span className="text-gold-600 text-sm">{totalPreviewItems}</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {CLEANUP_MODULES.map((mod) => {
                  const Icon = mod.icon;
                  const isChecked = !!selectedModules[mod.id];
                  const count = previewCounts[mod.id];

                  return (
                    <div
                      key={mod.id}
                      onClick={() =>
                        setSelectedModules((prev) => ({ ...prev, [mod.id]: !prev[mod.id] }))
                      }
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                        isChecked
                          ? 'border-gold-400 bg-gold-50/20 shadow-sm'
                          : 'border-gray-100 bg-gray-50/30 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mod.color}`}>
                            <Icon size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-navy-900 text-xs">{mod.title}</h4>
                            <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{mod.description}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded accent-gold-500 mt-1"
                        />
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                        <span className="text-gray-400 font-mono">جدول: {mod.table}</span>
                        {previewExecuted && (
                          <span
                            className={`font-bold px-2 py-0.5 rounded-full ${
                              count && count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {count !== undefined ? `${count} سجل` : '—'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Audit Trail History */}
              {cleanupAuditLog.length > 0 && (
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <h4 className="font-bold text-navy-900 text-xs flex items-center gap-2">
                    <Clock size={14} className="text-gold-500" />
                    سجل العمليات التاريخي الأخير (Audit History)
                  </h4>
                  <div className="space-y-2">
                    {cleanupAuditLog.map((log, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-xl text-xs flex items-center justify-between border border-gray-100">
                        <div>
                          <p className="font-bold text-navy-900">{log.admin} — {log.modules}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{log.date}</p>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-lg">
                          تم حذف {log.count} سجل
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION SAFETY MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-scaleUp border border-red-100">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
                <Lock size={24} />
              </div>
              <div>
                <h3 className="font-bold text-navy-900 text-lg">تأكيد الأمان والحذف النهائي</h3>
                <p className="text-xs text-red-600">عملية تنظيف البيانات مسألة حساسة ولا يمكن التراجع عنها!</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-xs space-y-2 text-gray-700">
              <div className="flex justify-between">
                <span>إجمالي السجلات التي سيتم حذفها:</span>
                <span className="font-bold text-red-600 text-sm">{totalPreviewItems} سجل</span>
              </div>
              <div className="flex justify-between">
                <span>المهلة الزمنية:</span>
                <span className="font-bold text-navy-900">{cutoffPeriod.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">
                للتأكيد والموافقة النهائية، اكتب العبارة التالية تماماً: <span className="text-red-600 font-black">حذف_نهائي</span>
              </label>
              <input
                type="text"
                value={confirmPhraseInput}
                onChange={(e) => setConfirmPhraseInput(e.target.value)}
                placeholder="اكتب: حذف_نهائي"
                className="w-full border-2 border-red-200 focus:border-red-500 rounded-xl p-3 text-sm font-bold text-center outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={executePurge}
                disabled={purging || confirmPhraseInput.trim() !== 'حذف_نهائي'}
                className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 ${
                  confirmPhraseInput.trim() === 'حذف_نهائي'
                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {purging ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                تأكيد وبدء الحذف
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmPhraseInput('');
                }}
                className="btn-secondary flex-1 justify-center text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

