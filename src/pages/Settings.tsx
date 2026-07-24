import { useState, useEffect } from 'react';
import {
  Users, Shield, Settings as SettingsIcon, Plus, Pencil, Check,
  Trash2, UserX, UserCheck, ChevronDown, X, Eye, EyeOff,
  CheckSquare, Building2, ShoppingBag, DollarSign, FileCheck,
  MapPin, UserCog, BarChart3, Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { UserProfile } from '../contexts/AuthContext';
import type { Permissions, UserRole } from '../lib/permissions';
import { getDefaultPermissions } from '../lib/permissions';

const tabs = [
  { id: 'users', label: 'المستخدمون', icon: Users },
  { id: 'permissions', label: 'الصلاحيات', icon: Shield },
  { id: 'system', label: 'إعدادات النظام', icon: SettingsIcon },
];

const roles: UserRole[] = ['مالك النظام', 'إضافة عملاء', 'مدير المبيعات', 'مندوب مبيعات', 'محاسب', 'موظف التشغيل', 'مسؤول طيران'];

const roleColors: Record<string, string> = {
  'مالك النظام': 'bg-gold-100 text-gold-700 border-gold-200',
  'مدير النظام': 'bg-navy-100 text-navy-700 border-navy-200',
  'إضافة عملاء': 'bg-teal-100 text-teal-700 border-teal-200',
  'مدير المبيعات': 'bg-purple-100 text-purple-700 border-purple-200',
  'مندوب مبيعات': 'bg-blue-100 text-blue-700 border-blue-200',
  'محاسب': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'موظف التشغيل': 'bg-orange-100 text-orange-700 border-orange-200',
  'مسؤول طيران': 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

// Section-based permission matrix definition
interface PermSection {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  permissions: {
    view?: keyof Permissions;
    add?: keyof Permissions;
    edit?: keyof Permissions;
    delete?: keyof Permissions;
    print?: keyof Permissions;
    export?: keyof Permissions;
  };
}

const PERM_SECTIONS: PermSection[] = [
  {
    id: 'sales', label: 'إدارة المبيعات', icon: ShoppingBag, color: 'text-blue-600 bg-blue-50',
    permissions: {
      view: 'customers_view', add: 'customers_add', edit: 'customers_edit', delete: 'customers_delete',
    },
  },
  {
    id: 'inquiries', label: 'الاستعلامات', icon: Zap, color: 'text-amber-600 bg-amber-50',
    permissions: {
      view: 'inquiries_view', add: 'inquiries_add', edit: 'inquiries_edit', delete: 'inquiries_delete',
    },
  },
  {
    id: 'bookings', label: 'الحجوزات', icon: CheckSquare, color: 'text-emerald-600 bg-emerald-50',
    permissions: {
      view: 'bookings_view', add: 'bookings_add', edit: 'bookings_edit', delete: 'bookings_delete',
    },
  },
  {
    id: 'packages', label: 'الباقات والعروض', icon: CheckSquare, color: 'text-violet-600 bg-violet-50',
    permissions: {
      view: 'packages_view', add: 'packages_add', edit: 'packages_edit', delete: 'packages_delete',
    },
  },
  {
    id: 'accounting', label: 'الحسابات', icon: DollarSign, color: 'text-green-600 bg-green-50',
    permissions: {
      view: 'accounting_revenue', add: 'accounting_payments', edit: 'accounting_installments',
      delete: 'accounting_expenses', print: 'accounting_commissions',
    },
  },
  {
    id: 'invoices', label: 'الفواتير', icon: CheckSquare, color: 'text-teal-600 bg-teal-50',
    permissions: {
      view: 'invoices_view', add: 'invoices_add', edit: 'invoices_edit', delete: 'invoices_delete',
    },
  },
  {
    id: 'operations', label: 'التشغيل', icon: FileCheck, color: 'text-orange-600 bg-orange-50',
    permissions: {
      view: 'documents_view', add: 'documents_upload', edit: 'documents_review', delete: 'operations_access',
    },
  },
  {
    id: 'hotels', label: 'إدارة الفنادق', icon: Building2, color: 'text-cyan-600 bg-cyan-50',
    permissions: {
      view: 'hotels_view', add: 'hotels_add', edit: 'hotels_edit', delete: 'hotels_delete',
    },
  },
  {
    id: 'internal', label: 'السياحة الداخلية', icon: MapPin, color: 'text-pink-600 bg-pink-50',
    permissions: {
      view: 'reports_view', export: 'reports_export_excel', print: 'reports_export_pdf',
    },
  },
  {
    id: 'hr', label: 'إدارة الموظفين', icon: UserCog, color: 'text-indigo-600 bg-indigo-50',
    permissions: {
      view: 'employees_view', add: 'employees_add', edit: 'employees_edit', delete: 'employees_delete',
    },
  },
  {
    id: 'reports', label: 'التقارير', icon: BarChart3, color: 'text-navy-600 bg-navy-50',
    permissions: {
      view: 'reports_view', print: 'reports_export_pdf', export: 'reports_export_excel',
    },
  },
  {
    id: 'settings', label: 'الإعدادات', icon: SettingsIcon, color: 'text-gray-600 bg-gray-100',
    permissions: {
      view: 'settings_access', edit: 'settings_edit',
    },
  },
];

const COLS = [
  { key: 'view', label: 'عرض' },
  { key: 'add', label: 'إضافة' },
  { key: 'edit', label: 'تعديل' },
  { key: 'delete', label: 'حذف' },
  { key: 'print', label: 'طباعة' },
  { key: 'export', label: 'تصدير' },
] as const;

const emptyForm = {
  name: '', email: '', password: '', phone: '',
  role: 'مندوب مبيعات' as UserRole, status: 'نشط',
};

type ActionMenu = { userId: string; x: number; y: number } | null;

export default function Settings() {
  const { profile: currentProfile, can, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [permissions, setPermissions] = useState<Permissions>(getDefaultPermissions('مندوب مبيعات'));
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [actionMenu, setActionMenu] = useState<ActionMenu>(null);

  // Selected user for the permission matrix editor
  const [selectedPermUser, setSelectedPermUser] = useState<UserProfile | null>(null);
  const [permUserPerms, setPermUserPerms] = useState<Permissions>(getDefaultPermissions('مندوب مبيعات'));

  const [systemSettings, setSystemSettings] = useState({
    companyName: 'Promise للحج والعمرة',
    phone: '01012345678',
    email: 'info@promise.com',
    address: 'القاهرة، مصر',
  });
  const [sysSaved, setSysSaved] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
    setUsers((data as UserProfile[]) || []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditUser(null);
    setForm(emptyForm);
    setPermissions(getDefaultPermissions('مندوب مبيعات'));
    setModalError('');
    setShowModal(true);
  };

  const openEdit = (u: UserProfile) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: '', phone: u.phone || '', role: u.role, status: u.status });
    setPermissions({ ...getDefaultPermissions(u.role), ...u.permissions });
    setModalError('');
    setShowModal(true);
    setActionMenu(null);
  };

  const handleRoleChange = (role: UserRole) => {
    setForm(f => ({ ...f, role }));
    setPermissions(getDefaultPermissions(role));
  };

  const togglePermission = (key: keyof Permissions) => {
    setPermissions(p => ({ ...p, [key]: !p[key] }));
  };

  const handleSave = async () => {
    setModalError('');
    if (!form.name || !form.email) { setModalError('الاسم والبريد الإلكتروني مطلوبان'); return; }
    if (!editUser && !form.password) { setModalError('كلمة المرور مطلوبة'); return; }
    setSaving(true);

    if (editUser) {
      const { error } = await supabase.from('user_profiles').update({
        name: form.name, phone: form.phone || null, role: form.role, status: form.status, permissions,
      }).eq('id', editUser.id);
      if (error) { setModalError(error.message); setSaving(false); return; }
      await loadUsers();
      if (editUser.id === currentProfile?.id) await refreshProfile();
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, phone: form.phone, role: form.role, status: form.status, permissions }),
      });
      const result = await res.json();
      if (!res.ok) { setModalError(result.error || 'حدث خطأ'); setSaving(false); return; }
      await loadUsers();
    }
    setSaving(false);
    setShowModal(false);
  };

  const handleDisable = async (u: UserProfile) => {
    const newStatus = u.status === 'نشط' ? 'غير نشط' : 'نشط';
    await supabase.from('user_profiles').update({ status: newStatus }).eq('id', u.id);
    setUsers(users.map(x => x.id === u.id ? { ...x, status: newStatus } : x));
    setActionMenu(null);
  };

  const handleDelete = async (u: UserProfile) => {
    if (!confirm(`هل أنت متأكد من حذف مستخدم "${u.name}"؟ لا يمكن التراجع.`)) return;
    setActionMenu(null);
    await supabase.from('user_profiles').delete().eq('id', u.id);
    setUsers(users.filter(x => x.id !== u.id));
  };

  // Permission matrix: select a user and edit their permissions live
  const openPermUser = (u: UserProfile) => {
    setSelectedPermUser(u);
    setPermUserPerms({ ...getDefaultPermissions(u.role), ...u.permissions });
    setPermSaved(false);
  };

  const togglePermUserPerm = async (key: keyof Permissions) => {
    if (!selectedPermUser) return;
    const updated = { ...permUserPerms, [key]: !permUserPerms[key] };
    setPermUserPerms(updated);
    // Save immediately to DB
    await supabase.from('user_profiles').update({ permissions: updated }).eq('id', selectedPermUser.id);
    if (selectedPermUser.id === currentProfile?.id) await refreshProfile();
    setUsers(prev => prev.map(u => u.id === selectedPermUser.id ? { ...u, permissions: updated } : u));
  };

  const toggleSectionFull = async (section: PermSection) => {
    if (!selectedPermUser) return;
    const keys = Object.values(section.permissions).filter(Boolean) as Array<keyof Permissions>;
    const allOn = keys.every(k => permUserPerms[k]);
    const updated = { ...permUserPerms };
    keys.forEach(k => { updated[k] = !allOn; });
    setPermUserPerms(updated);
    await supabase.from('user_profiles').update({ permissions: updated }).eq('id', selectedPermUser.id);
    if (selectedPermUser.id === currentProfile?.id) await refreshProfile();
    setUsers(prev => prev.map(u => u.id === selectedPermUser.id ? { ...u, permissions: updated } : u));
  };

  const isOwner = currentProfile?.role === 'مالك النظام';

  return (
    <div className="space-y-5" dir="rtl" onClick={() => setActionMenu(null)}>
      <div>
        <h2 className="section-title">الإعدادات</h2>
        <p className="section-subtitle">إدارة النظام والمستخدمين والصلاحيات</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit">
        {tabs.map(t => {
          const Icon = t.icon;
          if (t.id === 'system' && !can('settings_edit')) return null;
          if (t.id === 'permissions' && !isOwner) return null;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === t.id ? 'bg-navy-800 text-white shadow' : 'text-gray-600 hover:text-navy-700 hover:bg-gray-50'}`}>
              <Icon size={15} />{t.label}
            </button>
          );
        })}
      </div>

      {/* ── Users Tab ── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{users.filter(u => u.status === 'نشط').length} مستخدمين نشطين</p>
            {isOwner && (
              <button onClick={openAdd} className="btn-gold text-sm py-2 px-4"><Plus size={15} />إضافة مستخدم</button>
            )}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">لا يوجد مستخدمون بعد</p>
              </div>
            ) : (
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th>المستخدم</th>
                    <th>البريد الإلكتروني</th>
                    <th>الصلاحية</th>
                    <th>الحالة</th>
                    <th>تاريخ الإضافة</th>
                    {isOwner && <th>إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-navy flex items-center justify-center text-white font-bold text-sm">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{u.name}</p>
                            {u.id === currentProfile?.id && <span className="text-[10px] text-gold-600 font-medium">أنت</span>}
                          </div>
                        </div>
                      </td>
                      <td className="text-gray-600 text-xs" dir="ltr">{u.email}</td>
                      <td>
                        <span className={`badge border text-xs ${roleColors[u.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{u.role}</span>
                      </td>
                      <td>
                        <span className={`badge ${u.status === 'نشط' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{u.status}</span>
                      </td>
                      <td className="text-gray-500 text-xs">{new Date(u.created_at).toLocaleDateString('ar-EG')}</td>
                      {isOwner && (
                        <td onClick={e => e.stopPropagation()}>
                          <div className="relative">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActionMenu(actionMenu?.userId === u.id ? null : { userId: u.id, x: rect.left, y: rect.bottom });
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors"
                            >
                              إجراءات <ChevronDown size={12} />
                            </button>
                            {actionMenu?.userId === u.id && (
                              <div className="absolute left-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-fadeIn">
                                <button onClick={() => openEdit(u)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                  <Pencil size={14} className="text-gold-500" />تعديل البيانات
                                </button>
                                {u.id !== currentProfile?.id && (
                                  <>
                                    <button onClick={() => handleDisable(u)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                      {u.status === 'نشط' ? <><UserX size={14} className="text-orange-500" />تعطيل الحساب</> : <><UserCheck size={14} className="text-emerald-500" />تفعيل الحساب</>}
                                    </button>
                                    <div className="h-px bg-gray-100 mx-3" />
                                    <button onClick={() => handleDelete(u)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                      <Trash2 size={14} />حذف المستخدم
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Permissions Tab ── */}
      {activeTab === 'permissions' && isOwner && (
        <div className="space-y-5">
          {/* User selector */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm font-semibold text-navy-900 mb-3">اختر المستخدم لتعديل صلاحياته:</p>
            <div className="flex flex-wrap gap-2">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => openPermUser(u)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-all ${
                    selectedPermUser?.id === u.id
                      ? 'bg-navy-900 text-white border-navy-900 shadow'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-navy-400'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    selectedPermUser?.id === u.id ? 'bg-white/20 text-white' : 'bg-navy-100 text-navy-700'
                  }`}>
                    {u.name.charAt(0)}
                  </div>
                  <span className="font-medium">{u.name}</span>
                  <span className={`badge text-[10px] border ${roleColors[u.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{u.role}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Permission matrix */}
          {selectedPermUser && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-navy-900">صلاحيات: {selectedPermUser.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">التغييرات تُحفظ تلقائياً وتؤثر فوراً على واجهة المستخدم</p>
                </div>
                <span className={`badge border text-xs ${roleColors[selectedPermUser.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {selectedPermUser.role}
                </span>
              </div>

              {selectedPermUser.role === 'مالك النظام' ? (
                <div className="p-8 text-center text-gray-400">
                  <Shield size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">مالك النظام لديه صلاحية كاملة على كل شيء</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-right px-5 py-3 font-semibold text-gray-600 text-sm w-48">القسم</th>
                        {COLS.map(col => (
                          <th key={col.key} className="px-3 py-3 text-center font-semibold text-gray-600 text-xs">{col.label}</th>
                        ))}
                        <th className="px-3 py-3 text-center font-semibold text-gray-600 text-xs">صلاحية كاملة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PERM_SECTIONS.map((section, idx) => {
                        const SectionIcon = section.icon;
                        const sectionKeys = Object.values(section.permissions).filter(Boolean) as Array<keyof Permissions>;
                        const allOn = sectionKeys.length > 0 && sectionKeys.every(k => permUserPerms[k]);

                        return (
                          <tr key={section.id} className={`border-b border-gray-50 ${idx % 2 === 0 ? '' : 'bg-gray-50/30'} hover:bg-navy-50/20 transition-colors`}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${section.color}`}>
                                  <SectionIcon size={13} />
                                </div>
                                <span className="font-semibold text-navy-900 text-sm">{section.label}</span>
                              </div>
                            </td>
                            {COLS.map(col => {
                              const permKey = section.permissions[col.key as keyof typeof section.permissions];
                              if (!permKey) {
                                return <td key={col.key} className="px-3 py-3 text-center"><span className="text-gray-200 text-lg">—</span></td>;
                              }
                              const checked = permUserPerms[permKey];
                              return (
                                <td key={col.key} className="px-3 py-3 text-center">
                                  <button
                                    onClick={() => togglePermUserPerm(permKey)}
                                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mx-auto transition-all ${
                                      checked
                                        ? 'bg-navy-700 border-navy-700 shadow-sm'
                                        : 'border-gray-300 hover:border-navy-400 bg-white'
                                    }`}
                                  >
                                    {checked && <Check size={12} className="text-white" />}
                                  </button>
                                </td>
                              );
                            })}
                            {/* Full access toggle */}
                            <td className="px-3 py-3 text-center">
                              <button
                                onClick={() => toggleSectionFull(section)}
                                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mx-auto transition-all ${
                                  allOn
                                    ? 'bg-gold-500 border-gold-500 shadow-sm'
                                    : 'border-gray-300 hover:border-gold-400 bg-white'
                                }`}
                              >
                                {allOn && <Check size={12} className="text-white" />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!selectedPermUser && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
              <Shield size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">اختر مستخدمًا من القائمة أعلاه لعرض وتعديل صلاحياته</p>
            </div>
          )}
        </div>
      )}

      {/* ── System Settings Tab ── */}
      {activeTab === 'system' && can('settings_edit') && (
        <div className="max-w-2xl">
          {sysSaved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-5 py-3 text-sm font-medium flex items-center gap-2 mb-4">
              <Check size={16} />تم حفظ الإعدادات بنجاح
            </div>
          )}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h3 className="text-sm font-bold text-navy-800 pb-3 border-b border-gray-100 flex items-center gap-2">
              <div className="w-1 h-5 bg-gold-500 rounded-full" />بيانات الشركة
            </h3>
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="form-label">اسم الشركة</label>
                <input value={systemSettings.companyName} onChange={e => setSystemSettings({ ...systemSettings, companyName: e.target.value })} className="form-input" />
              </div>
              <div>
                <label className="form-label">رقم الهاتف</label>
                <input value={systemSettings.phone} onChange={e => setSystemSettings({ ...systemSettings, phone: e.target.value })} className="form-input" dir="ltr" />
              </div>
              <div>
                <label className="form-label">البريد الإلكتروني</label>
                <input value={systemSettings.email} onChange={e => setSystemSettings({ ...systemSettings, email: e.target.value })} className="form-input" dir="ltr" />
              </div>
              <div className="col-span-2">
                <label className="form-label">العنوان</label>
                <input value={systemSettings.address} onChange={e => setSystemSettings({ ...systemSettings, address: e.target.value })} className="form-input" />
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => { setSysSaved(true); setTimeout(() => setSysSaved(false), 2000); }} className="btn-gold">
                <Check size={16} />حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit User Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-navy-900">
                {editUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div>
                <h4 className="text-xs font-bold text-navy-700 mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 bg-gold-500 rounded-full" />البيانات الأساسية
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">الاسم الكامل <span className="text-red-500">*</span></label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="form-input" placeholder="الاسم الكامل" />
                  </div>
                  <div>
                    <label className="form-label">البريد الإلكتروني <span className="text-red-500">*</span></label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                      className={`form-input ${editUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                      placeholder="user@promise.com" dir="ltr" disabled={!!editUser} />
                    {editUser && <p className="text-[10px] text-gray-400 mt-1">لا يمكن تعديل البريد الإلكتروني</p>}
                  </div>
                  {!editUser && (
                    <div>
                      <label className="form-label">كلمة المرور <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={form.password}
                          onChange={e => setForm({ ...form, password: e.target.value })}
                          className="form-input pl-9" placeholder="••••••••" dir="ltr" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-1/2 -translate-y-1/2 left-2.5 text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="form-label">رقم الهاتف</label>
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="form-input" placeholder="01xxxxxxxxx" dir="ltr" />
                  </div>
                  <div>
                    <label className="form-label">الوظيفة / الصلاحية</label>
                    <select value={form.role} onChange={e => handleRoleChange(e.target.value as UserRole)} className="form-input">
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">الحالة</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="form-input">
                      <option value="نشط">نشط</option>
                      <option value="غير نشط">غير نشط</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Quick permissions matrix in modal */}
              <div>
                <h4 className="text-xs font-bold text-navy-700 mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-gold-500 rounded-full" />الصلاحيات
                  <span className="text-[10px] font-normal text-gray-400">— محددة تلقائياً حسب الدور، يمكن تعديلها</span>
                </h4>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-right px-3 py-2 font-semibold text-gray-600">القسم</th>
                        {COLS.map(col => (
                          <th key={col.key} className="px-2 py-2 text-center font-semibold text-gray-600">{col.label}</th>
                        ))}
                        <th className="px-2 py-2 text-center font-semibold text-gray-600">الكل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PERM_SECTIONS.map((section, idx) => {
                        const SectionIcon = section.icon;
                        const sectionKeys = Object.values(section.permissions).filter(Boolean) as Array<keyof Permissions>;
                        const allOn = sectionKeys.length > 0 && sectionKeys.every(k => permissions[k]);
                        return (
                          <tr key={section.id} className={idx % 2 === 0 ? '' : 'bg-gray-50/50'}>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-5 h-5 rounded flex items-center justify-center ${section.color}`}><SectionIcon size={10} /></div>
                                <span className="font-medium text-gray-700">{section.label}</span>
                              </div>
                            </td>
                            {COLS.map(col => {
                              const permKey = section.permissions[col.key as keyof typeof section.permissions];
                              if (!permKey) return <td key={col.key} className="px-2 py-2 text-center"><span className="text-gray-200">—</span></td>;
                              const checked = permissions[permKey];
                              return (
                                <td key={col.key} className="px-2 py-2 text-center">
                                  <button onClick={() => togglePermission(permKey)}
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all ${checked ? 'bg-navy-700 border-navy-700' : 'border-gray-300 hover:border-navy-400'}`}>
                                    {checked && <Check size={9} className="text-white" />}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="px-2 py-2 text-center">
                              <button
                                onClick={() => {
                                  const updated = { ...permissions };
                                  sectionKeys.forEach(k => { updated[k] = !allOn; });
                                  setPermissions(updated);
                                }}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all ${allOn ? 'bg-gold-500 border-gold-500' : 'border-gray-300 hover:border-gold-400'}`}>
                                {allOn && <Check size={9} className="text-white" />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {modalError && (
              <div className="mx-6 mb-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">{modalError}</div>
            )}

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-outline">إلغاء</button>
              <button onClick={handleSave} disabled={saving} className="btn-gold">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    جارٍ الحفظ...
                  </span>
                ) : editUser ? 'حفظ التعديلات' : 'إضافة المستخدم'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
