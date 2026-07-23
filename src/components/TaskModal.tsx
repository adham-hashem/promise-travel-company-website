import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Employee, Task, TaskPriority, TaskStatus } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  employees: Employee[];
  defaultEmployeeId?: string;
  editTask?: Task | null;
}

const priorities: TaskPriority[] = ['منخفضة', 'متوسطة', 'عالية'];
const statuses: TaskStatus[] = ['جديدة', 'قيد التنفيذ', 'مكتملة', 'متأخرة'];

const priorityColors: Record<string, string> = {
  منخفضة: 'border-gray-200 text-gray-700',
  متوسطة: 'border-amber-300 text-amber-700',
  عالية: 'border-red-300 text-red-700',
};

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyForm = {
  title: '',
  description: '',
  employee_id: '',
  priority: 'متوسطة' as TaskPriority,
  status: 'جديدة' as TaskStatus,
  start_date: todayStr(),
  due_date: todayStr(),
};

export default function TaskModal({ open, onClose, onSaved, employees, defaultEmployeeId, editTask }: Props) {
  const [form, setForm] = useState({
    ...emptyForm,
    employee_id: defaultEmployeeId || employees[0]?.id || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sync form when modal opens for edit or default employee changes
  useEffect(() => {
    if (editTask) {
      setForm({
        title: editTask.title,
        description: editTask.description || '',
        employee_id: editTask.employee_id,
        priority: editTask.priority,
        status: editTask.status,
        start_date: editTask.start_date,
        due_date: editTask.due_date,
      });
    } else {
      setForm({ ...emptyForm, employee_id: defaultEmployeeId || employees[0]?.id || '' });
    }
  }, [editTask, defaultEmployeeId]);

  if (!open) return null;

  const handleSave = async () => {
    setError('');
    if (!form.title) { setError('عنوان المهمة مطلوب'); return; }
    if (!form.employee_id) { setError('اختر موظفاً'); return; }
    if (!form.due_date) { setError('الموعد النهائي مطلوب'); return; }
    setSaving(true);

    const payload = {
      title: form.title,
      description: form.description || null,
      employee_id: form.employee_id,
      priority: form.priority,
      status: form.status,
      start_date: form.start_date,
      due_date: form.due_date,
      completed_at: form.status === 'مكتملة' ? new Date().toISOString() : null,
    };

    let error: string | null = null;
    if (editTask) {
      const { error: e } = await supabase.from('tasks').update(payload).eq('id', editTask.id);
      error = e?.message || null;
    } else {
      const { error: e } = await supabase.from('tasks').insert(payload);
      error = e?.message || null;
      // Insert a task_assigned notification for new tasks
      if (!e) {
        await supabase.from('notifications').insert({
          employee_id: form.employee_id,
          type: 'task_assigned',
          title: 'تعيين مهمة جديدة',
          body: form.title,
        });
      }
    }

    if (error) {
      setError(error);
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-navy-900">{editTask ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="form-label">عنوان المهمة <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="form-input" placeholder="مثال: التواصل مع 20 عميل" />
          </div>
          <div>
            <label className="form-label">الوصف</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="form-input" rows={2} placeholder="تفاصيل المهمة..." />
          </div>
          <div>
            <label className="form-label">الموظف المسؤول <span className="text-red-500">*</span></label>
            <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="form-input">
              <option value="">اختر موظفاً</option>
              {employees.filter((e) => e.is_active).map((e) => (
                <option key={e.id} value={e.id}>{e.name} — {e.role}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">الأولوية</label>
              <div className="flex gap-1.5">
                {priorities.map((p) => (
                  <button key={p} type="button" onClick={() => setForm({ ...form, priority: p })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${form.priority === p ? priorityColors[p] + ' bg-white' : 'border-gray-100 text-gray-400'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">الحالة</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })} className="form-input">
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">تاريخ البداية</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">الموعد النهائي</label>
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="form-input" />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline">إلغاء</button>
          <button onClick={handleSave} disabled={saving} className="btn-gold">
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                جارٍ الحفظ...
              </span>
            ) : editTask ? 'حفظ التعديلات' : 'إضافة المهمة'}
          </button>
        </div>
      </div>
    </div>
  );
}
