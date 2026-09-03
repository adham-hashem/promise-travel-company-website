import { useEffect, useRef, useState } from 'react';
import {
  Loader2, CheckCircle2, Moon, Plane, MapPin, Hotel as HotelIcon,
  User, Phone, Mail, FileText, Send, Calendar, Users, Upload,
  Eye, Trash2, Globe, Hash, BedDouble, Baby,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../lib/imageCompressor';
import type { Package, Hotel, InternalTrip } from '../../types';

interface Props {
  preset?: { packageId?: string; type?: string };
  onDone: () => void;
}

const serviceTypes = [
  { value: 'حج', label: 'حج', icon: Moon },
  { value: 'عمرة', label: 'عمرة', icon: Plane },
  { value: 'داخلي', label: 'سياحة داخلية', icon: MapPin },
  { value: 'فندق', label: 'حجز فندق', icon: HotelIcon },
];

const optionalDocs = [
  { id: 'جواز سفر', label: 'جواز السفر' },
  { id: 'بطاقة رقم قومي', label: 'البطاقة الشخصية' },
  { id: 'صورة شخصية', label: 'الصورة الشخصية' },
];

export default function BookingPage({ preset, onDone }: Props) {
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [trips, setTrips] = useState<InternalTrip[]>([]);
  const [form, setForm] = useState({
    name: '', phone: '', whatsapp: '', email: '',
    service_type: preset?.type || '',
    package_id: preset?.packageId || '',
    hotel_id: '',
    travelers: '1',
    room_type: '',
    adult_count: '1',
    child_count: '0',
    infant_count: '0',
    travel_date: '',
    notes: '',
  });
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({
    'جواز سفر': null, 'بطاقة رقم قومي': null, 'صورة شخصية': null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    supabase.from('hotels').select('*').eq('status', 'نشط').order('stars', { ascending: false }).then(({ data }) => {
      if (data) setHotels(data as Hotel[]);
    });
    supabase.from('internal_trips').select('*').eq('status', 'متاحة').order('start_date', { ascending: true }).then(({ data }) => {
      if (data) setTrips(data as InternalTrip[]);
    });
  }, []);

  const loadOptions = async (type: string, packageId = '') => {
    setPackages(null);
    setForm((f) => ({ ...f, package_id: packageId, hotel_id: '', room_type: '', adult_count: '1', child_count: '0', infant_count: '0' }));
    if (!type) { setPackages([]); return; }
    if (type === 'داخلي') {
      setPackages([]);
      return;
    }
    if (type === 'فندق') {
      setPackages([]);
      return;
    }
    const { data } = await supabase.from('packages').select('*').eq('is_active', true).eq('type', type).order('created_at', { ascending: false });
    setPackages((data as Package[]) || []);
  };

  const setService = (type: string) => {
    setForm({ ...form, service_type: type });
    loadOptions(type);
  };

  useEffect(() => {
    if (preset?.type) loadOptions(preset.type, preset.packageId || '');
  }, [preset?.type, preset?.packageId]);

  const selectedPackage = packages?.find((p) => p.id === form.package_id) || null;
  const toCount = (value: string) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };
  const hasPrice = (value: unknown) => Number.isFinite(Number(value)) && Number(value) > 0;
  const roomOptions = selectedPackage ? [
    { value: 'ثنائية', label: 'غرفة ثنائية', price: selectedPackage.price_double },
    { value: 'ثلاثية', label: 'غرفة ثلاثية', price: selectedPackage.price_triple },
    { value: 'رباعية', label: 'غرفة رباعية', price: selectedPackage.price_quad },
  ].filter((option) => hasPrice(option.price)) : [];
  const adultPrice = selectedPackage
    ? Number(roomOptions.find((option) => option.value === form.room_type)?.price || selectedPackage.price || 0)
    : 0;
  const adultCount = toCount(form.adult_count);
  const childCount = toCount(form.child_count);
  const infantCount = toCount(form.infant_count);
  const packageTravelerCount = adultCount + childCount + infantCount;
  const packageTotal = selectedPackage
    ? (adultCount * adultPrice)
      + (childCount * (hasPrice(selectedPackage.price_child) ? Number(selectedPackage.price_child) : 0))
      + (infantCount * (hasPrice(selectedPackage.price_infant) ? Number(selectedPackage.price_infant) : 0))
    : 0;

  const previewFile = (docType: string) => {
    const file = docFiles[docType];
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, '_blank');
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.name.trim()) { setError('الاسم مطلوب'); return; }
    if (!form.phone.trim()) { setError('رقم الهاتف مطلوب'); return; }
    if (!form.service_type) { setError('اختر نوع الخدمة'); return; }
    const isPackageBooking = form.service_type === 'حج' || form.service_type === 'عمرة';
    if (isPackageBooking && form.package_id) {
      if (!selectedPackage) { setError('يرجى اختيار باقة صحيحة'); return; }
      if (packageTravelerCount < 1) { setError('حدد عدد المسافرين في الباقة'); return; }
      if (roomOptions.length > 0 && !form.room_type) { setError('اختر نوع الغرفة المطلوبة'); return; }
      if (adultCount > 0 && adultPrice <= 0) { setError('لا يوجد سعر بالغ متاح لهذه الباقة'); return; }
      if (childCount > 0 && !hasPrice(selectedPackage.price_child)) { setError('سعر الطفل غير متاح لهذه الباقة'); return; }
      if (infantCount > 0 && !hasPrice(selectedPackage.price_infant)) { setError('سعر الرضيع غير متاح لهذه الباقة'); return; }
    }
    setSubmitting(true);

    try {
      const serviceTypeMap: Record<string, string> = {
        'حج': 'حج', 'عمرة': 'عمرة', 'داخلي': 'رحلة داخلية', 'فندق': 'فندق',
      };
      const serviceType = serviceTypeMap[form.service_type] || 'عمرة';
      const travelersTotal = isPackageBooking && form.package_id ? packageTravelerCount : Number(form.travelers) || 1;
      const selectedHotel = form.hotel_id ? hotels.find((h) => h.id === form.hotel_id) : null;
      const selectedTrip = form.service_type === 'داخلي' && form.package_id ? trips.find((t) => t.id === form.package_id) : null;
      const packagePricingNotes = isPackageBooking && form.package_id
        ? `الغرفة: ${form.room_type || 'غير محددة'} — بالغين: ${adultCount} — أطفال: ${childCount} — رضع: ${infantCount} — الإجمالي التقريبي: ${packageTotal.toLocaleString('ar-EG')} ج.م`
        : '';
      const bookingNotes = [
        'استعلام حجز من واجهة الزائر - يبدأ من قسم الاستعلامات قبل التشغيل',
        `نوع الخدمة: ${serviceType}`,
        `عدد المسافرين: ${travelersTotal}`,
        form.whatsapp ? `واتساب: ${form.whatsapp}` : '',
        form.email ? `البريد: ${form.email}` : '',
        form.travel_date ? `تاريخ السفر المطلوب: ${form.travel_date}` : '',
        selectedPackage ? `الباقة: ${selectedPackage.name}` : '',
        selectedHotel ? `الفندق المطلوب: ${selectedHotel.name}` : '',
        selectedTrip ? `الرحلة الداخلية: ${selectedTrip.name}` : '',
        packagePricingNotes,
        form.notes ? `ملاحظات العميل: ${form.notes}` : '',
      ].filter(Boolean).join(' — ');

      const inquiryNumber = `INQ-${Date.now().toString().slice(-6)}`;
      const { data: inquiry, error: inquiryErr } = await supabase
        .from('inquiries')
        .insert({
          inquiry_number: inquiryNumber,
          customer_name: form.name,
          phone: form.phone,
          service_type: serviceType as never,
          source: 'الموقع الإلكتروني',
          status: 'جديد',
          notes: bookingNotes,
        })
        .select('id, inquiry_number')
        .single();
      if (inquiryErr) throw new Error(inquiryErr.message);
      if (!inquiry) throw new Error('تعذر إنشاء الاستعلام');

      // Upload optional documents against the inquiry so admins can review them before conversion.
      for (const docType of optionalDocs) {
        const file = docFiles[docType.id];
        if (!file) continue;
        const ext = file.name.split('.').pop();
        const filePath = `website-inquiries/${inquiry.id}/${Date.now()}_${docType.id}.${ext}`;
        const uploadFile = file.type.startsWith('image/') ? await compressImage(file) : file;
        const { error: upErr } = await supabase.storage.from('documents').upload(filePath, uploadFile);
        if (upErr) continue;
        await supabase.from('documents').insert({
          inquiry_id: inquiry.id,
          doc_type: docType.id,
          file_path: filePath,
          file_name: file.name,
          file_size: uploadFile.size,
          status: 'مرفوع',
        });
      }

      setCreatedCode(inquiry.inquiry_number);
      setDone(true);
      setTimeout(() => { onDone(); }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-20">
        <div className="max-w-md text-center">
          <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6 animate-fadeIn">
            <CheckCircle2 size={48} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-emerald-950 mb-3">تم استلام طلبك بنجاح!</h2>
          <p className="text-gray-500 mb-2">شكراً لك. سيتواصل معك فريق المبيعات لدينا في أقرب وقت لتأكيد الحجز.</p>
          {createdCode && (
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 mt-3 mb-4">
              <Hash size={16} className="text-gold-600" />
              <span className="font-mono font-black text-emerald-800">رقم الطلب: {createdCode}</span>
            </div>
          )}
          <p className="text-gold-600 font-semibold text-sm">جارٍ تحويلك للصفحة الرئيسية...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[35vh] min-h-[280px] overflow-hidden">
        <img src="https://images.pexels.com/photos/1620168/pexels-photo-1620168.jpeg?auto=compress&cs=tinysrgb&w=1920" alt="احجز الآن" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950 via-emerald-900/70 to-emerald-900/30" />
        <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-end pb-12 text-white">
          <span className="inline-flex w-fit items-center gap-2 bg-gold-500/20 backdrop-blur border border-gold-400/30 text-gold-300 px-4 py-1.5 rounded-full text-xs font-semibold mb-3">
            <Globe size={12} /> حجز من الموقع
          </span>
          <h1 className="text-3xl md:text-5xl font-black mb-2">احجز رحلتك</h1>
          <p className="text-white/80 text-lg">ابدأ رحلتك المباركة الآن — املأ النموذج وسنتواصل معك فوراً</p>
        </div>
      </section>

      {/* Form */}
      <section className="py-16">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-emerald p-6">
              <h2 className="text-white font-black text-lg">نموذج الحجز</h2>
              <p className="text-white/60 text-sm mt-1">الحقول المطلوبة مشار إليها بعلامة <span className="text-red-400">*</span> — المستندات اختيارية</p>
            </div>

            <div className="p-6 space-y-5">
              {/* Service type */}
              <div>
                <label className="form-label">نوع الخدمة <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {serviceTypes.map((s) => {
                    const Icon = s.icon;
                    const active = form.service_type === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setService(s.value)}
                        className={`p-3 sm:p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                          active ? 'border-gold-500 bg-gold-50 text-emerald-900' : 'border-gray-100 text-gray-500 hover:border-emerald-200'
                        }`}
                      >
                        <Icon size={20} />
                        <span className="text-xs font-bold">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Package / Hotel / Trip selection */}
              {form.service_type === 'حج' || form.service_type === 'عمرة' ? (
                <div>
                  <label className="form-label">الباقة</label>
                  {packages === null ? (
                    <div className="flex items-center gap-2 text-gray-400 text-sm py-3"><Loader2 size={16} className="animate-spin" /> جارٍ تحميل الباقات...</div>
                  ) : packages.length === 0 ? (
                    <p className="text-gray-400 text-sm py-3">لا توجد باقات متاحة حالياً</p>
                  ) : (
                    <select
                      value={form.package_id}
                      onChange={(e) => setForm({ ...form, package_id: e.target.value, room_type: '', child_count: '0', infant_count: '0' })}
                      className="form-input"
                    >
                      <option value="">— اختر باقة —</option>
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} — {Number(p.price).toLocaleString('ar-EG')} ج.م</option>
                      ))}
                    </select>
                  )}
                </div>
              ) : null}

              {(form.service_type === 'حج' || form.service_type === 'عمرة') && selectedPackage && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-black text-emerald-950 text-sm">تفاصيل الغرفة والمسافرين</h3>
                      <p className="text-xs text-gray-500 mt-1">يتم حساب السعر من بيانات الباقة المحفوظة في النظام.</p>
                    </div>
                    {packageTotal > 0 && (
                      <div className="text-left">
                        <p className="text-xs text-gray-500">إجمالي تقديري</p>
                        <p className="font-black text-emerald-950 text-lg">{packageTotal.toLocaleString('ar-EG')} <span className="text-xs font-medium">ج.م</span></p>
                      </div>
                    )}
                  </div>

                  {roomOptions.length > 0 ? (
                    <div>
                      <label className="form-label">نوع الغرفة المطلوبة <span className="text-red-500">*</span></label>
                      <div className="grid sm:grid-cols-3 gap-2">
                        {roomOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setForm({ ...form, room_type: option.value })}
                            className={`rounded-xl border-2 p-3 text-right transition-all ${
                              form.room_type === option.value
                                ? 'border-gold-500 bg-white text-emerald-950 shadow-sm'
                                : 'border-emerald-100 bg-white/60 text-gray-600 hover:border-gold-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 text-xs font-bold">
                              <BedDouble size={14} className="text-gold-600" />
                              {option.label}
                            </div>
                            <p className="mt-1 text-sm font-black">{Number(option.price).toLocaleString('ar-EG')} ج.م</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : hasPrice(selectedPackage.price) ? (
                    <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-emerald-950">السعر الأساسي للبالغ</span>
                      <span className="text-sm font-black text-emerald-950">{Number(selectedPackage.price).toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  ) : null}

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="form-label">عدد البالغين</label>
                      <div className="relative">
                        <User size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                        <input type="number" min="0" value={form.adult_count} onChange={(e) => setForm({ ...form, adult_count: e.target.value })} className="form-input pr-12 bg-white" />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">عدد الأطفال {hasPrice(selectedPackage.price_child) && <span className="text-gray-400 font-normal">({Number(selectedPackage.price_child).toLocaleString('ar-EG')} ج.م)</span>}</label>
                      <div className="relative">
                        <Users size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                        <input type="number" min="0" disabled={!hasPrice(selectedPackage.price_child)} value={form.child_count} onChange={(e) => setForm({ ...form, child_count: e.target.value })} className="form-input pr-12 bg-white disabled:bg-gray-100 disabled:text-gray-400" />
                      </div>
                      {!hasPrice(selectedPackage.price_child) && <p className="text-[11px] text-gray-400 mt-1">لا يوجد سعر طفل لهذه الباقة</p>}
                    </div>
                    <div>
                      <label className="form-label">عدد الرضع {hasPrice(selectedPackage.price_infant) && <span className="text-gray-400 font-normal">({Number(selectedPackage.price_infant).toLocaleString('ar-EG')} ج.م)</span>}</label>
                      <div className="relative">
                        <Baby size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                        <input type="number" min="0" disabled={!hasPrice(selectedPackage.price_infant)} value={form.infant_count} onChange={(e) => setForm({ ...form, infant_count: e.target.value })} className="form-input pr-12 bg-white disabled:bg-gray-100 disabled:text-gray-400" />
                      </div>
                      {!hasPrice(selectedPackage.price_infant) && <p className="text-[11px] text-gray-400 mt-1">لا يوجد سعر رضيع لهذه الباقة</p>}
                    </div>
                  </div>
                </div>
              )}

              {form.service_type === 'فندق' && (
                <div>
                  <label className="form-label">الفندق</label>
                  <select value={form.hotel_id} onChange={(e) => setForm({ ...form, hotel_id: e.target.value })} className="form-input">
                    <option value="">— اختر فندق —</option>
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>{h.name} — {h.city} — {Number(h.price_per_night).toLocaleString('ar-EG')} ج.م/ليلة</option>
                    ))}
                  </select>
                </div>
              )}

              {form.service_type === 'داخلي' && trips.length > 0 && (
                <div>
                  <label className="form-label">الرحلة المتاحة</label>
                  <div className="space-y-2">
                    {trips.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <p className="text-sm font-bold text-emerald-900">{t.name}</p>
                          <p className="text-xs text-gray-500">{t.destination} — {new Date(t.start_date).toLocaleDateString('ar-EG')}</p>
                        </div>
                        <span className="text-sm font-bold text-emerald-700">{Number(t.price).toLocaleString('ar-EG')} ج.م</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Name + Phone */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">الاسم بالكامل <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input pr-12" placeholder="الاسم بالكامل" />
                  </div>
                </div>
                <div>
                  <label className="form-label">رقم الهاتف <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" />
                    <input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="form-input pl-12 pr-4" placeholder="01xxxxxxxxx" />
                  </div>
                </div>
              </div>

              {/* WhatsApp + Email */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">رقم واتساب</label>
                  <div className="relative">
                    <Phone size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" />
                    <input dir="ltr" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="form-input pl-12 pr-4" placeholder="01xxxxxxxxx" />
                  </div>
                </div>
                <div>
                  <label className="form-label">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400" />
                    <input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="form-input pl-12 pr-4" placeholder="example@email.com" />
                  </div>
                </div>
              </div>

              {/* Travelers + Travel date */}
              <div className="grid sm:grid-cols-2 gap-4">
                {!(form.service_type === 'حج' || form.service_type === 'عمرة') ? (
                  <div>
                    <label className="form-label">عدد الأفراد</label>
                    <div className="relative">
                      <Users size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                      <input type="number" min="1" value={form.travelers} onChange={(e) => setForm({ ...form, travelers: e.target.value })} className="form-input pr-12" placeholder="1" />
                    </div>
                  </div>
                ) : null}
                <div className={form.service_type === 'حج' || form.service_type === 'عمرة' ? 'sm:col-span-2' : ''}>
                  <label className="form-label">تاريخ السفر المفضل</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                    <input type="date" value={form.travel_date} onChange={(e) => setForm({ ...form, travel_date: e.target.value })} className="form-input pr-12" dir="ltr" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="form-label">ملاحظات إضافية</label>
                <div className="relative">
                  <FileText size={16} className="absolute top-4 right-3 text-gray-400" />
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-input pr-12 min-h-[90px] resize-none" placeholder="أي تفاصيل إضافية تود إخبارنا بها" />
                </div>
              </div>

              {/* Optional documents */}
              <div>
                <label className="form-label">المستندات <span className="text-gray-400 font-normal text-xs">(اختياري — يمكن رفعها لاحقاً)</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {optionalDocs.map((d) => {
                    const file = docFiles[d.id];
                    return (
                      <div key={d.id} className={`rounded-2xl border-2 p-3 transition-all ${file ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-emerald-900">{d.label}</span>
                          {file && <CheckCircle2 size={14} className="text-emerald-500" />}
                        </div>
                        {!file ? (
                          <button
                            type="button"
                            onClick={() => fileRefs.current[d.id]?.click()}
                            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 flex flex-col items-center gap-1 text-gray-400 hover:border-gold-400 hover:text-gold-600 transition-all"
                          >
                            <Upload size={16} />
                            <span className="text-[10px] font-semibold">رفع</span>
                          </button>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-[10px] text-gray-600 truncate bg-white rounded px-1.5 py-1">{file.name}</p>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => previewFile(d.id)} className="p-1 rounded hover:bg-emerald-50 text-emerald-600"><Eye size={12} /></button>
                              <button type="button" onClick={() => setDocFiles({ ...docFiles, [d.id]: null })} className="p-1 rounded hover:bg-red-50 text-red-500"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        )}
                        <input
                          ref={(el) => { fileRefs.current[d.id] = el; }}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => setDocFiles({ ...docFiles, [d.id]: e.target.files?.[0] || null })}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-gradient-gold text-emerald-950 font-black py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 size={18} className="animate-spin" /> جارٍ إرسال الطلب...</>
                ) : (
                  <><Send size={18} /> تأكيد الحجز</>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
