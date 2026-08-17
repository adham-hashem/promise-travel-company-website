import { useEffect, useState } from 'react';
import { X, UserPlus, Loader2, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  getDefaultPermissions,
  PERMISSION_GROUPS,
  type Permissions,
  type UserRole,
} from '../lib/permissions';
import type { Employee } from '../types';

type Role = UserRole | 'مدير النظام';

const allRoles: Role[] = ['مندوب مبيعات', 'مدير المبيعات', 'محاسب', 'موظف التشغيل', 'مدير النظام', 'مالك النظام'];

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
}

const emptyForm = (): FormState => ({
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'مندوب مبيعات',
  status: 'نشط',
  permissions: getDefaultPermissions('مندوب مبيعات'),
});

export default function EmployeeAddModal({ open, onClose, onSaved, editEmployee }: Props) {
  const { session } = useAuth();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPerms, setShowPerms] = useState(false);

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
    });
  };

  const togglePerm = (key: keyof Permissions) => {
    setForm({
      ...form,
      permissions: { ...form.permissions, [key]: !form.permissions[key] },
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
      // Edit: update employees row + (optionally) user_profiles if email changed
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

      // Try to update user_profiles (linked via email)
      const { error: e2 } = await supabase
        .from('user_profiles')
        .update({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          role: form.role,
          status: form.status,
          permissions: form.permissions,
        })
        .eq('email', editEmployee.email);
      // Ignore if no matching profile

      if (e2) console.warn('Profile update skipped:', e2.message);
      setSaving(false);
      onSaved();
      onClose();
      return;
    }

    // Create new employee + auth user via create-user edge function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const fnUrl = `${supabaseUrl}/functions/v1/create-user`;
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
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data?.error || `فشل إنشاء المستخدم (${resp.status})`);
        setSaving(false);
        return;
      }
      // 2) Insert employee row linked by email so Header can find it
      const { error: e3 } = await supabase.from('employees').insert({
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
        // Non-fatal: auth user + profile were created; employee row can be re-added
        console.warn('Employee row insert failed (auth user was still created):', e3.message);
        setError('تم إنشاء حساب المستخدم ولكن تعذّر إضافته كموظف. تحقق من البريد الإلكتروني.');
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
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn my-8"
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
                {isEdit ? 'تحديث البيانات الأساسية' : 'سيتم إنشاء حساب دخول للموظف تلقائياً'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="form-label">الاسم الكامل <span className="text-red-500">*</span></label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="form-input"
                placeholder="مثال: أحمد محمد علي"
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
              />
            </div>
            <div>
              <label className="form-label">الوظيفة</label>
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
              <label className="form-label">الحالة</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="form-input"
              >
                <option value="نشط">نشط</option>
                <option value="غير نشط">غير نشط</option>
              </select>
            </div>
            <div className="col-span-2">
              <button
                type="button"
                onClick={() => setShowPerms((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-navy-300 transition-all"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-navy-700">
                  <Shield size={15} />الصلاحيات
                </span>
                <span className="text-xs text-gray-400">
                  {showPerms ? 'إخفاء' : 'تخصيص الصلاحيات'}
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
                            checked={form.permissions[item.key]}
                            onChange={() => togglePerm(item.key)}
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
          <button onClick={onClose} className="btn-outline">إلغاء</button>
          <button onClick={handleSave} disabled={saving} className="btn-gold">
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                {isEdit ? 'جارٍ الحفظ...' : 'جارٍ إنشاء الحساب...'}
              </span>
            ) : isEdit ? 'حفظ التعديلات' : 'إضافة الموظف'}
          </button>
        </div>
      </div>
    </div>
  );
}
