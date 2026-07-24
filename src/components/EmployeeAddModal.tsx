import { useEffect, useState } from 'react';
import { X, UserPlus, Loader2, Shield, Layout } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  getDefaultPermissions,
  getDefaultPagePermissions,
  PERMISSION_GROUPS,
  ALL_PAGES,
  type Permissions,
  type UserRole,
} from '../lib/permissions';
import type { Employee } from '../types';

type Role = UserRole | 'مدير النظام';

const allRoles: Role[] = ['super_admin', 'مالك النظام', 'مدير النظام', 'إضافة عملاء', 'مدير المبيعات', 'مندوب مبيعات', 'محاسب', 'موظف التشغيل', 'مسؤول طيران'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editEmployee?: Employee | null;
}

interface FormState {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: Role;
  status: string;
  permissions: Permissions;
  page_permissions: Record<string, boolean>;
}

const emptyForm = (): FormState => ({
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'إضافة عملاء',
  status: 'نشط',
  permissions: getDefaultPermissions('إضافة عملاء'),
  page_permissions: getDefaultPagePermissions('إضافة عملاء'),
});

export default function EmployeeAddModal({ open, onClose, onSaved, editEmployee }: Props) {
  const { session } = useAuth();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPerms, setShowPerms] = useState(false);
  const [showPages, setShowPages] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editEmployee) {
      const role = (editEmployee.role as Role) || 'مندوب مبيعات';
      setIsEdit(true);
      setForm({
        name: editEmployee.name,
        email: editEmployee.email || '',
        password: '',
        phone: editEmployee.phone || '',
        role,
        status: editEmployee.is_active ? 'نشط' : 'غير نشط',
        permissions: getDefaultPermissions(role),
        page_permissions: getDefaultPagePermissions(role),
      });
    } else {
      setIsEdit(false);
      setForm(emptyForm());
    }
  }, [open, editEmployee]);

  if (!open) return null;

  const onRoleChange = (role: Role) => {
    setForm({
      ...form,
      role,
      permissions: getDefaultPermissions(role),
      page_permissions: getDefaultPagePermissions(role),
    });
  };

  const togglePerm = (key: keyof Permissions) => {
    setForm({
      ...form,
      permissions: { ...form.permissions, [key]: !form.permissions[key] },
    });
  };

  const togglePage = (key: string) => {
    setForm({
      ...form,
      page_permissions: {
        ...form.page_permissions,
        [key]: !form.page_permissions[key],
      },
    });
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) { setError('الاسم مطلوب'); return; }
    if (!form.email.trim()) { setError('البريد الإلكتروني مطلوب'); return; }
    if (!isEdit && !form.password) { setError('كلمة المرور مطلوبة'); return; }
    if (!isEdit && form.password.length < 6) { setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }

    setSaving(true);

    if (isEdit && editEmployee) {
      const empPayload = {
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        role: form.role,
        is_active: form.status === 'نشط',
      };
      const { error: e1 } = await supabase
        .from('employees')
        .update(empPayload)
        .eq('id', editEmployee.id);
      if (e1) { setError(e1.message); setSaving(false); return; }

      const { error: e2 } = await supabase
        .from('user_profiles')
        .update({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          role: form.role,
          status: form.status,
          permissions: form.permissions,
          page_permissions: form.page_permissions,
        })
        .eq('email', editEmployee.email);

      if (e2) console.warn('Profile update skipped:', e2.message);
      setSaving(false);
      onSaved();
      onClose();
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const fnUrl = `${supabaseUrl}/functions/v1/create-user`;
    let createdAuthId: string | null = null;

    try {
      const resp = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          role: form.role,
          status: form.status,
          permissions: form.permissions,
          page_permissions: form.page_permissions,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        createdAuthId = data?.user?.id || data?.id || null;
      }
    } catch (fnErr) {
      console.warn('Edge function unavailable or failed, falling back to direct auth/DB creation:', fnErr);
    }

    try {
      if (!createdAuthId) {
        const { data: signUpData } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              name: form.name,
              role: form.role,
            },
          },
        });
        if (signUpData?.user?.id) {
          createdAuthId = signUpData.user.id;
        }
      }

      const newId = createdAuthId || crypto.randomUUID();

      await supabase.from('user_profiles').upsert({
        id: newId,
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        role: form.role,
        status: form.status,
        permissions: form.permissions,
        page_permissions: form.page_permissions,
      });

      const { error: e3 } = await supabase.from('employees').upsert({
        id: newId,
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        role: form.role,
        is_active: form.status === 'نشط',
        target_percentage: 0,
        clients_count: 0,
        bookings_count: 0,
      });

      if (e3) {
        console.error('Employee row upsert failed:', e3.message);
        setError(e3.message);
        setSaving(false);
        return;
      }

      setSaving(false);
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-xl shadow-2xl animate-fadeIn my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-navy rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">{isEdit ? 'تعديل بيانات موظف' : 'إضافة موظف جديد'}</h3>
              <p className="text-white/60 text-xs">
                {isEdit ? 'تحديث البيانات والواجهات والصلاحيات' : 'إنشاء حساب وتخصيص الشاشات المصرحة'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Wrap */}
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          {/* Body */}
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="form-label">الاسم الكامل <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="form-input"
                  placeholder="مثال: أحمد محمد علي"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="form-label">البريد الإلكتروني <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  dir="ltr"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="form-input"
                  placeholder="employee@promise.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="form-label">
                  كلمة المرور {!isEdit && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="form-input"
                  placeholder={isEdit ? 'اتركها فارغة للإبقاء عليها' : '••••••••'}
                  disabled={isEdit}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="form-label">رقم الهاتف</label>
                <input
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="form-input"
                  placeholder="01xxxxxxxxx"
                  autoComplete="tel"
                />
              </div>
              <div>
                <label className="form-label">الوظيفة الأساسية</label>
                <select
                  value={form.role}
                  onChange={(e) => onRoleChange(e.target.value as Role)}
                  className="form-input"
                >
                  {allRoles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">حالة الحساب</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="form-input"
                >
                  <option value="نشط">نشط</option>
                  <option value="غير نشط">غير نشط</option>
                </select>
              </div>

              {/* Custom Page Access Selection */}
              <div className="col-span-2">
                <button
                  type="button"
                  onClick={() => setShowPages((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gold-50 rounded-xl border border-gold-200 hover:border-gold-400 transition-all"
                >
                  <span className="flex items-center gap-2 text-sm font-bold text-navy-900">
                    <Layout size={16} className="text-gold-600" /> تحديد الواجهات الظاهرة للموظف (Page Control)
                  </span>
                  <span className="text-xs text-navy-600 font-medium">
                    {showPages ? 'إخفاء' : 'تخصيص الواجهات'}
                  </span>
                </button>
                {showPages && (
                  <div className="mt-2 grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 max-h-48 overflow-y-auto animate-fadeIn">
                    {ALL_PAGES.map((pg) => (
                      <label key={pg.key} className="flex items-center gap-2 cursor-pointer p-1.5 bg-white rounded-lg border border-gray-100">
                        <input
                          type="checkbox"
                          checked={form.page_permissions[pg.key] ?? false}
                          onChange={() => togglePage(pg.key)}
                          className="w-3.5 h-3.5 rounded accent-gold-500"
                        />
                        <span className="text-xs text-navy-900 font-semibold">{pg.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Action Permissions Selection */}
              <div className="col-span-2">
                <button
                  type="button"
                  onClick={() => setShowPerms((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-navy-300 transition-all"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-navy-700">
                    <Shield size={15} /> صلاحيات الإضافة، التعديل والحذف
                  </span>
                  <span className="text-xs text-gray-400">
                    {showPerms ? 'إخفاء' : 'تخصيص الإجراءات'}
                  </span>
                </button>
                {showPerms && (
                  <div className="mt-2 grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 animate-fadeIn">
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.label} className="space-y-1.5">
                        <p className="text-[10px] font-bold text-navy-700 uppercase mt-1">{group.label}</p>
                        {group.items.map((item) => (
                          <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.permissions[item.key as keyof Permissions] ?? false}
                              onChange={() => togglePerm(item.key as keyof Permissions)}
                              className="w-3.5 h-3.5 rounded accent-navy-700"
                            />
                            <span className="text-[11px] text-gray-600">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-outline">إلغاء</button>
            <button type="submit" disabled={saving} className="btn-gold">
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  {isEdit ? 'جارٍ الحفظ...' : 'جارٍ إنشاء الحساب...'}
                </span>
              ) : isEdit ? 'حفظ التعديلات' : 'إضافة الموظف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
