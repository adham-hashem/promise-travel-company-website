import { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft, Crown, Phone, MapPin, Hash,
  Loader2, CheckCircle2, AlertCircle, FileText, Upload,
  Eye, Trash2, Edit2, Save, X, Clock,
  Plane, Hotel, Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Customer, Page, VipRequest, VipWorkflowStep } from '../types';

const stagesConfig = [
  { key: 'accounts', label: 'الحسابات', color: 'border-blue-500 text-blue-600 bg-blue-50/50' },
  { key: 'operations', label: 'التشغيل', color: 'border-purple-500 text-purple-600 bg-purple-50/50' },
  { key: 'bookings', label: 'الحجوزات', color: 'border-pink-500 text-pink-600 bg-pink-50/50' },
  { key: 'flights', label: 'الطيران', color: 'border-cyan-500 text-cyan-600 bg-cyan-50/50' },
  { key: 'hotels', label: 'الفنادق', color: 'border-orange-500 text-orange-600 bg-orange-50/50' },
  { key: 'housing', label: 'التسكين', color: 'border-indigo-500 text-indigo-600 bg-indigo-50/50' },
  { key: 'visas', label: 'التأشيرات', color: 'border-amber-500 text-amber-600 bg-amber-50/50' },
  { key: 'ready', label: 'جاهز للسفر', color: 'border-emerald-500 text-emerald-600 bg-emerald-50/50' },
];

const statusOptions = ['لم يبدأ', 'قيد التنفيذ', 'تم التأكيد', 'مكتمل', 'ملغي'];

const stepLabelMap: Record<string, string> = {
  pricing: 'تم إصدار عرض السعر',
  payment_approval: 'تم اعتماد الدفع',
  hotel_booking: 'جاري حجز الفندق',
  hotel_confirmation: 'تم تأكيد الفندق',
  flight_booking: 'جاري حجز الطيران',
  flight_issuance: 'تم إصدار التذكرة',
  train_booking: 'جاري حجز القطار',
  train_confirmation: 'تم تأكيد القطار',
  visa_processing: 'جاري تجهيز التأشيرة',
  visa_issuance: 'صدرت التأشيرة',
  itinerary_prep: 'جاري تجهيز برنامج الرحلة',
  travel_ready: 'جاهز للسفر',
};

interface StepMeta {
  startDate: string;
  endDate: string;
  notes: string;
}

function parseStepNotes(notesText: string | null | undefined): StepMeta {
  if (!notesText) return { startDate: '', endDate: '', notes: '' };
  try {
    const trimmed = notesText.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      return {
        startDate: parsed.startDate || '',
        endDate: parsed.endDate || '',
        notes: parsed.notes || '',
      };
    }
  } catch (e) {
    // fallback to text notes
  }
  return { startDate: '', endDate: '', notes: notesText };
}

function serializeStepNotes(meta: StepMeta): string {
  return JSON.stringify({
    startDate: meta.startDate,
    endDate: meta.endDate,
    notes: meta.notes,
  });
}

interface Props {
  customerId: string | undefined;
  onNavigate: (page: Page, id?: string) => void;
}

