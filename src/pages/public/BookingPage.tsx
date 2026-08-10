import { useEffect, useRef, useState } from 'react';
import {
  Loader2, CheckCircle2, Moon, Plane, MapPin, Hotel as HotelIcon,
  User, Phone, Mail, FileText, Send, Calendar, Users, Upload,
  Eye, Trash2, Globe,
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
    travel_date: '',
    notes: '',
    room_type: 'ثنائي' as 'ثنائي' | 'ثلاثي' | 'رباعي',
    num_adults: '1',
    num_children: '0',
    num_infants: '0',
  });
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({
    'جواز سفر': null, 'بطاقة رقم قومي': null, 'صورة شخصية': null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
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

  useEffect(() => {
    if (done) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [done]);

  useEffect(() => {
    if (preset?.type) {
      loadOptions(preset.type, preset.packageId);
    } else {
      setPackages([]);
    }
  }, [preset]);

  const loadOptions = async (type: string, initialPackageId?: string) => {
    setPackages(null);
    setForm((f) => ({ ...f, package_id: initialPackageId || '', hotel_id: '' }));
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
    setSubmitting(true);

    try {
      const serviceTypeMap: Record<string, string> = {
        'حج': 'حج', 'عمرة': 'عمرة', 'داخلي': 'سياحة داخلية', 'فندق': 'حجز فندق',
      };
      const serviceType = serviceTypeMap[form.service_type] || 'عمرة';

      // 1. Check if customer exists by phone
      const { data: existing } = await supabase
        .from('customers')
        .select('id, client_code')
        .eq('phone', form.phone)
        .maybeSingle();

      let customerId = existing?.id;
      let clientCode = existing?.client_code || null;

      // 2. Create customer if not exists (source='Website')
      if (!customerId) {
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({
            name: form.name,
            phone: form.phone,
            whatsapp: form.whatsapp || null,
            email: form.email || null,
            service_type: serviceType as never,
            source: 'Website',
            notes: form.notes || null,
            status: 'جديد',
            documents_status: 'ناقص مستندات',
          })
          .select('id, client_code')
          .single();
        if (custErr) throw new Error(custErr.message);
        customerId = newCust!.id;
        clientCode = newCust!.client_code || null;
      }

      // 3. Upload optional documents
      for (const docType of optionalDocs) {
        const file = docFiles[docType.id];
        if (!file) continue;
        const compressedFile = await compressImage(file);
        const ext = compressedFile.name.split('.').pop();
        const filePath = `${customerId}/${Date.now()}_${docType.id}.${ext}`;
        const { error: upErr } = await supabase.storage.from('documents').upload(filePath, compressedFile);
        if (upErr) continue;
        await supabase.from('documents').insert({
          customer_id: customerId,
          doc_type: docType.id,
          file_path: filePath,
          file_name: compressedFile.name,
          file_size: compressedFile.size,
          status: 'مرفوع',
        });
      }

      // 4. Create booking (source='Website')
      const bookingNotes = `حجز من الموقع — عدد المسافرين: ${form.travelers}${form.notes ? ' — ' + form.notes : ''}`;
      const bookingData: Record<string, unknown> = {
        customer_id: customerId,
        status: 'معلق',
        payment_status: 'غير مدفوع',
        booking_date: new Date().toISOString().split('T')[0],
        notes: bookingNotes,
        source: 'Website',
        num_travelers: Number(form.travelers) || 1,
      };
      if (form.travel_date) bookingData.travel_date = form.travel_date;

      if (form.service_type === 'داخلي') {
        // Internal trips don't have package_id in bookings table
      } else if (form.service_type === 'فندق') {
        // Hotel booking — no package, store hotel reference in notes
        if (form.hotel_id) {
          const hotel = hotels.find((h) => h.id === form.hotel_id);
          if (hotel) bookingData.notes = `حجز فندق: ${hotel.name} — ${bookingNotes}`;
        }
      } else if (form.package_id) {
        bookingData.package_id = form.package_id;
        const pkg = packages?.find((p) => p.id === form.package_id);
        if (pkg) {
          let roomRate = Number(pkg.price);
          if (form.room_type === 'ثنائي' && pkg.price_double) roomRate = Number(pkg.price_double);
          else if (form.room_type === 'ثلاثي' && pkg.price_triple) roomRate = Number(pkg.price_triple);
          else if (form.room_type === 'رباعي' && pkg.price_quad) roomRate = Number(pkg.price_quad);

          const adultsVal = Number(form.num_adults) || 0;
          const childrenVal = Number(form.num_children) || 0;
          const infantsVal = Number(form.num_infants) || 0;

          const childRate = pkg.price_child ? Number(pkg.price_child) : roomRate;
          const infantRate = pkg.price_infant ? Number(pkg.price_infant) : roomRate;

          const total = (roomRate * adultsVal) + (childRate * childrenVal) + (infantRate * infantsVal);
          bookingData.total_amount = total;
          bookingData.notes = `تفاصيل السكن: غرفة ${form.room_type} — الأفراد: ${adultsVal} بالغ، ${childrenVal} طفل، ${infantsVal} رضيع — ${bookingNotes}`;
        }
      }

      const { data: booking, error: bkErr } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select('id')
        .single();
      if (bkErr) throw new Error(bkErr.message);

      // 5. Create operation file
      if (booking) {
        await supabase.from('operation_files').insert({
          booking_id: booking.id,
          customer_id: customerId,
          file_status: 'جديد',
          travel_date: form.travel_date || null,
          notes: 'تم الإنشاء تلقائياً من حجز الموقع',
        });
        setCreatedBookingId(booking.id);
      }

      setCreatedCode(clientCode);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-20 bg-gray-50/50" dir="rtl">
        <div className="max-w-md w-full text-center bg-white rounded-3xl border border-gray-100 p-8 shadow-xl animate-fadeIn">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-navy-900 mb-3">تم استلام طلبك بنجاح!</h2>
          <p className="text-gray-500 text-sm mb-6">شكراً لك على الحجز مع Promise Travel. يمكنك الاحتفاظ ببيانات الحجز التالية للمتابعة مع خدمة العملاء:</p>
          
          <div className="space-y-3 mb-8 text-right">
            {createdBookingId && (
              <div className="flex items-center justify-between p-4 bg-navy-50/80 border border-navy-100 rounded-2xl">
                <span className="text-sm font-semibold text-gray-500">رقم الحجز:</span>
                <span className="font-mono font-black text-navy-900 text-lg">#{createdBookingId.slice(0, 8).toUpperCase()}</span>
              </div>
            )}
            {createdCode && (
              <div className="flex items-center justify-between p-4 bg-gold-50/80 border border-gold-100 rounded-2xl">
                <span className="text-sm font-semibold text-gray-500">كود العميل:</span>
                <span className="font-mono font-black text-gold-700 text-lg">{createdCode}</span>
              </div>
            )}
          </div>

          <button
            onClick={onDone}
            className="w-full bg-gradient-navy text-white font-bold py-3.5 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[35vh] min-h-[280px] overflow-hidden">
        <img 
          src="/صفحة الحجز للكمبيوتر.webp" 
          alt="احجز رحلتك" 
          className="hidden md:block w-full h-full object-cover" 
        />
        <img 
          src="/صفحة الحجز للموبايل .webp" 
          alt="احجز رحلتك" 
          className="block md:hidden w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-white/10" />
        <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-end pb-12 text-white">
          <span className="inline-flex w-fit items-center gap-2 bg-white/20 backdrop-blur border border-white/30 text-white px-4 py-1.5 rounded-full text-xs font-semibold mb-3 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
            <Globe size={12} /> حجز من الموقع
          </span>
          <h1 className="text-3xl md:text-5xl font-black mb-2 drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]">احجز رحلتك</h1>
          <p className="text-white text-lg drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">ابدأ رحلتك المباركة الآن — املأ النموذج وسنتواصل معك فوراً</p>
        </div>
      </section>

      {/* Form */}
      <section className="py-16">
        <div className="max-w-2xl mx-auto px-4">
<div className="mb-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-gold text-navy-900">
                  <Phone size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-navy-900">تواصل معنا لحجزك</h3>
                  <p className="mt-1 text-sm text-gray-600">لأي استفسار أو حجز، يمكنكم التواصل على الرقمين التاليين:</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <a href="tel:01011106989" dir="ltr" className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-semibold text-navy-800 transition-colors hover:border-gold-400 hover:text-gold-600">01011106989</a>
                    <a href="tel:01055503857" dir="ltr" className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-semibold text-navy-800 transition-colors hover:border-gold-400 hover:text-gold-600">01055503857</a>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#D4A017]">نخدم عملاءنا في جميع محافظات مصر.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-navy p-6">
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
                          active ? 'border-gold-500 bg-gold-50 text-navy-900' : 'border-gray-100 text-gray-500 hover:border-navy-200'
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
                      onChange={(e) => setForm({ ...form, package_id: e.target.value })}
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
                          <p className="text-sm font-bold text-navy-900">{t.name}</p>
                          <p className="text-xs text-gray-500">{t.destination} — {new Date(t.start_date).toLocaleDateString('ar-EG')}</p>
                        </div>
                        <span className="text-sm font-bold text-navy-700">{Number(t.price).toLocaleString('ar-EG')} ج.م</span>
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
                    <User size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none z-10" />
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input !pr-12" placeholder="الاسم بالكامل" />
                  </div>
                </div>
                <div>
                  <label className="form-label">رقم الهاتف <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none z-10" />
                    <input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="form-input !pr-12" placeholder="01xxxxxxxxx" />
                  </div>
                </div>
              </div>

              {/* WhatsApp + Email */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">رقم واتساب</label>
                  <div className="relative">
                    <Phone size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none z-10" />
                    <input dir="ltr" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="form-input !pr-12" placeholder="01xxxxxxxxx" />
                  </div>
                </div>
                <div>
                  <label className="form-label">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none z-10" />
                    <input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="form-input !pr-12" placeholder="example@email.com" />
                  </div>
                </div>
              </div>

              {/* Room type and Age splits for Packages */}
              {(form.service_type === 'حج' || form.service_type === 'عمرة') && form.package_id && (
                <div className="p-4 bg-navy-50/50 rounded-2xl border border-navy-100/80 space-y-3">
                  <p className="text-xs font-bold text-navy-900 border-b border-navy-100 pb-2">تفاصيل الغرفة وتوزيع المسافرين:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">نوع الغرفة</label>
                      <select
                        value={form.room_type}
                        onChange={(e) => setForm({ ...form, room_type: e.target.value as any })}
                        className="form-input text-xs"
                      >
                        <option value="ثنائي">ثنائي (Double)</option>
                        <option value="ثلاثي">ثلاثي (Triple)</option>
                        <option value="رباعي">رباعي (Quad)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">عدد البالغين</label>
                      <input
                        type="number"
                        min="1"
                        value={form.num_adults}
                        onChange={(e) => {
                          const adults = e.target.value;
                          const total = Number(adults) + Number(form.num_children) + Number(form.num_infants);
                          setForm({ ...form, num_adults: adults, travelers: String(total) });
                        }}
                        className="form-input text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">عدد الأطفال (2-12 سنة)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.num_children}
                        onChange={(e) => {
                          const kids = e.target.value;
                          const total = Number(form.num_adults) + Number(kids) + Number(form.num_infants);
                          setForm({ ...form, num_children: kids, travelers: String(total) });
                        }}
                        className="form-input text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">عدد الرضع (أقل من سنتين)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.num_infants}
                        onChange={(e) => {
                          const infants = e.target.value;
                          const total = Number(form.num_adults) + Number(form.num_children) + Number(infants);
                          setForm({ ...form, num_infants: infants, travelers: String(total) });
                        }}
                        className="form-input text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Travelers + Travel date */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">إجمالي عدد الأفراد</label>
                  <div className="relative">
                    <Users size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none z-10" />
                    <input
                      type="number"
                      min="1"
                      disabled={form.service_type === 'حج' || form.service_type === 'عمرة'}
                      value={form.travelers}
                      onChange={(e) => setForm({ ...form, travelers: e.target.value })}
                      className="form-input !pr-12 disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">تاريخ السفر المفضل</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none z-10" />
                    <input type="date" value={form.travel_date} onChange={(e) => setForm({ ...form, travel_date: e.target.value })} className="form-input !pr-12" dir="ltr" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="form-label">ملاحظات إضافية</label>
                <div className="relative">
                  <FileText size={16} className="absolute top-4 right-3 text-gray-400 pointer-events-none z-10" />
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-input !pr-12 min-h-[90px] resize-none" placeholder="أي تفاصيل إضافية تود إخبارنا بها" />
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
                          <span className="text-xs font-bold text-navy-900">{d.label}</span>
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
                              <button type="button" onClick={() => previewFile(d.id)} className="p-1 rounded hover:bg-navy-50 text-navy-600"><Eye size={12} /></button>
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
                className="w-full bg-gradient-gold text-navy-900 font-black py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-2"
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
