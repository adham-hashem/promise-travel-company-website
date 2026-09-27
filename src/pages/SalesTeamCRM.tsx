import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Filter, Calendar, TrendingUp, Loader2, Download, FileSpreadsheet, PhoneCall, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../lib/exportUtils';
import type { Customer, Employee } from '../types';

export default function SalesTeamCRM() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [logs, setLogs] = useState<Array<{customer_id:string;employee_id?:string;created_at:string}>>([]);
  const [range, setRange] = useState('7');
  const [customFrom,setCustomFrom]=useState(''); const [customTo,setCustomTo]=useState('');
  
  useEffect(() => {
    loadTeamData();
  }, [profile?.id]);

  const loadTeamData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const isAdmin=['super_admin','مالك النظام','مدير النظام','مدير المبيعات'].includes(profile.role);
      const { data: teamRelations } = isAdmin ? {data:null} : await supabase.from('sales_teams').select('member_id').eq('leader_id', profile.id);
      let memberIds:string[]=[];
      if(isAdmin){const {data}=await supabase.from('employees').select('id').in('role',['مندوب مبيعات','قائد فريق المبيعات']).eq('is_active',true);memberIds=(data||[]).map(x=>x.id)}else memberIds=(teamRelations||[]).map(r=>r.member_id);
      if (memberIds.length > 0) {
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
        const {data:followups}=await supabase.from('communication_logs').select('customer_id,employee_id,created_at').in('employee_id',memberIds);
        setLogs(followups||[]);
      }
    } catch (err) {
      console.error('Error loading team data:', err);
    }
    setLoading(false);
  };

  const filteredCustomers = selectedMemberId === 'all' 
    ? customers 
    : customers.filter(c => c.assigned_employee_id === selectedMemberId);

  const bounds=()=>{const now=new Date();let from=new Date(now);let to=new Date(now);to.setHours(23,59,59,999);if(range==='today')from.setHours(0,0,0,0);else if(range==='yesterday'){from.setDate(from.getDate()-1);from.setHours(0,0,0,0);to=new Date(from);to.setHours(23,59,59,999)}else if(range==='month')from=new Date(now.getFullYear(),now.getMonth(),1);else if(range==='prevmonth'){from=new Date(now.getFullYear(),now.getMonth()-1,1);to=new Date(now.getFullYear(),now.getMonth(),0,23,59,59)}else if(range==='custom'){from=new Date(customFrom||0);to=new Date(customTo||Date.now());to.setHours(23,59,59,999)}else {from.setDate(from.getDate()-6);from.setHours(0,0,0,0)}return {from,to}};
  const {from,to}=bounds(); const periodLogs=logs.filter(l=>{const d=new Date(l.created_at);return d>=from&&d<=to});
  const metrics=teamMembers.map(m=>{const owned=customers.filter(c=>c.assigned_employee_id===m.id);const ml=periodLogs.filter(l=>l.employee_id===m.id);const contacted=new Set(ml.map(l=>l.customer_id));const repeated=new Set(ml.filter((l,_,a)=>a.filter(x=>x.customer_id===l.customer_id).length>1).map(l=>l.customer_id));const won=owned.filter(c=>['مكتمل','تم الحجز','حجز'].includes(c.status)).length;return {m,total:owned.length,contacted:contacted.size,uncontacted:owned.filter(c=>!contacted.has(c.id)).length,followups:ml.length,repeated:repeated.size,overdue:owned.filter(c=>c.next_follow_up&&new Date(c.next_follow_up)<new Date()).length,won,rate:owned.length?Math.round(won/owned.length*100):0,last:ml.sort((a,b)=>b.created_at.localeCompare(a.created_at))[0]?.created_at}});
  const reassign=async(customerId:string,employeeId:string)=>{await supabase.from('customers').update({assigned_employee_id:employeeId||null}).eq('id',customerId);await supabase.from('audit_logs').insert({actor_id:profile?.id,action:'reassign_customer',entity_type:'customer',entity_id:customerId,new_data:{assigned_employee_id:employeeId}});loadTeamData()};

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

      <div className="bg-white p-4 rounded-xl border border-gray-100 flex flex-wrap gap-2 items-center"><b className="text-sm ml-2">الفترة:</b>{[['today','اليوم'],['yesterday','أمس'],['7','آخر 7 أيام'],['month','الشهر الحالي'],['prevmonth','الشهر السابق'],['custom','مخصصة']].map(([v,l])=><button key={v} onClick={()=>setRange(v)} className={`px-3 py-2 rounded-lg text-xs ${range===v?'bg-navy-900 text-white':'bg-gray-100'}`}>{l}</button>)}{range==='custom'&&<><input type="date" className="form-input w-auto" value={customFrom} onChange={e=>setCustomFrom(e.target.value)}/><input type="date" className="form-input w-auto" value={customTo} onChange={e=>setCustomTo(e.target.value)}/></>}</div>

      {!loading&&<div className="grid lg:grid-cols-2 gap-4">{metrics.map(x=><div key={x.m.id} className="bg-white rounded-2xl border border-gray-100 p-5"><h3 className="font-bold text-navy-900 mb-4">{x.m.name}</h3><div className="grid grid-cols-3 gap-2 text-center">{[[Users,'المسندون',x.total],[PhoneCall,'تم التواصل',x.contacted],[AlertTriangle,'لم يتم',x.uncontacted],[TrendingUp,'المتابعات',x.followups],[CheckCircle2,'مغلق بنجاح',x.won],[TrendingUp,'التحويل',`${x.rate}%`],[Users,'أكثر من متابعة',x.repeated],[AlertTriangle,'متأخرون',x.overdue],[Calendar,'آخر متابعة',x.last?new Date(x.last).toLocaleDateString('ar-EG'):'—']].map(([Icon,l,v],i)=>{const C=Icon as React.ElementType;return <div key={i} className="rounded-xl bg-gray-50 p-2"><C size={15} className="mx-auto text-gold-600"/><p className="font-black mt-1">{v as React.ReactNode}</p><p className="text-[10px] text-gray-500">{l as string}</p></div>})}</div></div>)}</div>}

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
                      <td><select value={c.assigned_employee_id||''} onChange={e=>reassign(c.id,e.target.value)} className="form-input text-xs py-1"><option value="">غير محدد</option>{teamMembers.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></td>
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
