import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Plus, Users, CalendarCheck, Target, Shuffle,
  Pencil, Eye, LayoutDashboard, Trash2, UserCheck, UserX
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadialBarChart, RadialBar,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Employee, Page } from '../types';
import EmployeeDetailsModal from '../components/EmployeeDetailsModal';
import EmployeeAddModal from '../components/EmployeeAddModal';
import LeadsDistributionModal from '../components/LeadsDistributionModal';
import StatDrillDownModal, { type StatType } from '../components/StatDrillDownModal';



const RADIAL_COLORS = ['#0c224f', '#c9941a', '#10b981', '#ef4444', '#a855f7'];

interface Props {
  onNavigate: (page: Page, id?: string) => void;
}

export default function Employees({ onNavigate }: Props) {
  const { can } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showEmployeeModal, setShowEmployeeModal] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [showDistribution, setShowDistribution] = useState(false);
  const [statDrillDown, setStatDrillDown] = useState<StatType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDeleteEmployee = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await supabase.from('employees').delete().eq('id', deleteTarget.id);
      await supabase.from('user_profiles').delete().eq('id', deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error('Error deleting employee:', err);
    } finally {
      setDeleting(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    const empRes = await supabase.from('employees').select('*').order('target_percentage', { ascending: false });
    setEmployees((empRes.data as Employee[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);



  const openAdd = () => { setEditEmployee(null); setShowAddModal(true); };
  const openEdit = (e: Employee) => { setEditEmployee(e); setShowAddModal(true); };

  // Aggregate stats
  const totals = useMemo(() => {
    return {
      clients: employees.reduce((s, e) => s + e.clients_count, 0),
      bookings: employees.reduce((s, e) => s + e.bookings_count, 0),
      activeEmployees: employees.filter(e => e.is_active).length,
      inactiveEmployees: employees.filter(e => !e.is_active).length,
    };
  }, [employees]);

  const chartData = useMemo(() =>
    employees.map((e) => ({ name: e.name.split(' ')[0], عملاء: e.clients_count, حجوزات: e.bookings_count })),
    [employees]);



  const targetRadial = useMemo(() =>
    employees.map((e, i) => ({ name: e.name.split(' ')[0], target: e.target_percentage, fill: RADIAL_COLORS[i % RADIAL_COLORS.length] })),
    [employees]);

  const targetColor = (p: number) => p >= 80 ? 'text-emerald-600 bg-emerald-50' : p >= 60 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  const targetBg = (p: number) => p >= 80 ? 'from-emerald-500 to-emerald-300' : p >= 60 ? 'from-amber-500 to-amber-300' : 'from-red-500 to-red-300';




  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">الموظفون والمندوبون</h2>
          <p className="section-subtitle">إدارة أداء الفريق والعملاء والمهام</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {can('customers_add') && (
            <button onClick={() => setShowDistribution(true)} className="btn-outline text-sm py-2 px-4">
              <Shuffle size={15} />توزيع العملاء
            </button>
          )}
          {can('employees_add') && (
            <button onClick={openAdd} className="btn-gold text-sm py-2 px-4">
              <Plus size={15} />إضافة موظف
            </button>
          )}
        </div>
      </div>

      {/* Top stats — clickable to drill down */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setStatDrillDown('clients')}
          className="stat-card text-right hover:ring-2 hover:ring-navy-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <Users size={20} className="text-navy-600" />
            <span className="text-xs text-emerald-600 font-bold">إجمالي العملاء</span>
          </div>
          <p className="text-3xl font-black text-navy-900">{totals.clients}</p>
          <p className="text-xs text-gray-400 mt-1">{employees.length} موظف</p>
        </button>
        <button
          onClick={() => setStatDrillDown('bookings')}
          className="stat-card text-right hover:ring-2 hover:ring-gold-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <CalendarCheck size={20} className="text-gold-600" />
            <span className="text-xs text-emerald-600 font-bold">إجمالي الحجوزات</span>
          </div>
          <p className="text-3xl font-black text-navy-900">{totals.bookings}</p>
          <p className="text-xs text-gray-400 mt-1">حجز بواسطة الفريق</p>
        </button>
        <div className="stat-card text-right">
          <div className="flex items-center justify-between mb-3">
            <UserCheck size={20} className="text-emerald-600" />
            <span className="text-xs text-emerald-600 font-bold">الموظفين النشطين</span>
          </div>
          <p className="text-3xl font-black text-navy-900">{totals.activeEmployees}</p>
          <p className="text-xs text-gray-400 mt-1">نشط حالياً بالسيستم</p>
        </div>
        <div className="stat-card text-right">
          <div className="flex items-center justify-between mb-3">
            <UserX size={20} className="text-red-500" />
            <span className="text-xs text-red-600 font-bold">موظفين غير نشطين</span>
          </div>
          <p className="text-3xl font-black text-navy-900">{totals.inactiveEmployees}</p>
          <p className="text-xs text-gray-400 mt-1">مسدودين أو معطلين</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
              {/* Employee cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {employees.map((emp, i) => (
                  <div key={emp.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="bg-gradient-navy p-4 text-center relative cursor-pointer" onClick={() => setShowEmployeeModal(emp)}>
                      {i === 0 && <div className="absolute top-2 left-2 w-6 h-6 bg-gold-400 rounded-full flex items-center justify-center text-navy-900 font-black text-xs">1</div>}
                      <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-xl mx-auto mb-2">
                        {emp.name.charAt(0)}
                      </div>
                      <h3 className="text-white font-bold text-sm leading-tight">{emp.name}</h3>
                      <p className="text-gold-300 text-xs mt-1">{emp.role}</p>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="text-center bg-navy-50 rounded-xl p-2.5">
                          <Users size={14} className="text-navy-600 mx-auto mb-1" />
                          <p className="text-xl font-black text-navy-800">{emp.clients_count}</p>
                          <p className="text-[10px] text-gray-500">عميل</p>
                        </div>
                        <div className="text-center bg-gold-50 rounded-xl p-2.5">
                          <CalendarCheck size={14} className="text-gold-600 mx-auto mb-1" />
                          <p className="text-xl font-black text-gold-700">{emp.bookings_count}</p>
                          <p className="text-[10px] text-gray-500">حجز</p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1 text-xs">
                            <Target size={12} className="text-gray-400" />
                            <span className="text-gray-500">نسبة الهدف</span>
                          </div>
                          <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${targetColor(emp.target_percentage)}`}>{emp.target_percentage}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-l ${targetBg(emp.target_percentage)} rounded-full transition-all duration-700`} style={{ width: `${emp.target_percentage}%` }} />
                        </div>
                      </div>
                      <button onClick={() => setShowEmployeeModal(emp)} className="w-full text-xs font-semibold text-white bg-navy-700 hover:bg-navy-800 py-2 rounded-xl transition-colors flex items-center justify-center gap-1 mb-2">
                        <Eye size={12} />عرض التفاصيل
                      </button>
                      <div className="flex items-center gap-1.5">
                        {can('employees_edit') && (
                          <button onClick={() => openEdit(emp)} className="flex-1 text-xs font-semibold text-navy-700 bg-navy-50 hover:bg-navy-100 py-2 rounded-xl transition-colors flex items-center justify-center gap-1">
                            <Pencil size={12} />تعديل
                          </button>
                        )}
                        {can('employees_delete') && (
                          <button onClick={() => setDeleteTarget(emp)} className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-xl transition-colors flex items-center justify-center gap-1" title="حذف الموظف">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-base font-bold text-navy-900 mb-5 flex items-center gap-2">
                    <LayoutDashboard size={16} className="text-gold-500" />مقارنة أداء الموظفين
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: 'Cairo', fill: '#6b7280' }} />
                      <YAxis tick={{ fontSize: 12, fontFamily: 'Cairo', fill: '#6b7280' }} />
                      <Tooltip contentStyle={{ fontFamily: 'Cairo', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                      <Legend wrapperStyle={{ fontFamily: 'Cairo', fontSize: 12 }} />
                      <Bar dataKey="عملاء" fill="#0c224f" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="حجوزات" fill="#c9941a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-base font-bold text-navy-900 mb-5 flex items-center gap-2">
                    <Target size={16} className="text-gold-500" />نسب تحقيق الهدف
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <RadialBarChart innerRadius="20%" outerRadius="100%" data={targetRadial} startAngle={90} endAngle={-270}>
                      <RadialBar background dataKey="target" cornerRadius={6} />
                      <Tooltip contentStyle={{ fontFamily: 'Cairo', borderRadius: '12px', border: 'none' }} />
                      <Legend wrapperStyle={{ fontFamily: 'Cairo', fontSize: 11 }} iconSize={8} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

      {/* Employee Add/Edit Modal (new full-featured one with password/permissions + create-user edge function) */}
      <EmployeeAddModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={load}
        editEmployee={editEmployee}
      />

      {/* Employee Details Modal */}
      <EmployeeDetailsModal
        employee={showEmployeeModal}
        onClose={() => setShowEmployeeModal(null)}
        onNavigate={onNavigate}
      />

      {/* Leads Distribution Modal */}
      {showDistribution && (
        <LeadsDistributionModal
          employees={employees}
          onClose={() => setShowDistribution(false)}
          onDistributed={load}
        />
      )}



      {/* Stat drill-down modal */}
      <StatDrillDownModal
        type={statDrillDown}
        onClose={() => setStatDrillDown(null)}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-4 mx-auto">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-navy-900 text-center mb-2">تأكيد حذف الموظف</h3>
            <p className="text-sm text-gray-600 text-center mb-6 leading-relaxed">
              هل أنت تأكد من رغبتك في حذف الموظف <span className="font-bold text-navy-900">{deleteTarget.name}</span>؟
              <br />
              <span className="text-xs text-red-500 font-semibold mt-1 block">ملاحظة: سيتم حذف بيانات الموظف والمهام المرتبطة به نهائياً.</span>
            </p>
            <div className="flex items-center gap-3">
              <button
                disabled={deleting}
                onClick={confirmDeleteEmployee}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-red-600/30 text-sm disabled:opacity-50"
              >
                {deleting ? 'جارٍ الحذف...' : 'نعم، احذف الموظف'}
              </button>
              <button
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-navy-800 font-bold py-3 rounded-xl transition-all text-sm"
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
