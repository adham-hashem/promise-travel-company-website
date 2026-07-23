import { useEffect, useState } from 'react';
import {
  Plus, X, Loader2, CheckCircle2, Clock, AlertCircle, ListChecks,
  Filter, Search, Hash, User, Calendar, Trash2, Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Task, TaskPriority, TaskStatus, Employee, Page } from '../types';

const priorities: TaskPriority[] = ['منخفضة', 'متوسطة', 'عالية', 'عاجل'];
const statuses: TaskStatus[] = ['جديدة', 'قيد التنفيذ', 'مكتملة', 'متأخرة'];
const departments = ['المبيعات', 'الحسابات', 'التشغيل', 'الفنادق', 'السياحة الداخلية'];

const priorityColors: Record<TaskPriority, string> = {
  منخفضة: 'bg-gray-100 text-gray-600',
  متوسطة: 'bg-blue-100 text-blue-700',
  عالية: 'bg-amber-100 text-amber-700',
  عاجل: 'bg-red-100 text-red-700',
};

const statusColors: Record<string, string> = {
  'جديدة': 'bg-blue-100 text-blue-700',
  'قيد التنفيذ': 'bg-amber-100 text-amber-700',
  'مكتملة': 'bg-emerald-100 text-emerald-700',
  'متأخرة': 'bg-red-100 text-red-700',
};

const statusIcons: Record<string, React.ElementType> = {
  'جديدة': Clock,
  'قيد التنفيذ': Loader2,
  'مكتملة': CheckCircle2,
  'متأخرة': AlertCircle,
};

interface Props {
  onNavigate: (page: Page, id?: string) => void;
}

export default function Tasks({}: Props) {
  useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', employee_id: '', department: '',
    priority: 'متوسطة' as TaskPriority, due_date: '', client_code: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
    supabase.from('employees').select('*').eq('is_active', true).then(({ data }) => {
      if (data) setEmployees(data as Employee[]);
    });
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*, employees(*)')
      .order('created_at', { ascending: false });
    setTasks((data as Task[]) || []);
    setLoading(false);
  };

  const filtered = tasks.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterDept && t.department !== filterDept) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !(t.client_code || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'جديدة').length,
    inProgress: tasks.filter((t) => t.status === 'قيد التنفيذ').length,
    completed: tasks.filter((t) => t.status === 'مكتملة').length,
    overdue: tasks.filter((t) => t.status === 'متأخرة').length,
  };

  const createTask = async () => {
    if (!form.title.trim() || !form.due_date) return;
    setSaving(true);
    const { data } = await supabase
      .from('tasks')
      .insert({
        title: form.title,
        description: form.description || null,
        employee_id: form.employee_id || null,
        department: form.department || null,
        priority: form.priority,
        due_date: form.due_date,
        client_code: form.client_code || null,
        status: 'جديدة',
        start_date: new Date().toISOString().split('T')[0],
      })
      .select('*, employees(*)')
      .single();
    if (data) {
      setTasks([data as Task, ...tasks]);
      if (form.employee_id) {
        await supabase.from('notifications').insert({
          employee_id: form.employee_id,
          type: 'task_assigned',
          title: `مهمة جديدة: ${form.title}`,
          body: form.department ? `قسم ${form.department}` : undefined,
          is_read: false,
        });
      }
    }
    setForm({ title: '', description: '', employee_id: '', department: '', priority: 'متوسطة', due_date: '', client_code: '' });
    setShowForm(false);
    setSaving(false);
  };

  const updateStatus = async (task: Task, status: TaskStatus) => {
    const updates: Record<string, unknown> = { status };
    if (status === 'مكتملة') updates.completed_at = new Date().toISOString();
    const { data } = await supabase.from('tasks').update(updates).eq('id', task.id).select('*, employees(*)').single();
    if (data) setTasks(tasks.map((t) => (t.id === task.id ? (data as Task) : t)));
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(tasks.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">إدارة المهام</h2>
          <p className="section-subtitle">متابعة المهام بين جميع الأقسام والموظفين</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold">
          <Plus size={16} /> مهمة جديدة
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'الكل', value: stats.total, color: 'text-navy-700', bg: 'bg-navy-50' },
          { label: 'جديدة', value: stats.pending, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'قيد التنفيذ', value: stats.inProgress, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'مكتملة', value: stats.completed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'متأخرة', value: stats.overdue, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
              <ListChecks size={20} className={s.color} />
            </div>
            <p className="text-2xl font-black text-navy-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالعنوان أو Client Code..." className="form-input pr-9" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="form-input sm:w-40">
          <option value="">كل الحالات</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="form-input sm:w-44">
          <option value="">كل الأقسام</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy-800">إنشاء مهمة جديدة</h3>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="form-label">عنوان المهمة <span className="text-red-500">*</span></label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="form-input" placeholder="عنوان المهمة" />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">وصف المهمة</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="form-input resize-none" placeholder="وصف تفصيلي..." />
            </div>
            <div>
              <label className="form-label">الموظف المسؤول</label>
              <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="form-input">
                <option value="">— اختر —</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">القسم</label>
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="form-input">
                <option value="">— اختر —</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">الأولوية</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })} className="form-input">
                {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Deadline <span className="text-red-500">*</span></label>
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="form-input" dir="ltr" />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Client Code (اختياري)</label>
              <input value={form.client_code} onChange={(e) => setForm({ ...form, client_code: e.target.value })} className="form-input" placeholder="CL-1001" dir="ltr" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-outline text-xs py-2 px-4">إلغاء</button>
            <button onClick={createTask} disabled={!form.title.trim() || !form.due_date || saving} className="btn-gold text-xs py-2 px-4">
              {saving ? 'جارٍ الحفظ...' : 'إنشاء المهمة'}
            </button>
          </div>
        </div>
      )}

      {/* Tasks list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-navy-700" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ListChecks size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">لا توجد مهام</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((t) => {
              const StatusIcon = statusIcons[t.status] || Clock;
              return (
                <div key={t.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${statusColors[t.status]}`}>
                      <StatusIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-bold text-navy-900">{t.title}</h3>
                        {t.auto_generated && (
                          <span className="badge bg-purple-100 text-purple-700 text-[10px]"><Zap size={9} className="inline ml-0.5" />تلقائي</span>
                        )}
                        <span className={`badge text-[10px] ${priorityColors[t.priority]}`}>{t.priority}</span>
                      </div>
                      {t.description && <p className="text-xs text-gray-500 mb-2">{t.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                        {t.employees?.name && <span className="flex items-center gap-1"><User size={11} />{t.employees.name}</span>}
                        {t.department && <span className="flex items-center gap-1"><Filter size={11} />{t.department}</span>}
                        {t.client_code && <span className="flex items-center gap-1 font-mono text-gold-600"><Hash size={11} />{t.client_code}</span>}
                        <span className="flex items-center gap-1"><Calendar size={11} />{new Date(t.due_date).toLocaleDateString('ar-EG')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={t.status}
                        onChange={(e) => updateStatus(t, e.target.value as TaskStatus)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                      >
                        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button onClick={() => deleteTask(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="حذف"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
