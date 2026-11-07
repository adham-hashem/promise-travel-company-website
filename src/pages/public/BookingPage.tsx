import { useEffect, useRef, useState } from 'react';
import {
  Loader2, CheckCircle2, Send, Upload, Eye, Trash2, Hash,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../lib/imageCompressor';
import { adultRoomOptions, getPackagePriceForCustomer, type AgeGroup, type AdultRoomType } from '../../lib/packagePricing';
import type { Package, Hotel, InternalTrip } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';
import { PageHero } from '../../components/public/site/sections';
import { ProgramIcon, WhatsAppIcon } from '../../components/public/site/icons';
import { waLink, type ProgramIconKey } from '../../components/public/site/siteData';

interface Props {
  preset?: { packageId?: string; type?: string };
  onDone: () => void;
  onNavigate?: (p: PublicPage) => void;
}

const serviceTypes: { value: string; label: string; icon: ProgramIconKey }[] = [
  { value: 'حج', label: 'حج', icon: 'hajj' },
  { value: 'عمرة', label: 'عمرة', icon: 'umrah' },
  { value: 'داخلي', label: 'سياحة داخلية', icon: 'internal' },
  { value: 'فندق', label: 'حجز فندق', icon: 'hotels' },
];

const optionalDocs = [
  { id: 'جواز سفر', label: 'جواز السفر' },
  { id: 'بطاقة رقم قومي', label: 'البطاقة الشخصية' },
  { id: 'صورة شخصية', label: 'الصورة الشخصية' },
];

const websiteDocFileKeys: Record<string, string> = {
  'جواز سفر': 'passport',
  'بطاقة رقم قومي': 'national_id',
  'صورة شخصية': 'personal_photo',
};

interface TravelerLine {
  id: string;
  age_group: AgeGroup;
  room_type: AdultRoomType | '';
}

export default function BookingPage({ preset, onDone, onNavigate }: Props) {
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
  });
  const [travelerLines, setTravelerLines] = useState<TravelerLine[]>([
    { id: 'traveler-1', age_group: 'بالغ', room_type: '' },
  ]);
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
    setForm((f) => ({ ...f, package_id: packageId, hotel_id: '', travelers: '1' }));
    setTravelerLines([{ id: `traveler-${Date.now()}`, age_group: 'بالغ', room_type: '' }]);
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

  const setPackage = (packageId: string) => {
    setForm({ ...form, package_id: packageId, travelers: '1' });
    setTravelerLines([{ id: `traveler-${Date.now()}`, age_group: 'بالغ', room_type: '' }]);
  };

  useEffect(() => {
    if (preset?.type) loadOptions(preset.type, preset.packageId || '');
  }, [preset?.type, preset?.packageId]);

  useEffect(() => {
    if (done) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [done]);

  const selectedPackage = packages?.find((p) => p.id === form.package_id) || null;
  const toCount = (value: string) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };
  const hasPrice = (value: unknown) => Number.isFinite(Number(value)) && Number(value) > 0;
  const roomOptions = selectedPackage
    ? adultRoomOptions
      .map((option) => ({ ...option, price: selectedPackage[option.field] }))
      .filter((option) => hasPrice(option.price))
    : [];
  const packageTravelerCount = travelerLines.length;
  const adultCount = travelerLines.filter((traveler) => traveler.age_group === 'بالغ').length;
  const childCount = travelerLines.filter((traveler) => traveler.age_group === 'طفل').length;
  const infantCount = travelerLines.filter((traveler) => traveler.age_group === 'رضيع').length;
  const packageTotal = selectedPackage
    ? travelerLines.reduce((sum, traveler) => (
      sum + getPackagePriceForCustomer(selectedPackage, traveler.age_group, traveler.room_type)
    ), 0)
    : 0;

  const setTravelerCount = (value: string) => {
    const nextCount = Math.max(1, toCount(value) || 1);
    setForm((prev) => ({ ...prev, travelers: String(nextCount) }));
    setTravelerLines((prev) => {
      if (nextCount === prev.length) return prev;
      if (nextCount < prev.length) return prev.slice(0, nextCount);
      return [
        ...prev,
        ...Array.from({ length: nextCount - prev.length }, (_, index) => ({
          id: `traveler-${Date.now()}-${index}`,
          age_group: 'بالغ' as AgeGroup,
          room_type: '' as AdultRoomType | '',
        })),
      ];
    });
  };

  const updateTraveler = (id: string, patch: Partial<TravelerLine>) => {
    setTravelerLines((prev) => prev.map((traveler) => {
      if (traveler.id !== id) return traveler;
      const next = { ...traveler, ...patch };
      if (patch.age_group && patch.age_group !== 'بالغ') next.room_type = '';
      return next;
    }));
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
    const isPackageBooking = form.service_type === 'حج' || form.service_type === 'عمرة';
    if (isPackageBooking && form.package_id) {
      if (!selectedPackage) { setError('يرجى اختيار باقة صحيحة'); return; }
      if (packageTravelerCount < 1) { setError('حدد عدد المسافرين في الباقة'); return; }
      if (adultCount > 0 && travelerLines.some((traveler) => traveler.age_group === 'بالغ' && !traveler.room_type)) { setError('اختر نوع التسكين لكل بالغ'); return; }
      if (adultCount > 0 && travelerLines.some((traveler) => traveler.age_group === 'بالغ' && getPackagePriceForCustomer(selectedPackage, 'بالغ', traveler.room_type) <= 0)) { setError('لا يوجد سعر بالغ متاح لنوع التسكين المختار'); return; }
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
        ? [
          `تفاصيل التسعير: بالغين: ${adultCount} | أطفال: ${childCount} | رضع: ${infantCount}`,
          ...travelerLines.map((traveler, index) => {
            const price = selectedPackage ? getPackagePriceForCustomer(selectedPackage, traveler.age_group, traveler.room_type) : 0;
            const roomLabel = traveler.age_group === 'بالغ' ? ` - تسكين ${traveler.room_type}` : ' - بدون تسكين مستقل';
            return `مسافر ${index + 1}: ${traveler.age_group}${roomLabel} - ${price.toLocaleString('ar-EG')} ج.م`;
          }),
          `الإجمالي التقريبي: ${packageTotal.toLocaleString('ar-EG')} ج.م`,
        ].join('\n')
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
      ].filter(Boolean).join('\n');

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
        const ext = (file.name.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '') || 'bin';
        const safeDocType = websiteDocFileKeys[docType.id] || 'document';
        const filePath = `website-inquiries/${inquiry.id}/${Date.now()}_${safeDocType}.${ext}`;
        const uploadFile = file.type.startsWith('image/') ? await compressImage(file) : file;
        const { error: upErr } = await supabase.storage.from('documents').upload(filePath, uploadFile);
        if (upErr) throw new Error(`فشل رفع مستند ${docType.label}: ${upErr.message}`);
        const { data: publicFile } = supabase.storage.from('documents').getPublicUrl(filePath);
        const { error: docErr } = await supabase.from('documents').insert({
          inquiry_id: inquiry.id,
          doc_type: docType.id,
          file_path: filePath,
          file_url: publicFile.publicUrl,
          file_name: file.name,
          file_size: uploadFile.size,
          status: 'مرفوع',
        });
        if (docErr) throw new Error(`فشل حفظ مستند ${docType.label}: ${docErr.message}`);
      }

      setCreatedCode(inquiry.inquiry_number);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  const isPackageService = form.service_type === 'حج' || form.service_type === 'عمرة';
  const req = <span style={{ color: '#B3412E' }}>*</span>;

  if (done) {
    return (
      <div className="pm-section">
        <div className="pm-wrap" style={{ maxWidth: 560 }}>
          <div className="pm-panel text-center animate-fadeIn">
            <span className="pm-ico mx-auto mb-4" style={{ width: 72, height: 72, borderRadius: '50%' }}><CheckCircle2 size={36} /></span>
            <h2 className="text-3xl font-bold text-pm-teal mb-2">تم استلام طلبك</h2>
            <p className="text-pm-muted">شكراً لك. سيتواصل معك فريق المبيعات في أقرب وقت خلال مواعيد العمل لتأكيد التفاصيل وإرسال عرض السعر.</p>
            {createdCode && (
              <div className="inline-flex items-center gap-2 rounded-[10px] border border-dashed border-pm-gold-deep px-4 py-2 mt-5">
                <Hash size={16} className="text-pm-gold-deep" />
                <span className="text-pm-teal font-semibold">رقم الطلب: <span className="pm-num pm-latin" style={{ letterSpacing: '.06em' }}>{createdCode}</span></span>
              </div>
            )}
            <p className="text-sm text-pm-muted mt-3">احتفظ بهذا الرقم لمتابعة طلبك معنا.</p>
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <button type="button" onClick={onDone} className="pm-btn pm-btn-gold">العودة للرئيسية</button>
              <a className="pm-btn pm-btn-teal" href={waLink(`السلام عليكم، أرسلت طلب حجز من الموقع${createdCode ? ` برقم ${createdCode}` : ''}`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> تابع عبر واتساب</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHero
        eyebrow="نموذج الحجز"
        title={<>اطلب عرض <em>سعر</em></>}
        lead="املأ البيانات وسيتواصل معك فريق المبيعات بعرض سعر مكتوب برقم مرجعي. يمكنك رفع المستندات الآن أو لاحقاً."
        crumbs={onNavigate ? [{ label: 'الرئيسية', page: 'home' }, { label: 'نموذج الحجز' }] : undefined}
        onNavigate={(p) => onNavigate?.(p)}
      />

      <section className="pm-section tight tint">
        <div className="pm-wrap" style={{ maxWidth: 820 }}>
          <div className="pm-panel">
            <h3>بيانات الحجز</h3>
            <p className="pm-panel-lead">الحقول المطلوبة عليها علامة {req}، والمستندات اختيارية.</p>

            <div className="space-y-6">
              {/* Service type */}
              <div>
                <p className="pm-label mb-2">نوع الخدمة {req}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {serviceTypes.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setService(s.value)}
                      aria-pressed={form.service_type === s.value}
                      className="pm-choice flex flex-col items-center gap-1.5"
                    >
                      <ProgramIcon name={s.icon} size={22} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Package selection */}
              {isPackageService && (
                <div className="pm-field">
                  <label htmlFor="bk-package">الباقة</label>
                  {packages === null ? (
                    <div className="flex items-center gap-2 text-pm-muted text-sm py-3"><Loader2 size={16} className="animate-spin" /> جارٍ تحميل الباقات...</div>
                  ) : packages.length === 0 ? (
                    <p className="text-pm-muted text-sm py-3">لا توجد باقات متاحة حالياً، ويمكنك إرسال الطلب وسنرسل لك أقرب البرامج.</p>
                  ) : (
                    <select id="bk-package" value={form.package_id} onChange={(e) => setPackage(e.target.value)}>
                      <option value="">— اختر باقة —</option>
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} — {Number(p.price).toLocaleString('ar-EG')} ج.م</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {isPackageService && selectedPackage && (
                <div className="rounded-[14px] border border-pm-line bg-pm-paper p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h4 className="text-lg font-semibold text-pm-teal">الغرف والمسافرين</h4>
                      <p className="text-xs text-pm-muted mt-1">السعر محسوب من بيانات الباقة المسجلة لدينا.</p>
                    </div>
                    {packageTotal > 0 && (
                      <div className="text-left">
                        <p className="text-xs text-pm-muted">إجمالي تقديري</p>
                        <p className="pm-price">{packageTotal.toLocaleString('ar-EG')} <small>ج.م</small></p>
                      </div>
                    )}
                  </div>

                  <div className="pm-field" style={{ maxWidth: 200 }}>
                    <label htmlFor="bk-travelers">عدد الأشخاص</label>
                    <input id="bk-travelers" type="number" min="1" value={form.travelers} onChange={(e) => setTravelerCount(e.target.value)} dir="ltr" style={{ background: '#fff' }} />
                  </div>

                  <div className="space-y-3">
                    {travelerLines.map((traveler, index) => {
                      const travelerPrice = getPackagePriceForCustomer(selectedPackage, traveler.age_group, traveler.room_type);
                      return (
                        <div key={traveler.id} className="rounded-[12px] border border-pm-line bg-white p-3 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-pm-teal">مسافر {index + 1}</p>
                            <p className="font-semibold text-pm-teal">{travelerPrice.toLocaleString('ar-EG')} ج.م</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {(['بالغ', 'طفل', 'رضيع'] as AgeGroup[]).map((ageGroup) => (
                              <button
                                key={ageGroup}
                                type="button"
                                onClick={() => updateTraveler(traveler.id, { age_group: ageGroup })}
                                aria-pressed={traveler.age_group === ageGroup}
                                className="pm-choice"
                                style={{ padding: '8px 10px' }}
                              >
                                {ageGroup}
                              </button>
                            ))}
                          </div>
                          {traveler.age_group === 'بالغ' && (
                            <div className="grid sm:grid-cols-3 gap-2">
                              {roomOptions.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => updateTraveler(traveler.id, { room_type: option.value })}
                                  aria-pressed={traveler.room_type === option.value}
                                  className="pm-choice"
                                  style={{ padding: '9px 12px', textAlign: 'right' }}
                                >
                                  <span className="block text-xs">{option.label}</span>
                                  <span className="block text-sm">{Number(option.price).toLocaleString('ar-EG')} ج.م</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {traveler.age_group !== 'بالغ' && (
                            <p className="text-xs text-pm-muted">لا يوجد نوع تسكين مستقل للطفل أو الرضيع، ويُحسب بسعره داخل الباقة.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {form.service_type === 'فندق' && (
                <div className="pm-field">
                  <label htmlFor="bk-hotel">الفندق</label>
                  <select id="bk-hotel" value={form.hotel_id} onChange={(e) => setForm({ ...form, hotel_id: e.target.value })}>
                    <option value="">— اختر فندق —</option>
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>{h.name} — {h.city} — {Number(h.price_per_night).toLocaleString('ar-EG')} ج.م/ليلة</option>
                    ))}
                  </select>
                </div>
              )}

              {form.service_type === 'داخلي' && trips.length > 0 && (
                <div>
                  <p className="pm-label mb-2">الرحلات المتاحة</p>
                  <div className="space-y-2">
                    {trips.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-[10px] border border-pm-line bg-pm-paper">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-pm-teal">{t.name}</p>
                          <p className="text-xs text-pm-muted">{t.destination} — {new Date(t.start_date).toLocaleDateString('ar-EG')}</p>
                        </div>
                        <span className="text-sm font-semibold text-pm-teal flex-none">{Number(t.price).toLocaleString('ar-EG')} ج.م</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-pm-muted mt-2">اذكر اسم الرحلة في الملاحظات.</p>
                </div>
              )}

              <div className="pm-fields">
                <div className="pm-field">
                  <label htmlFor="bk-name">الاسم بالكامل {req}</label>
                  <input id="bk-name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: محمد أحمد" />
                </div>
                <div className="pm-field">
                  <label htmlFor="bk-phone">رقم الهاتف {req}</label>
                  <input id="bk-phone" inputMode="tel" autoComplete="tel" dir="ltr" style={{ textAlign: 'right' }} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" />
                </div>
                <div className="pm-field">
                  <label htmlFor="bk-wa">رقم واتساب</label>
                  <input id="bk-wa" inputMode="tel" dir="ltr" style={{ textAlign: 'right' }} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="01xxxxxxxxx" />
                </div>
                <div className="pm-field">
                  <label htmlFor="bk-email">البريد الإلكتروني</label>
                  <input id="bk-email" type="email" autoComplete="email" dir="ltr" style={{ textAlign: 'right' }} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="example@email.com" />
                </div>
                {!isPackageService && (
                  <div className="pm-field">
                    <label htmlFor="bk-count">عدد الأفراد</label>
                    <input id="bk-count" type="number" min="1" dir="ltr" style={{ textAlign: 'right' }} value={form.travelers} onChange={(e) => setForm({ ...form, travelers: e.target.value })} />
                  </div>
                )}
                <div className={`pm-field ${isPackageService ? 'full' : ''}`}>
                  <label htmlFor="bk-date">تاريخ السفر المفضل</label>
                  <input id="bk-date" type="date" dir="ltr" value={form.travel_date} onChange={(e) => setForm({ ...form, travel_date: e.target.value })} />
                </div>
                <div className="pm-field full">
                  <label htmlFor="bk-notes">ملاحظات</label>
                  <textarea id="bk-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="مستوى الفندق، غرفة ثنائية أو ثلاثية، أي طلب خاص" />
                </div>
              </div>

              {/* Optional documents */}
              <div>
                <p className="pm-label mb-2">المستندات <span className="opt">(اختياري — يمكن رفعها لاحقاً)</span></p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {optionalDocs.map((d) => {
                    const file = docFiles[d.id];
                    return (
                      <div key={d.id} className={`rounded-[12px] border p-3 transition-colors ${file ? 'border-pm-gold-deep bg-pm-gold-soft/40' : 'border-pm-line bg-white'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-pm-teal">{d.label}</span>
                          {file && <CheckCircle2 size={15} className="text-pm-gold-deep" />}
                        </div>
                        {!file ? (
                          <button
                            type="button"
                            onClick={() => fileRefs.current[d.id]?.click()}
                            className="w-full border border-dashed border-pm-line rounded-[10px] py-4 flex flex-col items-center gap-1 text-pm-muted hover:border-pm-gold-deep hover:text-pm-gold-deep transition-colors"
                          >
                            <Upload size={16} />
                            <span className="text-xs font-semibold">رفع ملف</span>
                          </button>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-xs text-pm-ink truncate bg-white rounded px-2 py-1">{file.name}</p>
                            <div className="flex items-center gap-1">
                              <button type="button" aria-label="معاينة" onClick={() => previewFile(d.id)} className="p-1.5 rounded text-pm-teal hover:bg-white"><Eye size={14} /></button>
                              <button type="button" aria-label="حذف" onClick={() => setDocFiles({ ...docFiles, [d.id]: null })} className="p-1.5 rounded text-[#8A2E1F] hover:bg-white"><Trash2 size={14} /></button>
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

              {error && <div className="pm-error" role="alert">{error}</div>}

              <div className="pm-form-foot" style={{ marginTop: 0 }}>
                <button type="button" onClick={handleSubmit} disabled={submitting} className="pm-btn pm-btn-gold">
                  {submitting ? <><Loader2 size={18} className="animate-spin" /> جارٍ إرسال الطلب...</> : <><Send size={17} /> إرسال الطلب</>}
                </button>
                <small>أو راسلنا مباشرة على <a href={waLink()} target="_blank" rel="noopener noreferrer" className="pm-link" style={{ fontSize: 13 }}>واتساب</a></small>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

