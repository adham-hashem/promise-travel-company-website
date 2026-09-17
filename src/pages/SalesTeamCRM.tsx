import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Filter, Calendar, TrendingUp, Search, Loader2, Download, FileSpreadsheet } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../lib/exportUtils';
import type { Customer, Employee } from '../types';

export default function SalesTeamCRM() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  useEffect(() => {
    loadTeamData();
  }, [profile?.id]);

  const loadTeamData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      // Fetch team members
      const { data: teamRelations } = await supabase
        .from('sales_teams')
        .select('member_id')
        .eq('leader_id', profile.id);
        
      if (teamRelations && teamRelations.length > 0) {
        const memberIds = teamRelations.map(r => r.member_id);
        const { data: members } = await supabase
          .from('employees')
          .select('*')
          .in('id', memberIds);
        
        if (members) setTeamMembers(members);
        
        // Fetch customers for the team
        const { data: custs } = await supabase
          .from('customers')
          .select('*, employees(*), packages(*)')
          .in('assigned_employee_id', memberIds)
          .eq('is_vip', false);
          
        if (custs) setCustomers(custs);
      }
    } catch (err) {
      console.error('Error loading team data:', err);
    }
    setLoading(false);
  };

  const filteredCustomers = selectedMemberId === 'all' 
    ? customers 
    : customers.filter(c => c.assigned_employee_id === selectedMemberId);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">فريق المبيعات</h2>
          <p className="section-subtitle">إدارة عملاء ومبيعات أعضاء فريقك</p>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <button onClick={() => {
          const data = filteredCustomers.map(c => ({
            'الاسم': c.name, 'الهاتف': c.phone, 'الموظف': c.employees?.name || '—', 'الخدمة': c.service_type || '—', 'شهر السفر': c.travel_interest_month || '—', 'الحالة': c.status
          }));
          exportToExcel(data, 'تقرير_المبيعات');
        }} className="btn-secondary flex items-center gap-2">
          <FileSpreadsheet size={16} /> Excel
        </button>
        <button onClick={() => {
          const headers = ['الاسم', 'الهاتف', 'الموظف', 'الخدمة', 'شهر السفر', 'الحالة'];
          const rows = filteredCustomers.map(c => [c.name, c.phone, c.employees?.name || '—', c.service_type || '—', c.travel_interest_month || '—', c.status]);
          exportToPDF('تقرير مبيعات الفريق', headers, rows);
        }} className="btn-secondary flex items-center gap-2">
          <Download size={16} /> PDF
        </button>
        <div className="flex-1"></div>
        <span className="text-sm font-bold text-gray-600 flex items-center gap-2">
          <Filter size={16} /> تصفية بالموظف:
        </span>
        <select 
          value={selectedMemberId}
          onChange={e => setSelectedMemberId(e.target.value)}
          className="form-input w-64 bg-gray-50"
        >
          <option value="all">كل الفريق ({teamMembers.length} موظفين)</option>
          {teamMembers.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-navy-600" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-navy-900">عملاء الفريق</h3>
            <span className="badge bg-navy-50 text-navy-700">{filteredCustomers.length} عميل</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-b border-gray-100 bg-gray-50">
            <div>
              <h4 className="text-sm font-bold text-navy-800 mb-2 flex items-center gap-2"><TrendingUp size={16} className="text-gold-500" /> ملخص الحالات</h4>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(filteredCustomers.reduce((acc, c) => {
                  acc[c.status] = (acc[c.status] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)).map(([status, count]) => (
                  <span key={status} className="bg-white border border-gray-200 px-3 py-1 rounded-lg text-sm text-gray-700">
                    {status}: <span className="font-bold">{count}</span>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-navy-800 mb-2 flex items-center gap-2"><Calendar size={16} className="text-gold-500" /> Pipeline (أشهر السفر)</h4>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(filteredCustomers.reduce((acc, c) => {
                  const m = c.travel_interest_month || 'غير محدد';
                  acc[m] = (acc[m] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)).sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => (
                  <span key={month} className="bg-white border border-gray-200 px-3 py-1 rounded-lg text-sm text-navy-700">
                    {month}: <span className="font-bold">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>اسم العميل</th>
                  <th>رقم الهاتف</th>
                  <th>الموظف المسؤول</th>
                  <th>الخدمة</th>
                  <th>شهر السفر</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">لا يوجد عملاء متاحين</td>
                  </tr>
                ) : (
                  filteredCustomers.map(c => (
                    <tr key={c.id}>
                      <td className="font-bold">{c.name}</td>
                      <td dir="ltr" className="text-right">{c.phone}</td>
                      <td>
                        <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                          {c.employees?.name || 'غير محدد'}
                        </span>
                      </td>
                      <td>{c.service_type || '—'}</td>
                      <td>{c.travel_interest_month || '—'}</td>
                      <td>
                        <span className={`badge ${c.status === 'مكتمل' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
