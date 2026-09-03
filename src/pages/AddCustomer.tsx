import { useEffect, useRef, useState } from 'react';
import {
  Save, ArrowLeft, ArrowRight, Check, Upload, Eye, Trash2,
  FileText, Moon, Plane, MapPin, User, Phone, Mail, Package as PackageIcon, Briefcase,
  CheckCircle2, AlertCircle, Loader2, Hash, CreditCard, Calendar,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { compressImage } from '../lib/imageCompressor';
import { ensureVipAccountingArtifacts } from '../lib/vipAccounting';
import { grantVipAccess } from '../lib/vipAccess';
import type { Package, Employee, Page, ServiceType, CustomerStatus } from '../types';

type AssignableVipManager = Employee & { status?: string };

interface Props {
  onNavigate: (page: Page, id?: string) => void;
}

const steps = [
  { id: 0, label: 'البيانات الأساسية', icon: User },
  { id: 1, label: 'المستندات', icon: FileText },
  { id: 2, label: 'بيانات السفر', icon: Plane },
];

const serviceTypes: { value: ServiceType; label: string; icon: typeof Moon; prefix: string }[] = [
  { value: 'حج', label: 'حج', icon: Moon, prefix: 'HJ' },
  { value: 'عمرة', label: 'عمرة', icon: Plane, prefix: 'OM' },
  { value: 'سياحة داخلية', label: 'سياحة داخلية', icon: MapPin, prefix: 'TR' },
];

const customerStatuses: CustomerStatus[] = ['جديد', 'مهتم', 'متابعة', 'حجز', 'مغلق'];

const docTypes = [
  { id: 'جواز سفر', label: 'جواز السفر', required: true },
  { id: 'بطاقة رقم قومي', label: 'البطاقة الشخصية', required: true },
  { id: 'صورة شخصية', label: 'الصورة الشخصية', required: false },
  { id: 'تأشيرة', label: 'تأشيرة', required: false },
  { id: 'مستند إضافي', label: 'مستندات إضافية', required: false },
];

const governorates = [
  'القاهرة', 'الإسكندرية', 'الجيزة', 'الشرقية', 'الدقهلية', 'البحيرة',
  'المنوفية', 'القليوبية', 'الغربية', 'كفر الشيخ', 'المنصورة', 'دمياط',
  'بورسعيد', 'الإسماعيلية', 'السويس', 'جنوب سيناء', 'شمال سيناء',
  'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر',
  'أسوان', 'البحر الأحمر', 'الوادي الجديد', 'مطروح',
];

const sources = ['إعلان فيسبوك', 'إعلان جوجل', 'توصية صديق', 'موقع الشركة', 'إنستجرام', 'واتساب', 'زيارة', 'أخرى'];

interface DocUpload {
  type: string;
  file: File | null;
  uploaded: boolean;
  filePath?: string;
}

export default function AddCustomer({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [step, setStep] = useState(0);
  const [packages, setPackages] = useState<Package[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vipManagers, setVipManagers] = useState<AssignableVipManager[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const [isVip, setIsVip] = useState(false);
  const [vipForm, setVipForm] = useState({
    travel_city: '',
    departure_date: '',
    return_date: '',
    airline_preference: '',
    flight_class: 'Economy',
    hotel_makkah: '',
    hotel_madinah: '',
    hotel_stars: '',
    room_type_makkah: '',
    room_type_madinah: '',
    meal_plan: '',
    view_preference: '',
    transportation_method: '',
    train_preference: '',
    mazarat: '',
    additional_services: '',
    travelers_count: 1,
    special_notes: '',
    assigned_vip_manager: '',
  });

  const [form, setForm] = useState({
    name: '', phone: '', whatsapp: '', email: '',
    service_type: '' as ServiceType | '', requested_package_id: '',
    assigned_employee_id: '', status: 'جديد' as CustomerStatus,
    source: '', notes: '',
    passport_number: '', passport_issue_date: '', passport_expiry_date: '',
    nationality: '', birth_date: '', gender: '' as '' | 'ذكر' | 'أنثى',
    city: '', country: 'مصر',
    hotel_makkah: '', hotel_madinah: '',
    room_type_makkah: '', room_type_madinah: '',
    client_type: 'فردي' as 'فردي' | 'فوج',
    age_group: 'بالغ' as 'بالغ' | 'طفل' | 'رضيع',
  });

  const [docUploads, setDocUploads] = useState<Record<string, DocUpload>>(
    Object.fromEntries(docTypes.map((d) => [d.id, { type: d.id, file: null, uploaded: false }]))
  );
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    supabase.from('packages').select('*').eq('is_active', true).then(({ data }) => {
      if (data) setPackages(data as Package[]);
    });
    supabase.from('employees').select('*').eq('is_active', true).then(({ data }) => {
      if (data) setEmployees(data as Employee[]);
    });
    supabase
      .from('user_profiles')
      .select('id, name, email, phone, role, status, created_at')
      .eq('status', 'نشط')
      .order('name')
      .then(({ data }) => {
        if (data) {
          setVipManagers((data as AssignableVipManager[]).map((manager) => ({
            ...manager,
            clients_count: manager.clients_count || 0,
            bookings_count: manager.bookings_count || 0,
            target_percentage: manager.target_percentage || 0,
            is_active: true,
          })));
        }
      });
  }, []);

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  const calculateAgeGroup = (birthDateStr: string): 'بالغ' | 'طفل' | 'رضيع' => {
    if (!birthDateStr) return 'بالغ';
    const birthDate = new Date(birthDateStr);
    if (isNaN(birthDate.getTime())) return 'بالغ';
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 2) return 'رضيع';
    if (age <= 12) return 'طفل';
    return 'بالغ';
  };

  const handleFileSelect = (docType: string, file: File | null) => {
    setDocUploads({
      ...docUploads,
      [docType]: { ...docUploads[docType], file },
    });
  };

  const stepValid = (): boolean => {
    if (step === 0) return !!form.name.trim() && !!form.phone.trim() && !!form.service_type;
    if (step === 1) return true;
    return true;
  };

  const nextStep = () => {
    if (!stepValid()) { setError('يرجى ملء الحقول المطلوبة'); return; }
    setError('');
    setStep((s) => Math.min(s + 1, 2));
  };

  const prevStep = () => { setError(''); setStep((s) => Math.max(s - 1, 0)); };

  const previewFile = (doc: DocUpload) => {
    if (!doc.file) return;
    const url = URL.createObjectURL(doc.file);
    window.open(url, '_blank');
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.service_type) {
      setError('الاسم ورقم الهاتف ونوع الخدمة مطلوبة');
      setStep(0);
      return;
    }
    setLoading(true);
    setError('');

    try {
      const effectiveVipManagerId = isVip
        ? (vipForm.assigned_vip_manager || profile?.id || '')
        : '';
      const effectiveAssignedEmployeeId = form.assigned_employee_id;
      const assignedEmp = employees.find(e => e.id === effectiveAssignedEmployeeId);
      const isSalesAgent = assignedEmp?.role === 'مندوب مبيعات' || assignedEmp?.role === 'مدير المبيعات';

      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .insert({
          name: form.name,
          phone: form.phone,
          whatsapp: form.whatsapp || null,
          email: form.email || null,
          service_type: form.service_type || null,
          requested_package_id: isVip ? null : (form.requested_package_id || null),
          assigned_employee_id: effectiveAssignedEmployeeId || null,
          status: form.status,
          source: isSalesAgent 
            ? (form.source ? (form.source.startsWith('مندوب:') || form.source === 'مندوب مبيعات' ? form.source : 'مندوب: ' + form.source) : 'مندوب مبيعات')
            : (form.source || null),
          sales_agent_submitted: isSalesAgent ? false : true,
          notes: form.notes || null,
          passport_number: form.passport_number || null,
          passport_issue_date: form.passport_issue_date || null,
          passport_expiry_date: form.passport_expiry_date || null,
          nationality: form.nationality || null,
          birth_date: form.birth_date || null,
          gender: form.gender || null,
          city: form.city || null,
          country: form.country || null,
          hotel_makkah: form.hotel_makkah || null,
          hotel_madinah: form.hotel_madinah || null,
          room_type_makkah: form.room_type_makkah || null,
          room_type_madinah: form.room_type_madinah || null,
          is_vip: isVip,
          client_type: form.client_type,
          age_group: form.age_group,
        })
        .select('id, client_code')
        .single();

      if (custErr || !customer) throw new Error(custErr?.message || 'فشل إنشاء العميل');
      setCreatedId(customer.id);
      setCreatedCode(customer.client_code || null);

      const custId = customer.id;

      if (isVip) {
        const { error: vipErr } = await supabase
          .from('vip_requests')
          .insert({
            customer_id: custId,
            travel_city: vipForm.travel_city || null,
            departure_date: vipForm.departure_date || null,
            return_date: vipForm.return_date || null,
            airline_preference: vipForm.airline_preference || null,
            flight_class: vipForm.flight_class || null,
            hotel_makkah: vipForm.hotel_makkah || null,
            hotel_madinah: vipForm.hotel_madinah || null,
            hotel_stars: vipForm.hotel_stars || null,
            room_type_makkah: vipForm.room_type_makkah || null,
            room_type_madinah: vipForm.room_type_madinah || null,
            meal_plan: vipForm.meal_plan || null,
            view_preference: vipForm.view_preference || null,
            transportation_method: vipForm.transportation_method || null,
            train_preference: vipForm.train_preference || null,
            mazarat: vipForm.mazarat || null,
            additional_services: vipForm.additional_services || null,
            travelers_count: Number(vipForm.travelers_count) || 1,
            special_notes: vipForm.special_notes || null,
            assigned_vip_manager: effectiveVipManagerId || null,
          });

        if (vipErr) {
          console.error('Error inserting VIP request:', vipErr);
          throw new Error('فشل حفظ تفاصيل طلب VIP: ' + vipErr.message);
        }

        const { data: vipTrip, error: vipTripErr } = await supabase
          .from('vip_trips')
          .insert({
            name: `طلب VIP - ${form.name}`,
            assigned_employee_id: effectiveVipManagerId || null,
            destination: vipForm.travel_city || null,
            departure_date: vipForm.departure_date || null,
            return_date: vipForm.return_date || null,
          })
          .select('id')
          .single();

        if (vipTripErr) {
          console.error('Error creating VIP trip:', vipTripErr);
          throw new Error('فشل إنشاء رحلة VIP وربطها بالموظف: ' + vipTripErr.message);
        }

        if (vipTrip?.id) {
          await grantVipAccess(effectiveVipManagerId || null);

          await supabase
            .from('customers')
            .update({ vip_trip_id: vipTrip.id })
            .eq('id', custId);

          await supabase.from('vip_trip_logs').insert({
            trip_id: vipTrip.id,
            user_id: profile?.id,
            action: 'إنشاء طلب VIP من العميل',
            details: `تم إنشاء وربط عميل VIP: ${form.name}`,
          });
        }

        await ensureVipAccountingArtifacts({
          customerId: custId,
          customerName: form.name,
          assignedEmployeeId: effectiveVipManagerId || null,
          serviceType: form.service_type,
          tripName: vipForm.travel_city || 'طلب VIP خاص',
          destination: vipForm.travel_city || null,
          departureDate: vipForm.departure_date || null,
          returnDate: vipForm.return_date || null,
          travelersCount: vipForm.travelers_count,
          notes: vipForm.special_notes || form.notes || null,
        });
      }

      const docTypeKey: Record<string, string> = {
        'جواز سفر': 'passport',
        'جواز السفر': 'passport',
        'بطاقة رقم قومي': 'national_id',
        'البطاقة الشخصية': 'national_id',
        'صورة شخصية': 'personal_photo',
        'تأشيرة': 'visa',
        'مستند إضافي': 'extra_doc',
      };
      const uploadPromises = docTypes.map(async (d) => {
        const doc = docUploads[d.id];
        if (!doc.file) return;
        const compressedFile = await compressImage(doc.file);
        const ext = (compressedFile.name.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '');
        const safeDocType = docTypeKey[d.id] || 'document';
        const filePath = `${custId}/${Date.now()}_${safeDocType}.${ext}`;
        const { error: upErr } = await supabase.storage.from('documents').upload(filePath, compressedFile);
        if (upErr) {
          console.error(`Error uploading document ${d.id}:`, upErr);
          return;
        }
        await supabase.from('documents').insert({
          customer_id: custId,
          uploaded_by: profile?.id || null,
          doc_type: d.id,
          file_path: filePath,
          file_name: compressedFile.name,
          file_size: compressedFile.size,
          status: 'مرفوع',
        });
      });
      
      // Fire and forget uploads in background to avoid blocking the UI
      Promise.all(uploadPromises).catch(err => {
        console.error('Error during background upload:', err);
      });

      setTimeout(() => onNavigate('customer-details', custId), 200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  if (createdId) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6 animate-fadeIn">
          <CheckCircle2 size={48} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-black text-navy-900 mb-2">تم إضافة العميل بنجاح!</h2>
        {createdCode && (
          <div className="inline-flex items-center gap-2 bg-navy-50 border border-navy-200 rounded-xl px-4 py-2 mt-3 mb-4">
            <Hash size={16} className="text-gold-600" />
            <span className="font-mono font-black text-navy-800 text-lg">{createdCode}</span>
          </div>
        )}
        <p className="text-gray-500 text-sm">جارٍ الانتقال لصفحة تفاصيل العميل...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => onNavigate('customers')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="section-title">إضافة عميل جديد</h2>
          <p className="section-subtitle">نموذج متعدد المراحل لحفظ بيانات العميل والمستندات</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    done ? 'bg-emerald-500 text-white' : active ? 'bg-gradient-gold text-navy-900 shadow-md' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {done ? <Check size={18} /> : <Icon size={18} />}
                  </div>
                  <div className="hidden sm:block">
                    <p className={`text-xs font-bold ${active || done ? 'text-navy-900' : 'text-gray-400'}`}>{s.label}</p>
                    <p className="text-[10px] text-gray-400">المرحلة {i + 1}</p>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-3 rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-gray-100'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3 text-sm font-medium flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Step 0: Basic Data */}
      {step === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 animate-fadeIn">
          <h3 className="text-sm font-bold text-navy-800 mb-2 pb-3 border-b border-gray-100 flex items-center gap-2">
            <div className="w-1 h-5 bg-gold-500 rounded-full" /> البيانات الأساسية
          </h3>

          {/* Client Code preview */}
          <div className="bg-navy-50 rounded-xl p-4 flex items-center gap-3 border border-navy-100">
            <div className="w-10 h-10 rounded-lg bg-gradient-navy flex items-center justify-center text-gold-400">
              <Hash size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500">كود العميل (تلقائي)</p>
              <p className="font-mono font-black text-navy-800">
                {form.service_type
                  ? `${serviceTypes.find((s) => s.value === form.service_type)?.prefix}-???`
                  : 'اختر نوع الخدمة لعرض الكود'}
              </p>
            </div>
            <span className="mr-auto text-xs text-gray-400">يتم توليده تلقائياً عند الحفظ</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">الاسم بالكامل <span className="text-red-500">*</span></label>
              <div className="relative">
                <User size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                <input required value={form.name} onChange={(e) => update('name', e.target.value)} className="form-input pr-9" placeholder="الاسم الكامل" />
              </div>
            </div>
            <div>
              <label className="form-label">رقم الهاتف <span className="text-red-500">*</span></label>
              <div className="relative">
                <Phone size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                <input required value={form.phone} onChange={(e) => update('phone', e.target.value)} className="form-input pr-9" placeholder="01xxxxxxxxx" dir="ltr" />
              </div>
            </div>
            <div>
              <label className="form-label">رقم واتساب</label>
              <div className="relative">
                <Phone size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                <input value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} className="form-input pr-9" placeholder="01xxxxxxxxx" dir="ltr" />
              </div>
            </div>
            <div>
              <label className="form-label">البريد الإلكتروني</label>
              <div className="relative">
                <Mail size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="form-input pr-9" placeholder="example@email.com" dir="ltr" />
              </div>
            </div>
            <div>
              <label className="form-label">نوع العميل</label>
              <select value={form.client_type} onChange={(e) => update('client_type', e.target.value)} className="form-input">
                <option value="فردي">عميل فردي (Individual)</option>
                <option value="فوج">عميل فوج (Group)</option>
              </select>
            </div>
            <div>
              <label className="form-label">الفئة العمرية</label>
              <select value={form.age_group} onChange={(e) => update('age_group', e.target.value as any)} className="form-input">
                <option value="بالغ">بالغ (Adult)</option>
                <option value="طفل">طفل (Child)</option>
                <option value="رضيع">رضيع (Infant)</option>
              </select>
            </div>
          </div>

          <h4 className="text-sm font-bold text-navy-800 pt-2">نوع الخدمة <span className="text-red-500">*</span></h4>
          <div className="grid grid-cols-3 gap-3">
            {serviceTypes.map((s) => {
              const Icon = s.icon;
              const active = form.service_type === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => update('service_type', s.value)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                    active ? 'border-gold-500 bg-gold-50 text-navy-900' : 'border-gray-100 text-gray-500 hover:border-navy-200'
                  }`}
                >
                  <Icon size={22} />
                  <span className="text-xs font-bold">{s.label}</span>
                  <span className="text-[10px] font-mono text-gold-600">{s.prefix}-XXXX</span>
                </button>
              );
            })}
          </div>

          <h4 className="text-sm font-bold text-navy-800 pt-2">فئة العميل</h4>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsVip(false)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${
                !isVip ? 'border-gold-500 bg-gold-50 text-navy-900 shadow-sm' : 'border-gray-100 text-gray-500 hover:border-navy-200'
              }`}
            >
              <span className="text-xs font-bold">عميل باقات عادية (Standard)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsVip(true)}
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${
                isVip ? 'border-gold-500 bg-gold-50 text-navy-900 shadow-sm' : 'border-gray-100 text-gray-500 hover:border-navy-200'
              }`}
            >
              <span className="text-xs font-bold text-gold-600">👑 عميل VIP (مسار مستقل)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {!isVip ? (
              <div>
                <label className="form-label">الباقة</label>
                <div className="relative">
                  <PackageIcon size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                  <select value={form.requested_package_id} onChange={(e) => update('requested_package_id', e.target.value)} className="form-input pr-9">
                    <option value="">اختر الباقة</option>
                    {packages
                      .filter((p) => !form.service_type || p.type === form.service_type)
                      .map((p) => {
                        let finalPrice = p.price;
                        if (form.age_group === 'طفل' && p.price_child > 0) {
                          finalPrice = p.price_child;
                        } else if (form.age_group === 'رضيع' && p.price_infant > 0) {
                          finalPrice = p.price_infant;
                        }
                        return (
                          <option key={p.id} value={p.id}>
                            {p.name} — {finalPrice.toLocaleString('ar-EG')} ج.م
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="form-label">المشرف المسؤول عن الملف VIP</label>
                <div className="relative">
                  <Briefcase size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                  <select value={vipForm.assigned_vip_manager} onChange={(e) => setVipForm({...vipForm, assigned_vip_manager: e.target.value})} className="form-input pr-9">
                    <option value="">اختر المشرف المسؤول</option>
                    {vipManagers.map((emp) => <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>)}
                  </select>
                </div>
              </div>
            )}
            <div>
              <label className="form-label">الموظف المسؤول (البيعات)</label>
              <div className="relative">
                <Briefcase size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                <select value={form.assigned_employee_id} onChange={(e) => update('assigned_employee_id', e.target.value)} className="form-input pr-9">
                  <option value="">اختر الموظف</option>
                  {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">حالة العميل</label>
              <select value={form.status} onChange={(e) => update('status', e.target.value as CustomerStatus)} className="form-input">
                {customerStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">مصدر العميل</label>
              <select value={form.source} onChange={(e) => update('source', e.target.value)} className="form-input">
                <option value="">اختر المصدر</option>
                {sources.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">ملاحظات</label>
            <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} className="form-input resize-none" placeholder="أي ملاحظات إضافية..." />
          </div>
        </div>
      )}

      {/* Step 1: Documents */}
      {step === 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5 animate-fadeIn">
          <h3 className="text-sm font-bold text-navy-800 mb-2 pb-3 border-b border-gray-100 flex items-center gap-2">
            <div className="w-1 h-5 bg-gold-500 rounded-full" /> رفع المستندات
          </h3>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              جواز السفر والبطاقة الشخصية <span className="font-bold">مطلوبان</span> — بدونهما سيكون ملف العميل «ناقص مستندات»
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docTypes.map((d) => {
              const doc = docUploads[d.id];
              return (
                <div key={d.id} className={`rounded-2xl border-2 p-4 transition-all ${doc.file ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className={doc.file ? 'text-emerald-600' : 'text-gray-400'} />
                      <span className="text-sm font-bold text-navy-900">{d.label}</span>
                      {d.required && <span className="text-[10px] text-red-500 font-bold">مطلوب</span>}
                    </div>
                    {doc.file && <CheckCircle2 size={16} className="text-emerald-500" />}
                  </div>

                  {!doc.file ? (
                    <button
                      type="button"
                      onClick={() => fileRefs.current[d.id]?.click()}
                      className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center gap-2 text-gray-400 hover:border-gold-400 hover:text-gold-600 transition-all"
                    >
                      <Upload size={20} />
                      <span className="text-xs font-semibold">اضغط لرفع الملف</span>
                      <span className="text-[10px]">صور أو PDF</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-100">
                        <FileText size={14} className="text-navy-600 flex-shrink-0" />
                        <span className="text-xs text-gray-700 truncate flex-1">{doc.file.name}</span>
                        <span className="text-[10px] text-gray-400">{(doc.file.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => previewFile(doc)} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-600" title="عرض"><Eye size={14} /></button>
                        <button type="button" onClick={() => handleFileSelect(d.id, null)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="حذف"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )}
                  <input
                    ref={(el) => { fileRefs.current[d.id] = el; }}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleFileSelect(d.id, e.target.files?.[0] || null)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Travel Data */}
      {step === 2 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 animate-fadeIn">
          <h3 className="text-sm font-bold text-navy-800 mb-2 pb-3 border-b border-gray-100 flex items-center gap-2">
            <div className="w-1 h-5 bg-gold-500 rounded-full" /> بيانات السفر
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">رقم جواز السفر</label>
              <div className="relative">
                <CreditCard size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                <input value={form.passport_number} onChange={(e) => update('passport_number', e.target.value)} className="form-input pr-9" placeholder="A12345678" dir="ltr" />
              </div>
            </div>
            <div>
              <label className="form-label">الجنسية</label>
              <input value={form.nationality} onChange={(e) => update('nationality', e.target.value)} className="form-input" placeholder="مصري" />
            </div>
            <div>
              <label className="form-label">تاريخ إصدار الجواز</label>
              <div className="relative">
                <Calendar size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                <input type="date" value={form.passport_issue_date} onChange={(e) => update('passport_issue_date', e.target.value)} className="form-input pr-9" dir="ltr" />
              </div>
            </div>
            <div>
              <label className="form-label">تاريخ انتهاء الجواز</label>
              <div className="relative">
                <Calendar size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                <input type="date" value={form.passport_expiry_date} onChange={(e) => update('passport_expiry_date', e.target.value)} className="form-input pr-9" dir="ltr" />
              </div>
            </div>
            <div>
              <label className="form-label">تاريخ الميلاد</label>
              <div className="relative">
                <Calendar size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                <input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => {
                    const dateVal = e.target.value;
                    const calculated = calculateAgeGroup(dateVal);
                    setForm(prev => ({ ...prev, birth_date: dateVal, age_group: calculated }));
                  }}
                  className="form-input pr-9"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="form-label">الجنس</label>
              <div className="grid grid-cols-2 gap-3">
                {(['ذكر', 'أنثى'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => update('gender', g)}
                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${form.gender === g ? 'border-gold-500 bg-gold-50 text-navy-900' : 'border-gray-100 text-gray-500 hover:border-navy-200'}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">المدينة</label>
              <select value={form.city} onChange={(e) => update('city', e.target.value)} className="form-input">
                <option value="">اختر المدينة</option>
                {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">الدولة</label>
              <input value={form.country} onChange={(e) => update('country', e.target.value)} className="form-input" placeholder="مصر" />
            </div>
            {(form.service_type === 'حج' || form.service_type === 'عمرة') && (
              <>
                <div>
                  <label className="form-label">فندق مكة المفضل</label>
                  <input value={form.hotel_makkah} onChange={(e) => update('hotel_makkah', e.target.value)} className="form-input" placeholder="مثال: سويس أوتيل المقام" />
                </div>
                <div>
                  <label className="form-label">نوع غرفة مكة</label>
                  <input value={form.room_type_makkah} onChange={(e) => update('room_type_makkah', e.target.value)} className="form-input" placeholder="ثنائية، ثلاثية، إلخ" />
                </div>
                <div>
                  <label className="form-label">فندق المدينة المفضل</label>
                  <input value={form.hotel_madinah} onChange={(e) => update('hotel_madinah', e.target.value)} className="form-input" placeholder="مثال: بولمان زمزم" />
                </div>
                <div>
                  <label className="form-label">نوع غرفة المدينة</label>
                  <input value={form.room_type_madinah} onChange={(e) => update('room_type_madinah', e.target.value)} className="form-input" placeholder="ثنائية، ثلاثية، إلخ" />
                </div>
              </>
            )}
            {form.service_type === 'سياحة داخلية' && (
              <>
                <div>
                  <label className="form-label">الفندق المفضل (اختياري)</label>
                  <input value={form.hotel_makkah} onChange={(e) => update('hotel_makkah', e.target.value)} className="form-input" placeholder="مثال: فندق هيلتون دهب" />
                </div>
                <div>
                  <label className="form-label">نوع الغرفة (اختياري)</label>
                  <input value={form.room_type_makkah} onChange={(e) => update('room_type_makkah', e.target.value)} className="form-input" placeholder="ثنائية، ثلاثية، إلخ" />
                </div>
              </>
            )}
          </div>

          {isVip && (
            <div className="pt-6 border-t border-gray-100 space-y-6">
              <h3 className="text-sm font-bold text-navy-800 mb-2 flex items-center gap-2">
                <div className="w-1 h-5 bg-gold-500 rounded-full" /> تفاصيل طلبات VIP الخاصة
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="form-label">مدينة السفر المطلوبة</label>
                  <input value={vipForm.travel_city} onChange={(e) => setVipForm({...vipForm, travel_city: e.target.value})} className="form-input" placeholder="مكة، المدينة، دبي، إلخ" />
                </div>
                <div>
                  <label className="form-label">تاريخ السفر المقترح</label>
                  <input type="date" value={vipForm.departure_date} onChange={(e) => setVipForm({...vipForm, departure_date: e.target.value})} className="form-input" />
                </div>
                <div>
                  <label className="form-label">تاريخ العودة المقترح</label>
                  <input type="date" value={vipForm.return_date} onChange={(e) => setVipForm({...vipForm, return_date: e.target.value})} className="form-input" />
                </div>
                <div>
                  <label className="form-label">شركة الطيران المفضلة</label>
                  <input value={vipForm.airline_preference} onChange={(e) => setVipForm({...vipForm, airline_preference: e.target.value})} className="form-input" placeholder="مصر للطيران، السعودية، إلخ" />
                </div>
                <div>
                  <label className="form-label">درجة السفر</label>
                  <select value={vipForm.flight_class} onChange={(e) => setVipForm({...vipForm, flight_class: e.target.value})} className="form-input">
                    <option value="Economy">درجة اقتصادية (Economy)</option>
                    <option value="Business">درجة رجال أعمال (Business)</option>
                    <option value="First Class">درجة أولى (First Class)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">عدد المسافرين / المرافقين</label>
                  <input type="number" min={1} value={vipForm.travelers_count} onChange={(e) => setVipForm({...vipForm, travelers_count: parseInt(e.target.value) || 1})} className="form-input" />
                </div>
                <div>
                  <label className="form-label">فندق مكة</label>
                  <input value={vipForm.hotel_makkah} onChange={(e) => setVipForm({...vipForm, hotel_makkah: e.target.value})} className="form-input" placeholder="دار التوحيد، سويس أوتيل، إلخ" />
                </div>
                <div>
                  <label className="form-label">نوع غرفة مكة</label>
                  <input value={vipForm.room_type_makkah} onChange={(e) => setVipForm({...vipForm, room_type_makkah: e.target.value})} className="form-input" placeholder="مفردة، ثنائية مطلة، إلخ" />
                </div>
                <div>
                  <label className="form-label">فندق المدينة</label>
                  <input value={vipForm.hotel_madinah} onChange={(e) => setVipForm({...vipForm, hotel_madinah: e.target.value})} className="form-input" placeholder="دلة طيبة، دار الإيمان، إلخ" />
                </div>
                <div>
                  <label className="form-label">نوع غرفة المدينة</label>
                  <input value={vipForm.room_type_madinah} onChange={(e) => setVipForm({...vipForm, room_type_madinah: e.target.value})} className="form-input" placeholder="مفردة، ثنائية مطلة، إلخ" />
                </div>
                <div>
                  <label className="form-label">تصنيف الفنادق (نجوم)</label>
                  <input value={vipForm.hotel_stars} onChange={(e) => setVipForm({...vipForm, hotel_stars: e.target.value})} className="form-input" placeholder="5 نجوم، 4 نجوم، إلخ" />
                </div>
                <div>
                  <label className="form-label">نظام الوجبات</label>
                  <input value={vipForm.meal_plan} onChange={(e) => setVipForm({...vipForm, meal_plan: e.target.value})} className="form-input" placeholder="فطور فقط، فطور وعشاء، إقامة كاملة" />
                </div>
                <div>
                  <label className="form-label">الإطلالة المفضلة</label>
                  <input value={vipForm.view_preference} onChange={(e) => setVipForm({...vipForm, view_preference: e.target.value})} className="form-input" placeholder="مطل على الكعبة، مطل على الحرم، إلخ" />
                </div>
                <div>
                  <label className="form-label">وسيلة الانتقالات المفضلة</label>
                  <input value={vipForm.transportation_method} onChange={(e) => setVipForm({...vipForm, transportation_method: e.target.value})} className="form-input" placeholder="سيارة GMC خاصة، حافلة VIP، إلخ" />
                </div>
                <div>
                  <label className="form-label">تفضيل القطار السريع</label>
                  <input value={vipForm.train_preference} onChange={(e) => setVipForm({...vipForm, train_preference: e.target.value})} className="form-input" placeholder="درجة أولى قطار الحرمين، إلخ" />
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">المزارات السياحية والجولات المطلوبة</label>
                  <input value={vipForm.mazarat} onChange={(e) => setVipForm({...vipForm, mazarat: e.target.value})} className="form-input" placeholder="مزارات المدينة المنورة، مزارات مكة المكرمة، إلخ" />
                </div>
                <div className="md:col-span-3">
                  <label className="form-label">خدمات إضافية مطلوبة</label>
                  <input value={vipForm.additional_services} onChange={(e) => setVipForm({...vipForm, additional_services: e.target.value})} className="form-input" placeholder="كرسي متحرك، مرافق خاص، تأشيرة خاصة، إلخ" />
                </div>
                <div className="md:col-span-3">
                  <label className="form-label">طلبات وملاحظات خاصة أخرى</label>
                  <textarea value={vipForm.special_notes} onChange={(e) => setVipForm({...vipForm, special_notes: e.target.value})} rows={3} className="form-input resize-none" placeholder="أي تفاصيل أو شروط خاصة أخرى للرحلة..." />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={prevStep}
          disabled={step === 0}
          className="btn-outline disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowRight size={16} /> السابق
        </button>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          المرحلة {step + 1} من {steps.length}
        </div>

        {step < 2 ? (
          <button type="button" onClick={nextStep} className="btn-gold">
            التالي <ArrowLeft size={16} />
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={loading} className="btn-gold">
            {loading ? (
              <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> جارٍ الحفظ...</span>
            ) : (
              <><Save size={16} /> حفظ العميل</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