export default function VIPDetails({ customerId, onNavigate }: Props) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Loaded data
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vipRequest, setVipRequest] = useState<VipRequest | null>(null);
  const [steps, setSteps] = useState<VipWorkflowStep[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);

  // Editing state
  const [editingRequest, setEditingRequest] = useState(false);
  const [reqForm, setReqForm] = useState<any>({});
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [stepForm, setStepForm] = useState({
    status: '',
    assigned_employee_id: '',
    startDate: '',
    endDate: '',
    notes: '',
  });

  // Uploading doc state
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [newDocType, setNewDocType] = useState('مستند إضافي');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (customerId) {
      loadData();
    }
  }, [customerId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch employee list
      const { data: empData } = await supabase.from('employees').select('id, name').eq('is_active', true);
      if (empData) setEmployees(empData);

      // 2. Fetch full data via RPC or query (fallback to query if RPC doesn't resolve is_vip yet)
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_customer_full_data', { p_client_code: customerId });

      if (rpcErr) {
        console.error('RPC Error:', rpcErr);
        // Fallback query if client_code isn't matched
        await loadDataByQuery();
        return;
      }

      if (rpcData && rpcData.found) {
        setCustomer(rpcData.customer);
        setVipRequest(rpcData.vip_request);
        setSteps(rpcData.vip_steps || []);
        setTimeline(rpcData.timeline || []);
        setDocuments(rpcData.documents || []);
      } else {
        await loadDataByQuery();
      }
    } catch (e) {
      console.error(e);
      setError('فشل في تحميل تفاصيل العميل');
    } finally {
      setLoading(false);
    }
  };

  const loadDataByQuery = async () => {
    // Fallback: Query by ID or client_code directly
    const { data: cust } = await supabase
      .from('customers')
      .select('*')
      .or(`client_code.eq.${customerId},id.eq.${customerId}`)
      .single();

    if (!cust) {
      setError('لم يتم العثور على العميل');
      return;
    }

    setCustomer(cust);

    const { data: req } = await supabase
      .from('vip_requests')
      .select('*')
      .eq('customer_id', cust.id)
      .maybeSingle();

    if (req) {
      setVipRequest(req);
      setReqForm(req);

      // Load steps
      const { data: stps } = await supabase
        .from('vip_workflow_steps')
        .select('*')
        .eq('vip_request_id', req.id)
        .order('created_at', { ascending: true });
      if (stps) setSteps(stps as VipWorkflowStep[]);
    }

    // Load timeline
    const { data: tl } = await supabase
      .from('workflow_timeline')
      .select('*, user_profiles(name)')
      .eq('customer_id', cust.id)
      .order('created_at', { ascending: false });
    if (tl) {
      setTimeline(tl.map(item => ({ ...item, employee_real_name: item.user_profiles?.name })));
    }

    // Load docs
    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('customer_id', cust.id)
      .order('created_at', { ascending: false });
    if (docs) setDocuments(docs);
  };

  const handleUpdateStage = async (newStage: string) => {
    if (!vipRequest) return;
    try {
      const { error: stageErr } = await supabase
        .from('vip_requests')
        .update({ current_stage: newStage, updated_at: new Date().toISOString() })
        .eq('id', vipRequest.id);

      if (stageErr) throw stageErr;

      setVipRequest({ ...vipRequest, current_stage: newStage as any });

      // Log timeline
      const stageLabel = stagesConfig.find(s => s.key === newStage)?.label || newStage;
      await supabase.from('workflow_timeline').insert({
        customer_id: customer?.id,
        stage: 'vip_stage_change',
        stage_label: 'تغيير مرحلة VIP',
        notes: `تم تغيير مرحلة الملف إلى: ${stageLabel}`,
        employee_id: profile?.id,
        employee_name: profile?.name,
      });

      setSuccess(`تم تغيير مرحلة الملف بنجاح إلى: ${stageLabel}`);
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (e: any) {
      setError(e.message || 'فشل تحديث المرحلة');
    }
  };

  const handleEditRequestSave = async () => {
    if (!vipRequest) return;
    try {
      const { error: reqErr } = await supabase
        .from('vip_requests')
        .update({
          travel_city: reqForm.travel_city,
          departure_date: reqForm.departure_date || null,
          return_date: reqForm.return_date || null,
          airline_preference: reqForm.airline_preference,
          flight_class: reqForm.flight_class,
          hotel_preference: reqForm.hotel_preference,
          hotel_stars: reqForm.hotel_stars,
          room_type: reqForm.room_type,
          meal_plan: reqForm.meal_plan,
          view_preference: reqForm.view_preference,
          transportation_method: reqForm.transportation_method,
          train_preference: reqForm.train_preference,
          mazarat: reqForm.mazarat,
          additional_services: reqForm.additional_services,
          travelers_count: Number(reqForm.travelers_count) || 1,
          special_notes: reqForm.special_notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vipRequest.id);

      if (reqErr) throw reqErr;

      // Log timeline
      await supabase.from('workflow_timeline').insert({
        customer_id: customer?.id,
        stage: 'vip_request_update',
        stage_label: 'تعديل متطلبات الرحلة',
        notes: `تم تحديث تفاصيل طلب VIP بواسطة ${profile?.name}`,
        employee_id: profile?.id,
        employee_name: profile?.name,
      });

      setEditingRequest(false);
      setSuccess('تم حفظ متطلبات الرحلة بنجاح');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (e: any) {
      setError(e.message || 'فشل حفظ التعديلات');
    }
  };

  const handleStartEditStep = (step: VipWorkflowStep) => {
    const meta = parseStepNotes(step.department_notes);
    setEditingStepId(step.id);
    setStepForm({
      status: step.status || 'لم يبدأ',
      assigned_employee_id: step.assigned_employee_id || '',
      startDate: meta.startDate,
      endDate: meta.endDate,
      notes: meta.notes,
    });
  };

  const handleSaveStep = async (step: VipWorkflowStep) => {
    try {
      const serializedNotes = serializeStepNotes({
        startDate: stepForm.startDate,
        endDate: stepForm.endDate,
        notes: stepForm.notes,
      });

      const { error: stepErr } = await supabase
        .from('vip_workflow_steps')
        .update({
          status: stepForm.status,
          assigned_employee_id: stepForm.assigned_employee_id || null,
          execution_date: stepForm.endDate || null,
          department_notes: serializedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', step.id);

      if (stepErr) throw stepErr;

      const displayLabel = stepLabelMap[step.step_key] || step.step_label;

      // Log timeline
      const empName = employees.find(e => e.id === stepForm.assigned_employee_id)?.name || 'غير معين';
      await supabase.from('workflow_timeline').insert({
        customer_id: customer?.id,
        stage: 'vip_step_update',
        stage_label: displayLabel,
        notes: `تحديث خطوة [${displayLabel}] | الحالة: ${stepForm.status} | الموظف: ${empName}`,
        employee_id: profile?.id,
        employee_name: profile?.name,
      });

      setEditingStepId(null);
      setSuccess(`تم تحديث خطوة "${displayLabel}" بنجاح`);
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (e: any) {
      setError(e.message || 'فشل حفظ تفاصيل الخطوة');
    }
  };

  const handleUploadDoc = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !customer) return;

    setUploadingDoc(true);
    setError('');
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${customer.id}/${Date.now()}_doc.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from('documents').insert({
        customer_id: customer.id,
        uploaded_by: profile?.id || null,
        doc_type: newDocType,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        status: 'مرفوع',
      });

      if (dbErr) throw dbErr;

      // Log timeline
      await supabase.from('workflow_timeline').insert({
        customer_id: customer.id,
        stage: 'document_uploaded',
        stage_label: 'مستند مرفوع',
        notes: `تم رفع مستند جديد: ${newDocType} (${file.name})`,
        employee_id: profile?.id,
        employee_name: profile?.name,
      });

      setSuccess('تم رفع المستند بنجاح');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (e: any) {
      setError(e.message || 'فشل رفع الملف');
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadDoc = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage.from('documents').download(doc.file_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
    } catch (e: any) {
      alert('خطأ في تحميل الملف: ' + e.message);
    }
  };

  const handleDeleteDoc = async (docId: string, filePath: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستند؟')) return;
    try {
      await supabase.storage.from('documents').remove([filePath]);
      await supabase.from('documents').delete().eq('id', docId);

      setSuccess('تم حذف المستند بنجاح');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (e: any) {
      alert('فشل الحذف: ' + e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3" dir="rtl">
        <Loader2 size={36} className="animate-spin text-gold-500" />
        <p className="text-gray-500 font-semibold text-sm">جارٍ تحميل بيانات عميل VIP...</p>
      </div>
    );
  }

  const currentStageObj = stagesConfig.find(s => s.key === vipRequest?.current_stage);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Navigation Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('vip-dashboard')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-navy-950 font-bold text-xs"
        >
          <ArrowLeft size={16} /> العودة إلى لوحة الـ VIP
        </button>
        {customer?.client_code && (
          <div className="flex items-center gap-1.5 bg-navy-50 border border-navy-100 rounded-xl px-4 py-1.5">
            <Hash size={14} className="text-gold-500" />
            <span className="font-mono font-black text-navy-800 text-sm">{customer.client_code}</span>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3 text-xs flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-5 py-3 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* Hero section */}
      <div className="bg-gradient-to-r from-navy-950 to-navy-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 translate-y-[-20%] translate-x-[-20%] w-60 h-60 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-lg px-2.5 py-1 text-[10px] font-black tracking-wider uppercase flex items-center gap-1">
                <Crown size={12} /> عميل VIP ممتاز
              </span>
              <span className="text-white/60 text-xs">تاريخ الإضافة: {customer?.created_at ? new Date(customer.created_at).toLocaleDateString('ar-EG') : '—'}</span>
            </div>
            <h1 className="text-2xl font-black">{customer?.name}</h1>
            <p className="text-white/70 text-xs flex items-center gap-2">
              <Phone size={14} className="text-gold-400" /> {customer?.phone}
              {customer?.whatsapp && <span className="text-white/40">|</span>}
              {customer?.whatsapp && <span>واتساب: {customer.whatsapp}</span>}
              {customer?.email && <span className="text-white/40">|</span>}
              {customer?.email && <span>البريد: {customer.email}</span>}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col gap-2 min-w-[200px]">
            <p className="text-xs text-white/60 font-semibold">مرحلة ملف VIP الحالية:</p>
            <div className="flex items-center justify-between gap-3 mt-1">
              <span className="text-sm font-bold text-gold-400">{currentStageObj?.label || 'الحسابات'}</span>
              <select
                value={vipRequest?.current_stage || 'accounts'}
                onChange={(e) => handleUpdateStage(e.target.value)}
                className="bg-navy-900 border border-white/20 text-white rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
              >
                {stagesConfig.map((stage) => (
                  <option key={stage.key} value={stage.key}>{stage.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Custom requirements & Documents */}
        <div className="lg:col-span-1 space-y-6">
          {/* Custom requests card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-black text-navy-900 flex items-center gap-2">
                <Crown size={16} className="text-gold-500" /> متطلبات الرحلة الخاصة
              </h3>
              {!editingRequest ? (
                <button
                  onClick={() => {
                    setReqForm({ ...vipRequest });
                    setEditingRequest(true);
                  }}
                  className="text-xs text-gold-600 hover:text-gold-700 font-bold flex items-center gap-1"
                >
                  <Edit2 size={12} /> تعديل
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleEditRequestSave} className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5">
                    <Save size={12} /> حفظ
                  </button>
                  <button onClick={() => setEditingRequest(false)} className="text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-0.5">
                    <X size={12} /> إلغاء
                  </button>
                </div>
              )}
            </div>

            {!editingRequest ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3.5 bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                  <div>
                    <span className="text-gray-400 block mb-0.5">مدينة السفر</span>
                    <span className="font-bold text-navy-950">{vipRequest?.travel_city || 'غير محدد'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">عدد المسافرين</span>
                    <span className="font-bold text-navy-950">{vipRequest?.travelers_count || 1} أفراد</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">تاريخ السفر</span>
                    <span className="font-bold text-navy-950">{vipRequest?.departure_date || 'غير محدد'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">تاريخ العودة</span>
                    <span className="font-bold text-navy-950">{vipRequest?.return_date || 'غير محدد'}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Plane size={15} className="text-gold-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-gray-400 block text-[10px]">تفضيلات الطيران والدرجة</span>
                      <span className="font-semibold text-navy-950">
                        {vipRequest?.airline_preference || 'أي خطوط'} — {vipRequest?.flight_class === 'Business' ? 'درجة رجال أعمال' : vipRequest?.flight_class === 'First Class' ? 'درجة أولى' : 'درجة اقتصادية'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Hotel size={15} className="text-gold-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-gray-400 block text-[10px]">الفندق والخدمات الفندقية</span>
                      <span className="font-semibold text-navy-950 block">
                        {vipRequest?.hotel_preference || 'أي فندق'} ({vipRequest?.hotel_stars || '—'})
                      </span>
                      <span className="text-gray-500 text-[10px] mt-0.5 block">
                        الغرفة: {vipRequest?.room_type || 'غير محدد'} | الوجبات: {vipRequest?.meal_plan || 'غير محدد'} | الإطلالة: {vipRequest?.view_preference || 'غير محدد'}
                      </span>
                    </div>
                  </div>

                  {vipRequest?.transportation_method && (
                    <div className="flex items-start gap-2.5">
                      <MapPin size={15} className="text-gold-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-gray-400 block text-[10px]">الانتقالات والقطار السريع</span>
                        <span className="font-semibold text-navy-950 block">{vipRequest.transportation_method}</span>
                        {vipRequest.train_preference && (
                          <span className="text-gray-500 text-[10px] block mt-0.5">القطار: {vipRequest.train_preference}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {vipRequest?.mazarat && (
                    <div className="bg-navy-50/50 p-2.5 rounded-xl border border-navy-100/50">
                      <span className="text-[10px] text-navy-800 font-bold block mb-0.5">المزارات والجولات المطلوبة:</span>
                      <p className="text-[11px] text-navy-900">{vipRequest.mazarat}</p>
                    </div>
                  )}

                  {vipRequest?.additional_services && (
                    <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/50">
                      <span className="text-[10px] text-amber-800 font-bold block mb-0.5">خدمات إضافية مطلوبة:</span>
                      <p className="text-[11px] text-amber-900">{vipRequest.additional_services}</p>
                    </div>
                  )}

                  {vipRequest?.special_notes && (
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-[10px] text-gray-400 block mb-0.5">شروط أو ملاحظات خاصة:</span>
                      <p className="text-[11px] text-gray-700 italic font-semibold">{vipRequest.special_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label text-[10px]">مدينة السفر</label>
                    <input value={reqForm.travel_city || ''} onChange={(e) => setReqForm({...reqForm, travel_city: e.target.value})} className="form-input text-xs py-1.5" />
                  </div>
                  <div>
                    <label className="form-label text-[10px]">عدد المسافرين</label>
                    <input type="number" min={1} value={reqForm.travelers_count || 1} onChange={(e) => setReqForm({...reqForm, travelers_count: parseInt(e.target.value) || 1})} className="form-input text-xs py-1.5" />
                  </div>
                  <div>
                    <label className="form-label text-[10px]">تاريخ السفر</label>
                    <input type="date" value={reqForm.departure_date || ''} onChange={(e) => setReqForm({...reqForm, departure_date: e.target.value})} className="form-input text-xs py-1.5" />
                  </div>
                  <div>
                    <label className="form-label text-[10px]">تاريخ العودة</label>
                    <input type="date" value={reqForm.return_date || ''} onChange={(e) => setReqForm({...reqForm, return_date: e.target.value})} className="form-input text-xs py-1.5" />
                  </div>
                  <div>
                    <label className="form-label text-[10px]">شركة الطيران</label>
                    <input value={reqForm.airline_preference || ''} onChange={(e) => setReqForm({...reqForm, airline_preference: e.target.value})} className="form-input text-xs py-1.5" />
                  </div>
                  <div>
                    <label className="form-label text-[10px]">درجة السفر</label>
                    <select value={reqForm.flight_class || 'Economy'} onChange={(e) => setReqForm({...reqForm, flight_class: e.target.value})} className="form-input text-xs py-1.5">
                      <option value="Economy">اقتصادية</option>
                      <option value="Business">رجال أعمال</option>
                      <option value="First Class">درجة أولى</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-[10px]">الفندق المفضل</label>
                    <input value={reqForm.hotel_preference || ''} onChange={(e) => setReqForm({...reqForm, hotel_preference: e.target.value})} className="form-input text-xs py-1.5" />
                  </div>
                  <div>
                    <label className="form-label text-[10px]">تصنيف الفندق</label>
                    <input value={reqForm.hotel_stars || ''} onChange={(e) => setReqForm({...reqForm, hotel_stars: e.target.value})} className="form-input text-xs py-1.5" />
                  </div>
                  <div>
                    <label className="form-label text-[10px]">نوع الغرفة</label>
                    <input value={reqForm.room_type || ''} onChange={(e) => setReqForm({...reqForm, room_type: e.target.value})} className="form-input text-xs py-1.5" />
                  </div>
                  <div>
                    <label className="form-label text-[10px]">الوجبات</label>
                    <input value={reqForm.meal_plan || ''} onChange={(e) => setReqForm({...reqForm, meal_plan: e.target.value})} className="form-input text-xs py-1.5" />
                  </div>
                  <div>
                    <label className="form-label text-[10px]">الإطلالة المفضلة</label>
                    <input value={reqForm.view_preference || ''} onChange={(e) => setReqForm({...reqForm, view_preference: e.target.value})} className="form-input text-xs py-1.5" />
                  </div>
                  <div>
                    <label className="form-label text-[10px]">وسيلة الانتقالات</label>
                    <input value={reqForm.transportation_method || ''} onChange={(e) => setReqForm({...reqForm, transportation_method: e.target.value})} className="form-input text-xs py-1.5" />
                  </div>
                  <div className="col-span-2">
                    <label className="form-label text-[10px]">تفضيل القطار</label>
                    <input value={reqForm.train_preference || ''} onChange={(e) => setReqForm({...reqForm, train_preference: e.target.value})} className="form-input text-xs py-1.5" />
                  </div>
                </div>
                <div>
                  <label className="form-label text-[10px]">المزارات والجولات</label>
                  <input value={reqForm.mazarat || ''} onChange={(e) => setReqForm({...reqForm, mazarat: e.target.value})} className="form-input text-xs py-1.5" />
                </div>
                <div>
                  <label className="form-label text-[10px]">خدمات إضافية</label>
                  <input value={reqForm.additional_services || ''} onChange={(e) => setReqForm({...reqForm, additional_services: e.target.value})} className="form-input text-xs py-1.5" />
                </div>
                <div>
                  <label className="form-label text-[10px]">ملاحظات شروط خاصة</label>
                  <textarea value={reqForm.special_notes || ''} onChange={(e) => setReqForm({...reqForm, special_notes: e.target.value})} rows={2} className="form-input text-xs py-1.5 resize-none" />
                </div>
              </div>
            )}
          </div>

          {/* Documents card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-navy-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <FileText size={16} className="text-gold-500" /> وثائق ومستندات العميل
            </h3>

            {/* Upload Area */}
            <div className="bg-gray-50 border border-gray-200/60 rounded-2xl p-3 space-y-3">
              <div className="flex gap-2">
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                  className="form-input text-xs py-1.5 flex-1 bg-white"
                >
                  <option value="جواز سفر">جواز السفر</option>
                  <option value="بطاقة رقم قومي">البطاقة الشخصية</option>
                  <option value="صورة شخصية">الصورة الشخصية</option>
                  <option value="تأشيرة">تأشيرة</option>
                  <option value="فاوتشر فندق">فاوتشر فندق</option>
                  <option value="تذكرة طيران">تذكرة طيران</option>
                  <option value="مستند إضافي">مستندات إضافية</option>
                </select>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingDoc}
                  className="btn-gold py-1.5 px-3 text-xs flex items-center gap-1.5"
                >
                  {uploadingDoc ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Upload size={12} />
                  )}
                  رفع ملف
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={handleUploadDoc}
              />
              <p className="text-[10px] text-gray-400 text-center font-bold">يمكن رفع صور أو ملفات PDF للمستندات</p>
            </div>

            {/* Document list */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar">
              {documents.length === 0 ? (
                <p className="text-[10px] text-gray-400 text-center py-6 font-bold">لا يوجد مستندات مرفوعة حالياً</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText size={15} className="text-navy-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-navy-950 truncate">{doc.file_name}</p>
                        <p className="text-[9px] text-gray-400">
                          {doc.doc_type} | {(doc.file_size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleDownloadDoc(doc)}
                        className="p-1 rounded-lg hover:bg-navy-50 text-navy-600"
                        title="تحميل"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(doc.id, doc.file_path)}
                        className="p-1 rounded-lg hover:bg-red-50 text-red-500"
                        title="حذف"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column: VIP Journey Tracking (12 Steps) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
            <div className="border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-sm font-black text-navy-900 flex items-center gap-2">
                <Clock size={16} className="text-gold-500" /> مسار تنفيذ متطلبات الـ VIP
              </h3>
              <p className="text-gray-400 text-[10px] mt-0.5">لوحة متابعة دقيقة تفصيلية للـ 12 خطوة الخاصة بالرحلة</p>
            </div>

            <div className="space-y-4">
              {steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <AlertCircle size={24} className="text-amber-500" />
                  <p className="text-xs text-gray-500 font-bold">لم يتم تهيئة خطوات المسار لهذه الرحلة</p>
                </div>
              ) : (
                steps.map((step, idx) => {
                  const isEditing = editingStepId === step.id;
                  const stepColors =
                    step.status === 'مكتمل' || step.status === 'تم التأكيد'
                      ? 'border-emerald-200 bg-emerald-50/20 text-emerald-700'
                      : step.status === 'قيد التنفيذ'
                      ? 'border-amber-200 bg-amber-50/20 text-amber-700'
                      : step.status === 'ملغي'
                      ? 'border-red-200 bg-red-50/20 text-red-700'
                      : 'border-gray-100 bg-gray-50/40 text-gray-500';

                  const assignedEmpName = employees.find(e => e.id === step.assigned_employee_id)?.name || step.assigned_employee_name || 'غير معين';

                  return (
                    <div
                      key={step.id}
                      className={`border-2 rounded-2xl p-4 transition-all duration-200 ${stepColors}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-xs bg-white border border-gray-200 w-6 h-6 rounded-full flex items-center justify-center text-navy-900 shadow-sm">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="text-xs font-black text-navy-900">{stepLabelMap[step.step_key] || step.step_label}</h4>
                            {!isEditing && (
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400 mt-0.5">
                                <span>الموظف المسؤول: <span className="font-bold text-navy-800">{assignedEmpName}</span></span>
                                {(() => {
                                  const meta = parseStepNotes(step.department_notes);
                                  return (
                                    <>
                                      {meta.startDate && (
                                        <span>تاريخ البدء: <span className="font-bold text-navy-800">{meta.startDate}</span></span>
                                      )}
                                      {meta.endDate && (
                                        <span>تاريخ الانتهاء: <span className="font-bold text-navy-800">{meta.endDate}</span></span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>

                        {!isEditing ? (
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider border bg-white ${
                              step.status === 'مكتمل' || step.status === 'تم التأكيد'
                                ? 'text-emerald-700 border-emerald-300'
                                : step.status === 'قيد التنفيذ'
                                ? 'text-amber-700 border-amber-300'
                                : 'text-gray-400 border-gray-200'
                            }`}>
                              {step.status}
                            </span>
                            <button
                              onClick={() => handleStartEditStep(step)}
                              className="text-xs text-gold-600 hover:text-gold-700 font-bold flex items-center gap-0.5 bg-white border border-gray-200 px-2.5 py-1 rounded-xl shadow-sm hover:shadow"
                            >
                              <Edit2 size={10} /> تحديث
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveStep(step)}
                              className="text-xs text-emerald-600 hover:text-emerald-700 font-bold bg-white border border-emerald-200 px-2.5 py-1 rounded-xl shadow-sm"
                            >
                              حفظ
                            </button>
                            <button
                              onClick={() => setEditingStepId(null)}
                              className="text-xs text-red-500 hover:text-red-600 font-bold bg-white border border-gray-200 px-2.5 py-1 rounded-xl shadow-sm"
                            >
                              إلغاء
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Edit Step Form */}
                      {isEditing && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 mt-4 pt-3.5 border-t border-dashed border-gray-200 text-xs">
                          <div>
                            <label className="form-label text-[10px]">الحالة</label>
                            <select
                              value={stepForm.status}
                              onChange={(e) => setStepForm({ ...stepForm, status: e.target.value })}
                              className="form-input text-xs py-1.5 bg-white"
                            >
                              {statusOptions.map(st => <option key={st} value={st}>{st}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="form-label text-[10px]">الموظف المسؤول</label>
                            <select
                              value={stepForm.assigned_employee_id}
                              onChange={(e) => setStepForm({ ...stepForm, assigned_employee_id: e.target.value })}
                              className="form-input text-xs py-1.5 bg-white"
                            >
                              <option value="">اختر موظف</option>
                              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="form-label text-[10px]">تاريخ البدء</label>
                            <input
                              type="date"
                              value={stepForm.startDate}
                              onChange={(e) => setStepForm({ ...stepForm, startDate: e.target.value })}
                              className="form-input text-xs py-1.5 bg-white"
                            />
                          </div>
                          <div>
                            <label className="form-label text-[10px]">تاريخ الانتهاء</label>
                            <input
                              type="date"
                              value={stepForm.endDate}
                              onChange={(e) => setStepForm({ ...stepForm, endDate: e.target.value })}
                              className="form-input text-xs py-1.5 bg-white"
                            />
                          </div>
                          <div className="md:col-span-4">
                            <label className="form-label text-[10px]">ملاحظات وتوجيهات القسم</label>
                            <textarea
                              value={stepForm.notes}
                              onChange={(e) => setStepForm({ ...stepForm, notes: e.target.value })}
                              rows={2}
                              placeholder="أضف تفاصيل إتمام الخطوة أو المعوقات أو أي ملاحظات..."
                              className="form-input text-xs py-1.5 resize-none bg-white"
                            />
                          </div>
                        </div>
                      )}

                      {/* Step notes display */}
                      {!isEditing && (
                        (() => {
                          const meta = parseStepNotes(step.department_notes);
                          if (!meta.notes) return null;
                          return (
                            <div className="mt-2.5 bg-white/60 p-2.5 rounded-xl border border-gray-100 flex items-start gap-2">
                              <Info size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
                              <p className="text-[10px] text-gray-600 italic leading-relaxed">{meta.notes}</p>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Timeline Feed Card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-navy-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Clock size={16} className="text-gold-500" /> سجل الأحداث والتحركات
            </h3>

            <div className="relative border-r-2 border-gray-100 pr-4 mr-2 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
              {timeline.length === 0 ? (
                <p className="text-[10px] text-gray-400 text-center py-6 font-bold">لا يوجد تحركات مسجلة حالياً</p>
              ) : (
                timeline.map((event) => (
                  <div key={event.id} className="relative">
                    {/* Circle Dot indicator */}
                    <div className="absolute right-[-21px] top-1 w-2.5 h-2.5 rounded-full bg-gold-500 ring-4 ring-white" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-navy-900">{event.stage_label || event.stage}</span>
                        <span className="text-[9px] text-gray-400">
                          {event.created_at ? new Date(event.created_at).toLocaleString('ar-EG') : '—'}
                        </span>
                      </div>
                      {event.notes && (
                        <p className="text-[10px] text-gray-500 mt-1">{event.notes}</p>
                      )}
                      {(event.employee_name || event.employee_real_name) && (
                        <p className="text-[9px] text-gold-600 mt-0.5">بواسطة: {event.employee_real_name || event.employee_name}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
