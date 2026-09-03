import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Star, Users, DollarSign, Briefcase, Clock, 
  Plane, Calendar, Plus, Upload, CheckCircle2, AlertCircle, FileText, Save
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { compressImage } from '../lib/imageCompressor';
import { ensureVipAccountingArtifacts } from '../lib/vipAccounting';
import type { VIPTrip, Customer, VIPTripLog } from '../types';

interface VIPDetailsProps {
  tripId: string;
  onNavigate: (page: string, params?: any) => void;
}

interface VipBookingRow {
  id: string;
  customer_id: string;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
}

interface VipPaymentRow {
  id: string;
  customer_id: string;
  amount: number;
  status: string;
  payment_date: string;
}

export default function VIPDetails({ tripId, onNavigate }: VIPDetailsProps) {
  const { profile } = useAuth();
  const [trip, setTrip] = useState<VIPTrip | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [logs, setLogs] = useState<VIPTripLog[]>([]);
  const [vipBookings, setVipBookings] = useState<VipBookingRow[]>([]);
  const [vipPayments, setVipPayments] = useState<VipPaymentRow[]>([]);
  const [pricingDrafts, setPricingDrafts] = useState<Record<string, string>>({});
  const [executionDrafts, setExecutionDrafts] = useState<Record<string, string>>({});
  const [savingPricing, setSavingPricing] = useState(false);
  const [savingExecutionItem, setSavingExecutionItem] = useState<string | null>(null);
  const [operating, setOperating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info'|'customers'|'financial'|'execution'|'logs'>('info');

  // Customer Add Form State
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', age_group: 'بالغ' });
  const [docUploads, setDocUploads] = useState<Record<string, { file: File | null; preview: string }>>({
    passport_image: { file: null, preview: '' },
    personal_photo: { file: null, preview: '' },
    national_id_image: { file: null, preview: '' }
  });

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

      if (tripRes.data) {
        const vipTrip = tripRes.data as VIPTrip;
        setTrip(vipTrip as any);
        const details = vipTrip.execution_details || {};
        setExecutionDrafts(
          Object.fromEntries(executionItems.map((item) => [item.id, details[item.id]?.details || '']))
        );
      }
      if (custRes.data) setCustomers(custRes.data as Customer[]);
      if (logRes.data) setLogs(logRes.data as VIPTripLog[]);

      if (tripRes.data && custRes.data?.length) {
        const vipTrip = tripRes.data as VIPTrip;
        await Promise.all(
          (custRes.data as Customer[]).map((customer) =>
            ensureVipAccountingArtifacts({
              customerId: customer.id,
              customerName: customer.name,
              assignedEmployeeId: customer.assigned_employee_id || vipTrip.assigned_employee_id || null,
              serviceType: customer.service_type || 'حج',
              tripName: vipTrip.name,
              destination: vipTrip.destination || null,
              departureDate: vipTrip.departure_date || null,
              returnDate: vipTrip.return_date || null,
              travelersCount: 1,
              totalAmount: 0,
              notes: 'مزامنة تلقائية لملف رحلة VIP مع الحسابات',
              notifyAssignedEmployee: false,
            })
          )
        );
      }

      const customerIds = ((custRes.data as Customer[] | null) || []).map((customer) => customer.id);
      if (customerIds.length > 0) {
        const [bookingRes, paymentRes] = await Promise.all([
          supabase
            .from('bookings')
            .select('id, customer_id, total_amount, paid_amount, payment_status')
            .in('customer_id', customerIds)
            .eq('source', 'VIP'),
          supabase
            .from('payments')
            .select('id, customer_id, amount, status, payment_date')
            .in('customer_id', customerIds),
        ]);

        const bookings = (bookingRes.data || []) as VipBookingRow[];
        setVipBookings(bookings);
        setVipPayments(((paymentRes.data || []) as VipPaymentRow[]));
        setPricingDrafts(
          Object.fromEntries(customerIds.map((customerId) => {
            const booking = bookings.find((item) => item.customer_id === customerId);
            return [customerId, booking?.total_amount ? String(booking.total_amount) : ''];
          }))
        );
      } else {
        setVipBookings([]);
        setVipPayments([]);
        setPricingDrafts({});
      }
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
        client_type: 'فردي',
        is_vip: true,
        vip_trip_id: tripId,
        assigned_employee_id: trip?.assigned_employee_id || null,
        status: 'جديد',
        source: 'رحلة VIP',
        service_type: 'حج'
      }).select().single();
      
      if (error) throw error;

      await ensureVipAccountingArtifacts({
        customerId: data.id,
        customerName: newCustomer.name,
        assignedEmployeeId: trip?.assigned_employee_id || null,
        serviceType: 'حج',
        tripName: trip?.name || 'رحلة VIP',
        destination: trip?.destination || null,
        departureDate: trip?.departure_date || null,
        returnDate: trip?.return_date || null,
        travelersCount: 1,
        totalAmount: 0,
        notes: `تمت إضافة العميل من ملف الرحلة VIP-${trip?.trip_number || ''}`,
      });
      
      // Handle File Uploads in Background
      const docTypes = [
        { id: 'passport_image', label: 'جواز السفر' },
        { id: 'personal_photo', label: 'الصورة الشخصية' },
        { id: 'national_id_image', label: 'بطاقة الهوية' }
      ];

      const uploadPromises = docTypes.map(async (d) => {
        const doc = docUploads[d.id];
        if (!doc.file) return;
        const compressedFile = await compressImage(doc.file);
        const ext = (compressedFile.name.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '');
        const docTypeKey: Record<string, string> = {
          'passport_image': 'passport',
          'personal_photo': 'photo',
          'national_id_image': 'national_id'
        };
        const safeDocType = docTypeKey[d.id] || 'document';
        const fileName = `${data.id}/${safeDocType}_${Date.now()}.${ext}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, compressedFile, { cacheControl: '3600', upsert: false });
          
        if (uploadError) throw uploadError;
        
        await supabase.from('documents').insert({
          customer_id: data.id,
          document_type: d.label,
          file_path: fileName,
          uploaded_by: profile?.id
        });
      });

      Promise.all(uploadPromises).catch(err => {
        console.error('Error during VIP customer background upload:', err);
      });

      // Log event
      await supabase.from('vip_trip_logs').insert({
        trip_id: tripId,
        user_id: profile?.id,
        action: 'إضافة عميل',
        details: `تم إضافة العميل: ${newCustomer.name}`
      });

      setShowAddCustomer(false);
      setNewCustomer({ name: '', phone: '', age_group: 'بالغ' });
      setDocUploads({
        passport_image: { file: null, preview: '' },
        personal_photo: { file: null, preview: '' },
        national_id_image: { file: null, preview: '' }
      });
      loadTripDetails();
    } catch (err: any) {
      alert('خطأ في الإضافة: ' + err.message);
    }
  };

  const handleSaveDetailedPricing = async () => {
    if (!trip) return;
    setSavingPricing(true);
    try {
      await Promise.all(customers.map(async (customer) => {
        const amount = Number(pricingDrafts[customer.id] || 0);
        if (!Number.isFinite(amount) || amount < 0) {
          throw new Error(`قيمة غير صحيحة للعميل ${customer.name}`);
        }

        const result = await ensureVipAccountingArtifacts({
          customerId: customer.id,
          customerName: customer.name,
          assignedEmployeeId: customer.assigned_employee_id || trip.assigned_employee_id || null,
          serviceType: customer.service_type || 'حج',
          tripName: trip.name,
          destination: trip.destination || null,
          departureDate: trip.departure_date || null,
          returnDate: trip.return_date || null,
          travelersCount: 1,
          totalAmount: amount,
          notes: 'حفظ التسعير التفصيلي لرحلة VIP',
          notifyAssignedEmployee: false,
        });

        const booking = vipBookings.find((item) => item.customer_id === customer.id);
        const paidAmount = Number(booking?.paid_amount || 0);
        let paymentStatus = 'غير مدفوع';
        if (amount > 0 && paidAmount >= amount) paymentStatus = 'مدفوع بالكامل';
        else if (paidAmount > 0) paymentStatus = 'مدفوع جزئياً';

        if (result.bookingId) {
          const { error } = await supabase
            .from('bookings')
            .update({ total_amount: amount, payment_status: paymentStatus })
            .eq('id', result.bookingId);
          if (error) throw error;
        }
      }));

      const tripTotal = customers.reduce((sum, customer) => sum + Number(pricingDrafts[customer.id] || 0), 0);
      const { error } = await supabase.from('vip_trips').update({ total_price: tripTotal }).eq('id', tripId);
      if (error) throw error;
      
      await supabase.from('vip_trip_logs').insert({
        trip_id: tripId, user_id: profile?.id,
        action: 'حفظ التسعير التفصيلي', details: `تم حفظ تسعير ${customers.length} عميل بإجمالي ${tripTotal.toLocaleString('ar-EG')} ج.م`
      });
      loadTripDetails();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingPricing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('حجم الملف يجب أن لا يتجاوز 10 ميجابايت');
        return;
      }
      const preview = URL.createObjectURL(file);
      setDocUploads(prev => ({ ...prev, [type]: { file, preview } }));
    }
  };

  const handleExecutionFileUpdate = async (itemId: string) => {
    if (!trip) return;
    const details = executionDrafts[itemId] || '';
    if (!details.trim()) {
      alert('اكتب تفاصيل البند قبل الحفظ.');
      return;
    }
    setSavingExecutionItem(itemId);
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
    } finally {
      setSavingExecutionItem(null);
    }
  };

  const handleStartOperations = async () => {
    if (!trip) return;
    if (customers.length === 0) {
      alert('لا يمكن تشغيل الملف قبل إضافة عميل واحد على الأقل للرحلة.');
      return;
    }

    setOperating(true);
    try {
      await Promise.all(customers.map((customer) =>
        ensureVipAccountingArtifacts({
          customerId: customer.id,
          customerName: customer.name,
          assignedEmployeeId: customer.assigned_employee_id || trip.assigned_employee_id || null,
          serviceType: customer.service_type || 'حج',
          tripName: trip.name,
          destination: trip.destination || null,
          departureDate: trip.departure_date || null,
          returnDate: trip.return_date || null,
          travelersCount: 1,
          totalAmount: Number(pricingDrafts[customer.id] || 0),
          notes: 'تشغيل ملف رحلة VIP',
          notifyAssignedEmployee: false,
        })
      ));

      const customerIds = customers.map((customer) => customer.id);
      const { error: operationError } = await supabase
        .from('operation_files')
        .update({
          employee_id: trip.assigned_employee_id || null,
          assigned_to: trip.assigned_employee_id || null,
          file_status: 'قيد التجهيز',
          workflow_stage: 'operations',
          notes: 'تم تشغيل ملف VIP وتحويله للموظف المسؤول',
        })
        .in('customer_id', customerIds)
        .neq('workflow_stage', 'completed');

      if (operationError) throw operationError;

      await supabase.from('vip_trip_logs').insert({
        trip_id: tripId,
        user_id: profile?.id,
        action: 'تشغيل الملف',
        details: `تم تشغيل ملف الرحلة وتحويله إلى ${trip.assigned_employee?.name || 'الموظف المسؤول'}`,
      });

      if (trip.assigned_employee_id) {
        await supabase.from('notifications').insert({
          employee_id: trip.assigned_employee_id,
          type: 'task_assigned',
          title: 'تم تشغيل ملف VIP وتحويله إليك',
          body: `رحلة: ${trip.name} - عدد العملاء: ${customers.length} - رقم الرحلة الداخلي: ${trip.id}`,
        });
      }

      loadTripDetails();
    } catch (err: any) {
      alert('خطأ في تشغيل الملف: ' + err.message);
    } finally {
      setOperating(false);
    }
  };

  const getCustomerBooking = (customerId: string) => vipBookings.find((booking) => booking.customer_id === customerId);
  const getCustomerPaid = (customerId: string) => vipPayments
    .filter((payment) => payment.customer_id === customerId && payment.status !== 'غير مدفوع')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const detailedTotal = customers.reduce((sum, customer) => sum + Number(pricingDrafts[customer.id] || getCustomerBooking(customer.id)?.total_amount || 0), 0);
  const paidTotal = customers.reduce((sum, customer) => sum + getCustomerPaid(customer.id), 0);
  const remainingTotal = Math.max(0, detailedTotal - paidTotal);

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

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="col-span-full">
                      <h5 className="font-bold text-navy-800 border-b pb-2 mb-2">المستندات</h5>
                    </div>
                    {[
                      { id: 'passport_image', label: 'جواز السفر' },
                      { id: 'personal_photo', label: 'صورة شخصية' },
                      { id: 'national_id_image', label: 'بطاقة الهوية' }
                    ].map(doc => (
                      <div key={doc.id} className="bg-white p-3 rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-2">
                        <label className="text-sm font-bold text-gray-700">{doc.label}</label>
                        <input 
                          type="file" 
                          id={`doc_${doc.id}`}
                          className="hidden"
                          accept="image/*"
                          onChange={e => handleFileUpload(e, doc.id)}
                        />
                        <button 
                          type="button"
                          onClick={() => document.getElementById(`doc_${doc.id}`)?.click()}
                          className="btn-outline w-full py-2 text-xs flex justify-center items-center gap-2"
                        >
                          <Upload size={14} /> اختار ملف
                        </button>
                        {docUploads[doc.id]?.preview && (
                          <div className="w-full relative mt-2 rounded overflow-hidden h-20">
                            <img src={docUploads[doc.id].preview} alt="preview" className="w-full h-full object-cover" />
                            <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5">
                              <CheckCircle2 size={12} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
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
              <h3 className="text-lg font-bold text-navy-900">الحسابات والتسعير التفصيلي</h3>
              <button onClick={handleSaveDetailedPricing} disabled={savingPricing || customers.length === 0} className="btn-gold py-2 text-sm disabled:opacity-50">
                <Save size={16} /> {savingPricing ? 'جارٍ الحفظ...' : 'حفظ التسعير'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-navy-900 to-navy-800 p-6 rounded-2xl text-white shadow-md">
                <p className="text-navy-200 text-sm mb-1">إجمالي المطلوب</p>
                <p className="text-3xl font-black">{detailedTotal.toLocaleString('ar-EG')} <span className="text-base font-normal">ج.م</span></p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl shadow-sm">
                <p className="text-emerald-700 text-sm mb-1">إجمالي المدفوع</p>
                <p className="text-3xl font-black text-emerald-800">{paidTotal.toLocaleString('ar-EG')} <span className="text-base font-normal">ج.م</span></p>
              </div>
              <div className="bg-red-50 border border-red-100 p-6 rounded-2xl shadow-sm">
                <p className="text-red-700 text-sm mb-1">المتبقي</p>
                <p className="text-3xl font-black text-red-800">{remainingTotal.toLocaleString('ar-EG')} <span className="text-base font-normal">ج.م</span></p>
              </div>
            </div>

            {customers.length === 0 ? (
              <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                أضف عملاء للرحلة أولاً حتى يظهر التسعير التفصيلي.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                <table className="w-full data-table">
                  <thead>
                    <tr>
                      <th>العميل</th>
                      <th>الفئة</th>
                      <th>السعر المطلوب</th>
                      <th>المدفوع</th>
                      <th>المتبقي</th>
                      <th>حالة الدفع</th>
                      <th>ملف العميل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => {
                      const booking = getCustomerBooking(customer.id);
                      const price = Number(pricingDrafts[customer.id] || booking?.total_amount || 0);
                      const paid = getCustomerPaid(customer.id);
                      const remaining = Math.max(0, price - paid);

                      return (
                        <tr key={customer.id}>
                          <td className="font-bold text-navy-900">{customer.name}</td>
                          <td>{customer.age_group || 'بالغ'}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              value={pricingDrafts[customer.id] ?? ''}
                              onChange={(e) => setPricingDrafts((prev) => ({ ...prev, [customer.id]: e.target.value }))}
                              className="form-input w-36 text-sm"
                              placeholder="0"
                            />
                          </td>
                          <td className="font-bold text-emerald-700">{paid.toLocaleString('ar-EG')} ج.م</td>
                          <td className="font-bold text-red-700">{remaining.toLocaleString('ar-EG')} ج.م</td>
                          <td>
                            <span className={`badge ${remaining === 0 && price > 0 ? 'bg-emerald-100 text-emerald-700' : paid > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                              {booking?.payment_status || 'غير مدفوع'}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => onNavigate('customer-details', customer.id)}
                              className="text-gold-600 hover:text-gold-700 text-sm font-bold"
                            >
                              فتح الملف
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex gap-3 text-emerald-800">
              <AlertCircle className="shrink-0" />
              <p className="text-sm">التسعير هنا يُحفظ على حجز كل عميل داخل الرحلة. تسجيل الدفعات يتم من شاشة المدفوعات أو من ملف العميل، وبعد التسجيل ستظهر المدفوعات والمتبقي هنا تلقائياً.</p>
            </div>
          </div>
        )}

        {/* Execution Tab */}
        {activeTab === 'execution' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-lg font-bold text-navy-900">أمر الشغل - التنفيذ</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleStartOperations}
                  disabled={operating || customers.length === 0}
                  className="btn-gold flex items-center gap-2 py-2 text-sm disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> {operating ? 'جارٍ التشغيل...' : 'تشغيل الملف'}
                </button>
                {trip.progress_percentage === 100 && (
                  <button className="btn-gold flex items-center gap-2 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white">
                    <Upload size={16} /> تجميع ملفات الرحلة (ZIP)
                  </button>
                )}
              </div>
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
                    
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={executionDrafts[item.id] || ''}
                        onChange={(e) => setExecutionDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        placeholder="أدخل التفاصيل (مثال: رقم الحجز، اسم الفندق، رقم التأكيد...)"
                        className="input-field text-sm min-h-[82px] resize-none bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleExecutionFileUpdate(item.id)}
                        disabled={savingExecutionItem === item.id}
                        className={`self-end px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
                          isCompleted ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-navy-900 text-white hover:bg-navy-800'
                        } disabled:opacity-60`}
                      >
                        <Save size={14} /> {savingExecutionItem === item.id ? 'جارٍ الحفظ...' : isCompleted ? 'تحديث البند' : 'حفظ وتأكيد'}
                      </button>
                    </div>
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
