import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Star, Users, DollarSign, Briefcase, Clock, 
  Plane, Calendar, Plus, Upload, CheckCircle2, AlertCircle, FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { VIPTrip, Customer, VIPTripLog } from '../types';

interface VIPDetailsProps {
  tripId: string;
  onNavigate: (page: string, params?: any) => void;
}

export default function VIPDetails({ tripId, onNavigate }: VIPDetailsProps) {
  const { profile } = useAuth();
  const [trip, setTrip] = useState<VIPTrip | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [logs, setLogs] = useState<VIPTripLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info'|'customers'|'financial'|'execution'|'logs'>('info');

  // Customer Add Form State
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', age_group: 'بالغ' });

  // Execution Items
  const executionItems = [
    { id: 'flight', title: 'الطيران', icon: Plane },
    { id: 'hotel_makkah', title: 'فندق مكة', icon: Briefcase },
    { id: 'hotel_madinah', title: 'فندق المدينة', icon: Briefcase },
    { id: 'train', title: 'القطار', icon: Briefcase },
    { id: 'transport', title: 'النقل', icon: Briefcase },
    { id: 'mazarat', title: 'المزارات', icon: Briefcase },
    { id: 'visa', title: 'التأشيرة', icon: FileText },
  ];

  useEffect(() => {
    loadTripDetails();
  }, [tripId]);

  const loadTripDetails = async () => {
    setLoading(true);
    try {
      const [tripRes, custRes, logRes] = await Promise.all([
        supabase.from('vip_trips')
          .select('*, assigned_employee:user_profiles!vip_trips_assigned_employee_id_fkey(*)')
          .eq('id', tripId).single(),
        supabase.from('customers').select('*').eq('vip_trip_id', tripId),
        supabase.from('vip_trip_logs').select('*, user:user_profiles!vip_trip_logs_user_id_fkey(*)').eq('trip_id', tripId).order('created_at', { ascending: false })
      ]);

      if (tripRes.data) setTrip(tripRes.data as any);
      if (custRes.data) setCustomers(custRes.data as Customer[]);
      if (logRes.data) setLogs(logRes.data as VIPTripLog[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('customers').insert({
        name: newCustomer.name,
        phone: newCustomer.phone,
        age_group: newCustomer.age_group,
        client_type: 'VIP',
        is_vip: true,
        vip_trip_id: tripId,
        status: 'جديد',
        source: 'رحلة VIP',
        service_type: 'حج'
      }).select().single();
      
      if (error) throw error;
      
      // Log event
      await supabase.from('vip_trip_logs').insert({
        trip_id: tripId,
        user_id: profile?.id,
        action: 'إضافة عميل',
        details: `تم إضافة العميل: ${newCustomer.name}`
      });

      setShowAddCustomer(false);
      setNewCustomer({ name: '', phone: '', age_group: 'بالغ' });
      loadTripDetails();
    } catch (err: any) {
      alert('خطأ في الإضافة: ' + err.message);
    }
  };

  const handleUpdatePrice = async () => {
    const newPrice = prompt('أدخل إجمالي التسعير الجديد للرحلة:', trip?.total_price.toString());
    if (!newPrice || isNaN(Number(newPrice))) return;
    
    try {
      const { error } = await supabase.from('vip_trips').update({ total_price: Number(newPrice) }).eq('id', tripId);
      if (error) throw error;
      
      await supabase.from('vip_trip_logs').insert({
        trip_id: tripId, user_id: profile?.id,
        action: 'تعديل التسعير', details: `تم تعديل إجمالي التسعير إلى ${newPrice}`
      });
      loadTripDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExecutionFileUpdate = async (itemId: string, details: string) => {
    try {
      const currentDetails = trip?.execution_details || {};
      const newDetails = { ...currentDetails, [itemId]: { details, status: 'مكتمل' } };
      
      // Calculate progress
      const completedCount = Object.keys(newDetails).filter(k => newDetails[k].status === 'مكتمل').length;
      const progress = Math.min(100, Math.round((completedCount / executionItems.length) * 100));

      const { error } = await supabase.from('vip_trips').update({ 
        execution_details: newDetails,
        progress_percentage: progress
      }).eq('id', tripId);
      
      if (error) throw error;
      
      await supabase.from('vip_trip_logs').insert({
        trip_id: tripId, user_id: profile?.id,
        action: 'تحديث التنفيذ', details: `تم تحديث بند: ${executionItems.find(i=>i.id===itemId)?.title}`
      });
      loadTripDetails();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500">جاري تحميل بيانات الرحلة...</div>;
  if (!trip) return <div className="text-center py-20 text-red-500">لم يتم العثور على الرحلة!</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-l from-navy-900 to-navy-800 p-6 rounded-2xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => onNavigate('vip-trips')} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <span className="bg-gold-500 text-navy-900 font-bold px-3 py-1 rounded-lg text-sm">
              VIP-{trip.trip_number}
            </span>
            <h2 className="text-2xl font-bold">{trip.name}</h2>
          </div>
          <div className="flex items-center gap-6 text-navy-100 text-sm mr-12">
            <span className="flex items-center gap-1"><Plane size={16}/> {trip.destination || 'وجهة غير محددة'}</span>
            <span className="flex items-center gap-1"><Calendar size={16}/> {trip.departure_date || 'غير محدد'}</span>
            <span className="flex items-center gap-1"><Star size={16}/> {trip.assigned_employee?.name || 'بدون مسؤول'}</span>
          </div>
        </div>
        
        <div className="w-full md:w-64 bg-white/10 p-4 rounded-xl border border-white/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-gold-400">نسبة الإنجاز</span>
            <span className="font-bold">{trip.progress_percentage}%</span>
          </div>
          <div className="w-full bg-navy-900 rounded-full h-2">
            <div className="bg-gold-500 h-2 rounded-full" style={{ width: `${trip.progress_percentage}%` }}></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'info', title: 'معلومات الرحلة', icon: FileText },
          { id: 'customers', title: 'العملاء', icon: Users },
          { id: 'financial', title: 'الحسابات والتسعير', icon: DollarSign },
          { id: 'execution', title: 'التنفيذ والتشغيل', icon: Briefcase },
          { id: 'logs', title: 'سجل الأحداث', icon: Clock }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-navy-900 text-white shadow-md' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <tab.icon size={18} />
            {tab.title}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
        
        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-lg font-bold text-navy-900 border-b pb-2">التفاصيل الأساسية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">اسم الرحلة</p>
                <p className="font-bold text-navy-900">{trip.name}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">تاريخ الذهاب</p>
                <p className="font-bold text-navy-900">{trip.departure_date || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">تاريخ العودة</p>
                <p className="font-bold text-navy-900">{trip.return_date || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">الوجهة</p>
                <p className="font-bold text-navy-900">{trip.destination || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">عدد المسافرين</p>
                <p className="font-bold text-navy-900">{customers.length} أفراد</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">حالة الرحلة</p>
                <p className="font-bold text-emerald-600">{trip.status}</p>
              </div>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-lg font-bold text-navy-900">عملاء الرحلة</h3>
              <button onClick={() => setShowAddCustomer(true)} className="btn-gold flex items-center gap-2 py-2 text-sm">
                <Plus size={16} /> إضافة عميل جديد
              </button>
            </div>
            
            {customers.length === 0 ? (
              <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                لا يوجد عملاء مضافين لهذه الرحلة حتى الآن.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customers.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-gold-300 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-navy-900 text-lg">{c.name}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-navy-100 text-navy-800">{c.age_group || 'بالغ'}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{c.phone}</p>
                    </div>
                    <button 
                      onClick={() => onNavigate('customer-details', c.id)}
                      className="text-gold-600 hover:text-gold-700 text-sm font-bold bg-gold-50 px-3 py-1.5 rounded-lg"
                    >
                      فتح الملف
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showAddCustomer && (
              <form onSubmit={handleAddCustomer} className="p-6 bg-navy-50 rounded-xl border border-navy-100 mt-6 max-w-2xl">
                <h4 className="font-bold text-navy-900 mb-4">إضافة عميل جديد للرحلة</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-bold text-navy-800 mb-1 block">اسم العميل</label>
                    <input required type="text" className="input-field bg-white" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-navy-800 mb-1 block">رقم الهاتف</label>
                    <input required type="text" className="input-field bg-white" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-navy-800 mb-1 block">النوع</label>
                    <select className="input-field bg-white" value={newCustomer.age_group} onChange={e => setNewCustomer({...newCustomer, age_group: e.target.value})}>
                      <option value="بالغ">بالغ</option>
                      <option value="طفل">طفل</option>
                      <option value="رضيع">رضيع</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setShowAddCustomer(false)} className="btn-outline">إلغاء</button>
                  <button type="submit" className="btn-gold">حفظ وإضافة</button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Financial Tab */}
        {activeTab === 'financial' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-lg font-bold text-navy-900">الحسابات والتسعير المجمع</h3>
              <button onClick={handleUpdatePrice} className="btn-gold py-2 text-sm">
                تعديل إجمالي التسعير
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-navy-900 to-navy-800 p-6 rounded-2xl text-white shadow-md">
                <p className="text-navy-200 text-sm mb-1">إجمالي المطلوب</p>
                <p className="text-3xl font-black">{trip.total_price.toLocaleString('ar-EG')} <span className="text-base font-normal">ج.م</span></p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl shadow-sm">
                <p className="text-emerald-700 text-sm mb-1">إجمالي المدفوع (تجريبي)</p>
                <p className="text-3xl font-black text-emerald-800">0 <span className="text-base font-normal">ج.م</span></p>
              </div>
              <div className="bg-red-50 border border-red-100 p-6 rounded-2xl shadow-sm">
                <p className="text-red-700 text-sm mb-1">المتبقي (تجريبي)</p>
                <p className="text-3xl font-black text-red-800">{trip.total_price.toLocaleString('ar-EG')} <span className="text-base font-normal">ج.م</span></p>
              </div>
            </div>
            
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800">
              <AlertCircle className="shrink-0" />
              <p className="text-sm">لإضافة دفعات مالية أو أقساط لهذه الرحلة، سيتم تفعيل شاشة المعاملات المالية المجمعة قريباً، أو يمكنك الدخول لملف "العميل الرئيسي" وتسجيل الدفعة هناك.</p>
            </div>
          </div>
        )}

        {/* Execution Tab */}
        {activeTab === 'execution' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-lg font-bold text-navy-900">أمر الشغل - التنفيذ</h3>
              {trip.progress_percentage === 100 && (
                <button className="btn-gold flex items-center gap-2 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white">
                  <Upload size={16} /> تجميع ملفات الرحلة (ZIP)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {executionItems.map(item => {
                const itemData = trip.execution_details[item.id];
                const isCompleted = itemData?.status === 'مكتمل';
                
                return (
                  <div key={item.id} className={`p-4 rounded-xl border transition-all ${isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <item.icon size={20} className={isCompleted ? 'text-emerald-600' : 'text-gray-400'} />
                        <h4 className={`font-bold ${isCompleted ? 'text-emerald-900' : 'text-navy-900'}`}>{item.title}</h4>
                      </div>
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                          <CheckCircle2 size={14} /> مكتمل
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded">قيد الانتظار</span>
                      )}
                    </div>
                    
                    {isCompleted ? (
                      <div className="text-sm text-emerald-800 bg-white/60 p-2 rounded border border-emerald-100">
                        {itemData.details}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="أدخل التفاصيل (مثال: رقم الحجز، اسم الفندق...)" 
                          className="input-field text-sm py-1.5 flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleExecutionFileUpdate(item.id, e.currentTarget.value);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-lg font-bold text-navy-900 border-b pb-2">سجل الأحداث</h3>
            
            {logs.length === 0 ? (
              <div className="text-center py-10 text-gray-500">لا توجد أحداث مسجلة بعد.</div>
            ) : (
              <div className="space-y-4">
                {logs.map(log => (
                  <div key={log.id} className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center shrink-0 font-bold">
                      {log.user?.name?.[0] || '?'}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-bold text-navy-900">{log.action}</span>
                        <span className="text-xs text-gray-400">• {new Date(log.created_at).toLocaleString('ar-EG')}</span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">بواسطة: {log.user?.name || 'النظام'}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{log.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
