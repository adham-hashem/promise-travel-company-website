import React, { useState, useEffect } from 'react';
import { Plus, Search, Plane, Users, Calendar, ArrowLeft, Star, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { VIPTrip, Employee } from '../types';

interface VIPTripsProps {
  onNavigate: (page: string, params?: any) => void;
}

export default function VIPTrips({ onNavigate }: VIPTripsProps) {
  const { profile } = useAuth();
  const [trips, setTrips] = useState<VIPTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTrip, setNewTrip] = useState({
    name: '',
    assigned_employee_id: profile?.id || '',
    destination: '',
    departure_date: '',
    return_date: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tripsRes, empRes] = await Promise.all([
        supabase
          .from('vip_trips')
          .select('*, assigned_employee:user_profiles!vip_trips_assigned_employee_id_fkey(*), customers(count)')
          .order('created_at', { ascending: false }),
        supabase.from('user_profiles').select('*').eq('is_active', true)
      ]);

      if (tripsRes.data) {
        setTrips(tripsRes.data as any[]);
      }
      if (empRes.data) {
        setEmployees(empRes.data as Employee[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('vip_trips')
        .insert({
          name: newTrip.name,
          assigned_employee_id: newTrip.assigned_employee_id || null,
          destination: newTrip.destination || null,
          departure_date: newTrip.departure_date || null,
          return_date: newTrip.return_date || null,
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Log event
      await supabase.from('vip_trip_logs').insert({
        trip_id: data.id,
        user_id: profile?.id,
        action: 'إنشاء الرحلة',
        details: 'تم إنشاء رحلة VIP جديدة'
      });

      setShowAddModal(false);
      onNavigate('vip-details', data.id);
    } catch (err: any) {
      alert('خطأ في الإنشاء: ' + err.message);
    }
  };

  const filteredTrips = trips.filter(t => 
    t.name.includes(searchTerm) || 
    t.destination?.includes(searchTerm) || 
    t.trip_number?.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Star className="text-gold-600" /> رحلات VIP
          </h2>
          <p className="section-subtitle">إدارة ومتابعة رحلات العملاء المميزين</p>
        </div>
        
        <button onClick={() => setShowAddModal(true)} className="btn-gold flex items-center gap-2">
          <Plus size={20} /> إضافة رحلة VIP
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="ابحث برقم الرحلة، اسم الرحلة، الوجهة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pr-10"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-gray-500">جاري التحميل...</div>
        ) : filteredTrips.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500">لا توجد رحلات VIP. اضغط على الزر أعلاه لإضافة رحلة جديدة.</div>
        ) : (
          filteredTrips.map(trip => (
            <div key={trip.id} className="card p-0 overflow-hidden hover:shadow-lg transition-shadow border border-gold-100 flex flex-col">
              <div className="bg-gradient-to-l from-navy-900 to-navy-800 p-4 text-white relative">
                <div className="absolute top-0 right-0 bg-gold-500 text-navy-900 font-bold px-3 py-1 rounded-bl-xl text-xs">
                  VIP-{trip.trip_number}
                </div>
                <h3 className="font-bold text-lg mb-1 pr-16">{trip.name}</h3>
                <p className="text-navy-100 text-sm flex items-center gap-1">
                  <Plane size={14} /> {trip.destination || 'وجهة غير محددة'}
                </p>
              </div>
              
              <div className="p-4 space-y-3 flex-1 flex flex-col">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users size={16} /> المسافرين
                  </div>
                  <span className="font-bold text-navy-800">
                    {/* @ts-ignore */}
                    {trip.customers?.[0]?.count || 0} أفراد
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar size={16} /> السفر
                  </div>
                  <span className="font-bold text-navy-800">
                    {trip.departure_date ? new Date(trip.departure_date).toLocaleDateString('ar-EG') : '-'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Star size={16} /> الموظف
                  </div>
                  <span className="font-bold text-navy-800">
                    {trip.assigned_employee?.name || '-'}
                  </span>
                </div>

                <div className="mt-auto pt-4">
                  <div className="flex justify-between items-center mb-1 text-xs font-bold">
                    <span className="text-gray-600">نسبة الإنجاز</span>
                    <span className="text-emerald-600">{trip.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${trip.progress_percentage}%` }}></div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => onNavigate('vip-details', trip.id)}
                className="w-full py-3 bg-gray-50 hover:bg-gold-50 text-navy-800 font-bold border-t border-gray-100 flex items-center justify-center gap-2 transition-colors"
              >
                تفاصيل وملف الرحلة <ArrowLeft size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fadeIn">
            <h3 className="text-xl font-bold text-navy-900 mb-6 flex items-center gap-2">
              <Star className="text-gold-600" /> إضافة رحلة VIP
            </h3>
            
            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div>
                <label className="form-label">اسم الرحلة (مثال: عائلة المهندس أحمد)</label>
                <input required type="text" className="input-field" value={newTrip.name} onChange={e => setNewTrip({...newTrip, name: e.target.value})} />
              </div>
              <div>
                <label className="form-label">الوجهة (مثال: مكة - المدينة - دبي)</label>
                <input type="text" className="input-field" value={newTrip.destination} onChange={e => setNewTrip({...newTrip, destination: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">تاريخ الذهاب</label>
                  <input type="date" className="input-field" value={newTrip.departure_date} onChange={e => setNewTrip({...newTrip, departure_date: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">تاريخ العودة</label>
                  <input type="date" className="input-field" value={newTrip.return_date} onChange={e => setNewTrip({...newTrip, return_date: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="form-label">موظف VIP المسؤول عن الرحلة</label>
                <select 
                  className="input-field"
                  value={newTrip.assigned_employee_id}
                  onChange={e => setNewTrip({...newTrip, assigned_employee_id: e.target.value})}
                  required
                >
                  <option value="">-- اختر الموظف --</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">الموظف المختار سيكون مسؤولاً عن الحسابات والتنفيذ بالكامل لهذه الرحلة.</p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-outline flex-1">إلغاء</button>
                <button type="submit" className="btn-gold flex-1">إنشاء الرحلة والبدء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
