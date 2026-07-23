import { useEffect, useRef, useState } from 'react';
import {
  Save, ArrowLeft, ArrowRight, Check, Upload, Download, Eye, Trash2,
  FileText, Moon, Plane, MapPin, User, Phone, Mail, Package as PackageIcon, Briefcase,
  CheckCircle2, AlertCircle, Loader2, X, Hash, CreditCard, Calendar,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Package, Employee, Page, ServiceType, CustomerStatus } from '../types';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '', phone: '', whatsapp: '', email: '',
    service_type: '' as ServiceType | '', requested_package_id: '',
    assigned_employee_id: '', status: 'جديد' as CustomerStatus,
    source: '', notes: '',
    passport_number: '', passport_issue_date: '', passport_expiry_date: '',
    nationality: '', birth_date: '', gender: '' as '' | 'ذكر' | 'أنثى',
    city: '', country: 'مصر',
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
  }, []);

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

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
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .insert({
          name: form.name,
          phone: form.phone,
          whatsapp: form.whatsapp || null,
          email: form.email || null,
          service_type: form.service_type || null,
          requested_package_id: form.requested_package_id || null,
          assigned_employee_id: form.assigned_employee_id || null,
          status: form.status,
          source: form.source || null,
          notes: form.notes || null,
          passport_number: form.passport_number || null,
          passport_issue_date: form.passport_issue_date || null,
          passport_expiry_date: form.passport_expiry_date || null,
          nationality: form.nationality || null,
          birth_date: form.birth_date || null,
          gender: form.gender || null,
          city: form.city || null,
          country: form.country || null,
        })
        .select('id, client_code')
        .single();

      if (custErr || !customer) throw new Error(custErr?.message || 'فشل إنشاء العميل');
      setCreatedId(customer.id);
      setCreatedCode(customer.client_code || null);

      const custId = customer.id;

      const uploadPromises = docTypes.map(async (d) => {
        const doc = docUploads[d.id];
        if (!doc.file) return;
        const ext = doc.file.name.split('.').pop();
        const filePath = `${custId}/${Date.now()}_${d.id}.${ext}`;
        const { error: upErr } = await supabase.storage.from('documents').upload(filePath, doc.file);
        if (upErr) return;
        await supabase.from('documents').insert({
          customer_id: custId,
          uploaded_by: profile?.id || null,
          doc_type: d.id,
          file_path: filePath,
          file_name: doc.file.name,
          file_size: doc.file.size,
          status: 'مرفوع',
        });
      });
      await Promise.all(uploadPromises);

      setTimeout(() => onNavigate('customer-details', custId), 2000);
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">الباقة</label>
              <div className="relative">
                <PackageIcon size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                <select value={form.requested_package_id} onChange={(e) => update('requested_package_id', e.target.value)} className="form-input pr-9">
                  <option value="">اختر الباقة</option>
                  {packages
                    .filter((p) => !form.service_type || p.type === form.service_type)
                    .map((p) => <option key={p.id} value={p.id}>{p.name} — {p.price.toLocaleString('ar-EG')} ج.م</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">الموظف المسؤول</label>
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
                <input type="date" value={form.birth_date} onChange={(e) => update('birth_date', e.target.value)} className="form-input pr-9" dir="ltr" />
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
          </div>
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
