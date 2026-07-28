import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Plus, ListChecks, CheckCircle2, Clock, AlertCircle, ChevronLeft,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Employee, Task, Page } from '../types';
import TaskModal from '../components/TaskModal';

const taskStatusColors: Record<string, string> = {
  جديدة: 'bg-blue-100 text-blue-700 border border-blue-200',
  'قيد التنفيذ': 'bg-amber-100 text-amber-700 border border-amber-200',
  مكتملة: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  متأخرة: 'bg-red-100 text-red-700 border border-red-200',
};

const priorityColors: Record<string, string> = {
  منخفضة: 'bg-gray-100 text-gray-700',
  متوسطة: 'bg-amber-100 text-amber-700',
  عالية: 'bg-red-100 text-red-700',
};

const todayStr = () => new Date().toISOString().split('T')[0];

interface Props {
  onNavigate: (page: Page, id?: string) => void;
}

export default function Tasks({}: Props) {
  const { profile } = useAuth();
  const isManager = profile?.role === 'super_admin' || profile?.role === 'مالك النظام' || profile?.role === 'مدير النظام';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // TaskModal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [defaultTaskEmployee, setDefaultTaskEmployee] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    
    // Load active employees
    const { data: empRes } = await supabase.from('employees').select('*').eq('is_active', true);
    setEmployees((empRes as Employee[]) || []);

    // Load tasks (filter by user if not manager)
    let query = supabase.from('tasks').select('*, employees(*)');
    if (!isManager) {
      query = query.eq('employee_id', profile.id);
    }
    const { data: taskRes } = await query.order('due_date', { ascending: true });
    setTasks((taskRes as Task[]) || []);
    
    setLoading(false);
  }, [profile, isManager]);

  useEffect(() => {
    load();
  }, [load]);

  const openAddTask = (employeeId?: string) => {
    setEditTask(null);
    setDefaultTaskEmployee(employeeId);
    setShowTaskModal(true);
  };

  const openEditTask = (t: Task) => {
    // Standard users can edit status of their own tasks, but we let TaskModal handle editing
    setEditTask(t);
    setDefaultTaskEmployee(t.employee_id);
    setShowTaskModal(true);
  };

  const totals = useMemo(() => {
    const today = todayStr();
    return {
      todayTasks: tasks.filter(t => t.start_date <= today && t.due_date >= today).length,
      completedTasks: tasks.filter(t => t.status === 'مكتملة').length,
      pendingTasks: tasks.filter(t => t.status !== 'مكتملة').length,
      overdueTasks: tasks.filter(t => t.status === 'متأخرة').length,
    };
  }, [tasks]);

  const today = todayStr();
  const dailyTasksPerEmployee = useMemo(() => {
    return employees.map((e) => {
      const etasks = tasks.filter((t) => t.employee_id === e.id);
      return {
        employee: e,
        total: etasks.filter(t => t.start_date <= today && t.due_date >= today).length,
        completed: etasks.filter(t => t.status === 'مكتملة' && t.start_date <= today && t.due_date >= today).length,
        pending: etasks.filter(t => t.status !== 'مكتملة' && t.start_date <= today && t.due_date >= today).length,
        overdue: etasks.filter(t => t.status === 'متأخرة').length,
      };
    });
  }, [employees, tasks, today]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3" dir="rtl">
        <Loader2 size={36} className="animate-spin text-gold-500" />
        <p className="text-gray-500 font-semibold text-sm">جارٍ تحميل المهام...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <ListChecks size={22} className="text-gold-500" /> إدارة المهام والواجبات
          </h2>
          <p className="section-subtitle">تنظيم وإسناد المهام اليومية للموظفين ومتابعة مؤشرات الأداء</p>
        </div>

        {isManager && (
          <button onClick={() => openAddTask()} className="btn-gold shadow-sm">
            <Plus size={16} /> إضافة مهمة جديدة
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold mb-1">مهام اليوم</p>
          <p className="text-2xl font-black text-navy-950">{totals.todayTasks}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold mb-1">المهام المكتملة</p>
          <p className="text-2xl font-black text-emerald-600">{totals.completedTasks}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold mb-1">المهام المتبقية</p>
          <p className="text-2xl font-black text-amber-600">{totals.pendingTasks}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-gray-400 font-semibold mb-1">مهام متأخرة</p>
          <p className="text-2xl font-black text-red-600">{totals.overdueTasks}</p>
        </div>
      </div>

      {/* Daily Task Breakdown per Employee (Managers Only) */}
      {isManager && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-gold-500 rounded-full" /> مهام اليوم لكل موظف
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {dailyTasksPerEmployee.map(({ employee, total, completed, pending, overdue }) => (
              <div key={employee.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:border-gold-300 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-navy flex items-center justify-center text-white font-bold text-sm">
                    {employee.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-navy-900 text-sm truncate">{employee.name}</p>
                    <p className="text-[10px] text-gray-400">{employee.role}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center bg-blue-50 rounded-lg p-2">
                    <p className="text-base font-black text-blue-700">{total}</p>
                    <p className="text-[9px] text-gray-500">يومية</p>
                  </div>
                  <div className="text-center bg-emerald-50 rounded-lg p-2">
                    <p className="text-base font-black text-emerald-700">{completed}</p>
                    <p className="text-[9px] text-gray-500">مكتملة</p>
                  </div>
                  <div className="text-center bg-amber-50 rounded-lg p-2">
                    <p className="text-base font-black text-amber-700">{pending}</p>
                    <p className="text-[9px] text-gray-500">متبقية</p>
                  </div>
                </div>
                {overdue > 0 && (
                  <div className="bg-red-50 rounded-lg p-2 text-center mb-2">
                    <p className="text-xs font-black text-red-700">{overdue} مهمة متأخرة</p>
                  </div>
                )}
                <button
                  onClick={() => openAddTask(employee.id)}
                  className="w-full text-xs font-semibold text-navy-700 bg-navy-50 hover:bg-navy-100 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 mt-2"
                >
                  <Plus size={11} /> إضافة مهمة
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Tasks Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-navy-900">{isManager ? 'جدول جميع المهام' : 'مهامي الشخصية'}</h3>
          <button onClick={() => openAddTask()} className="btn-gold text-xs py-2 px-3">
            <Plus size={13} /> إضافة مهمة
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ListChecks size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">لا توجد مهام حالية</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="p-4 flex items-start gap-3 hover:bg-blue-50/30 cursor-pointer transition-colors"
                onClick={() => openEditTask(t)}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${taskStatusColors[t.status] || 'bg-gray-100 text-gray-500'}`}>
                  {t.status === 'مكتملة' ? <CheckCircle2 size={16} /> : t.status === 'متأخرة' ? <AlertCircle size={16} /> : <Clock size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold text-navy-800 text-sm">{t.title}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${priorityColors[t.priority] || 'bg-gray-100'}`}>{t.priority}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${taskStatusColors[t.status] || 'bg-gray-100'}`}>{t.status}</span>
                  </div>
                  {t.description && <p className="text-xs text-gray-500 mb-1.5">{t.description}</p>}
                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    {isManager && <span>المسؤول: <span className="font-semibold text-navy-950">{t.employees?.name || '—'}</span></span>}
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> تاريخ الاستحقاق: {t.due_date ? new Date(t.due_date).toLocaleDateString('ar-EG') : '—'}
                    </span>
                  </div>
                </div>
                <ChevronLeft size={14} className="text-gray-300 flex-shrink-0 self-center" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Add/Edit Modal */}
      <TaskModal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSaved={load}
        employees={employees}
        defaultEmployeeId={defaultTaskEmployee}
        editTask={editTask}
      />
    </div>
  );
}

// Helper Loader icon
function Loader2({ size, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      style={{ width: size, height: size }}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
