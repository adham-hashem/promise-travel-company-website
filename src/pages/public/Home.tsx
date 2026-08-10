import { useEffect, useState } from 'react';
import {
  Plane, Moon, MapPin, Star, Clock, Hotel as HotelIcon, ArrowLeft,
  ShieldCheck, Award, Users, Headphones, Plus, Minus, Tag,
  CheckCircle2, Sparkles, CalendarDays, UtensilsCrossed,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Package, Offer, Hotel, InternalTrip } from '../../types';
import type { PublicPage, NavigateProps } from '../../components/public/WebsiteRouter';

interface Props {
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, hotelId?: string) => void;
}

const heroSlides = [
  {
    img: 'سفر.webp',
    place: 'رحلات لا تُنسى حول العالم',
    title: 'العالم ينتظرك',
    subtitle: 'أفضل الوجهات العالمية بأسعار تنافسية وخدمات احترافية',
  },
  {
    img: 'كعبة.webp',
    place: 'مكة المكرمة',
    title: 'ابدأ رحلتك الإيمانية معنا',
    subtitle: 'رحلات حج وعمرة وسياحة داخلية بأعلى جودة',
  },
  {
    img: 'المسجد.webp',
    place: 'المدينة المنورة',
    title: 'زيارة المسجد النبوي الشريف',
    subtitle: 'أياماً من الطمأنينة والسكينة في رحاب الحبيب',
  },
  {
    img: 'p1 (1).webp',
    place: 'شرم الشيخ',
    title: 'استمتع بشواطئ البحر الأحمر',
    subtitle: 'رحلات داخلية فاخرة إلى أجمل الوجهات المصرية',
  },
];

const services = [
  {
    id: 'hajj' as const,
    icon: Moon,
    title: 'الحج',
    desc: 'برامج حج متكاملة مع نخبة من الشركات المعتمدة، إقامة فاخرة قرب المشاعر المقدسة، وإشراف متخصص طوال الرحلة.',
    img: 'hegi.webp',
  },
  {
    id: 'umrah' as const,
    icon: Plane,
    title: 'العمرة',
    desc: 'عمرة مريحة على مدار العام بأفضل الفنادق القريبة من الحرم، وأسعار تنافسية، وخدمات نقل راقية من وإلى المطار.',
    img: 'maka.webp',
  },
  {
    id: 'internal' as const,
    icon: MapPin,
    title: 'الرحلات الداخلية',
    desc: 'اكتشف جمال مصر من شرم الشيخ والغردقة والأقصر وأسوان، برامج سياحية مصممة بعناية لراحتك وإمتاعك.',
    img: 'prom1.webp',
  },
  {
    id: 'hotels' as const,
    icon: HotelIcon,
    title: 'الفنادق',
    desc: 'نخبة من الفنادق المصنّفة قرب الحرم الشريف وأجمل الوجهات السياحية، باقات إقامة فاخرة بأسعار مناسبة.',
    img: 'الفنادق1.webp',
  },
];

const whyChoose = [
  { icon: ShieldCheck, title: 'موثوق ومرخص', desc: 'محترفون مرخصون رسمياً من وزارة السياحة' },
  { icon: Award, title: 'جودة عالية', desc: 'خدمة متميزة بأعلى المعايير العالمية' },
  { icon: Users, title: 'فريق متخصص', desc: 'مستشارون ذوو خبرة في خدمة الضيوف' },
  { icon: Headphones, title: 'دعم 24/7', desc: 'فريق دعم متواصل طوال أيام الأسبوع' },
];



const faqs = [
  { q: 'كيف يمكنني الحجز؟', a: 'يمكنك الحجز مباشرة من خلال صفحة "احجز الآن" على موقعنا، أو التواصل معنا هاتفياً وسيقوم فريقنا بمساعدتك في إتمام الحجز.' },
  { q: 'هل تشمل الباقات تذاكر الطيران؟', a: 'نعم، جميع باقات الحج والعمرة تشمل تذاكر الطيران ذهاباً وعودة، كما تشمل الإقامة والنقل والتأشيرات.' },
  { q: 'هل يمكنني الدفع على دفعات؟', a: 'نعم، نوفر نظام دفع مرن يتيح لك دفع جزء من المبلغ عند الحجز والباقي قبل موعد السفر بفترة كافية.' },
  { q: 'هل توفرون مرشدين سياحيين؟', a: 'نعم، نوفر مرشدين متخصصين يتحدثون العربية والإنجليزية طوال فترة الرحلة لضمان تجربة مريحة وممتعة.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all hover:shadow-md">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-right hover:bg-navy-50/50 transition-colors"
      >
        <span className="font-bold text-navy-900 text-sm">{q}</span>
        <span className="text-gold-600 flex-shrink-0 mr-3">{open ? <Minus size={18} /> : <Plus size={18} />}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed animate-fadeIn">{a}</div>
      )}
    </div>
  );
}

export default function Home({ onNavigate }: Props) {
  const [slide, setSlide] = useState(0);
  const [packages, setPackages] = useState<Package[]>([]);
  const [expandedPackages, setExpandedPackages] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) => setExpandedPackages(prev => ({ ...prev, [id]: !prev[id] }));
  const [offers, setOffers] = useState<(Offer & { packages?: Package })[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [internalTrips, setInternalTrips] = useState<InternalTrip[]>([]);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 5500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: pkgs } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);
      setPackages((pkgs as Package[]) || []);

      const { data: offrs } = await supabase
        .from('offers')
        .select('*, packages(*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);
      setOffers((offrs as (Offer & { packages?: Package })[]) || []);

      const { data: htl } = await supabase
        .from('hotels')
        .select('*')
        .eq('status', 'نشط')
        .order('stars', { ascending: false })
        .limit(4);
      setHotels((htl as Hotel[]) || []);

      const { data: trips } = await supabase
        .from('internal_trips')
        .select('*')
        .eq('status', 'متاحة')
        .order('created_at', { ascending: false })
        .limit(3);
      setInternalTrips((trips as InternalTrip[]) || []);
    })();
  }, []);

  const featured = packages.filter((p) => p.featured).slice(0, 3);
  const display = featured.length > 0 ? featured : packages.slice(0, 3);
  const today = new Date().toISOString().split('T')[0];
  const validOffers = offers.filter((o) => o.end_date >= today && o.start_date <= today).slice(0, 3);

  return (
    <div>
      {/* ===== Hero Slider ===== */}
      <section className="relative h-[88vh] min-h-[600px] overflow-hidden">
        {heroSlides.map((s, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === slide ? 'opacity-100' : 'opacity-0'}`}
          >
            <img src={s.img} alt={s.place} className="w-full h-full object-cover" />
          </div>
        ))}

        <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-center items-center text-center text-white">
          <span className="inline-flex items-center gap-2 bg-gold-500/20 backdrop-blur border border-gold-400/30 text-gold-300 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 animate-fadeIn">
            <Sparkles size={12} />
            {heroSlides[slide].place}
          </span>
          <h1
            className="text-3xl md:text-6xl font-black mb-4 leading-tight max-w-4xl animate-fadeIn"
            style={{ textShadow: '1px 0 0 rgba(0,0,0,0.7), -1px 0 0 rgba(0,0,0,0.7), 0 1px 0 rgba(0,0,0,0.7), 0 -1px 0 rgba(0,0,0,0.7), 1px 1px 0 rgba(0,0,0,0.5), -1px -1px 0 rgba(0,0,0,0.5)' }}
          >
            {heroSlides[slide].title}
          </h1>
          <p className="text-white/80 text-base md:text-xl mb-8 max-w-2xl animate-fadeIn">
            {heroSlides[slide].subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 animate-fadeIn">
            <button
              onClick={() => onNavigate('booking')}
              className="bg-gradient-gold text-navy-900 font-bold px-8 py-3.5 rounded-xl shadow-lg hover:scale-105 transition-all"
            >
              احجز الآن
            </button>
            <button
              onClick={() => onNavigate('offers')}
              className="bg-white/10 backdrop-blur border border-white/30 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-white/20 transition-all"
            >
              استكشف الباقات
            </button>
          </div>
        </div>

        {/* Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`h-2 rounded-full transition-all ${i === slide ? 'bg-gold-400 w-8' : 'bg-white/40 w-2'}`}
            />
          ))}
        </div>
      </section>

      {/* ===== About Us ===== */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-gold-600 font-bold text-sm">من نحن</span>
            <h2 className="text-3xl md:text-4xl font-black text-navy-900 mt-2 mb-5">
              Promise للسياحة والسفر
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              منذ تأسيسنا، نكرّس جهودنا لخدمة ضيوف الرحمن والمسافرين من كل مكان. نقدم برامج حج وعمرة ورحلات داخلية متكاملة، بإشراف نخبة من المتخصصين، وحرص على أدق التفاصيل لضمان رحلة مطمئنة ومباركة.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              نعمل بشفافية كاملة، ونهتم برضا عملائنا قبل أي شيء آخر. فريقنا متاح على مدار الساعة لخدمتك في كل خطوة من رحلتك.
            </p>
            <div className="rounded-2xl border border-[#D4A017]/20 bg-[#F8F9FB] p-4 text-sm text-[#0B1F44]/70 mb-6">
              <p className="font-semibold text-[#D4A017]">نخدم عملاءنا في جميع محافظات مصر.</p>
              <p className="mt-1">نحن جاهزون لتقديم الاستشارات والحجوزات من أي محافظة في مصر.</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { num: '15+', label: 'سنوات خبرة' },
                { num: '25K+', label: 'عميل سعيد' },
                { num: '100%', label: 'رضا العملاء' },
              ].map((s) => (
                <div key={s.label} className="text-center bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="text-2xl font-black text-gold-600">{s.num}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <img
              src="clook.webp"
              alt="Promise Travel"
              className="rounded-3xl shadow-2xl w-full h-[420px] object-cover"
            />
            <div className="absolute -bottom-5 -right-5 bg-gradient-gold text-navy-900 rounded-2xl p-5 shadow-xl">
              <Award size={28} className="mb-1" />
              <p className="font-black text-sm">جودة معتمدة</p>
              <p className="text-xs">وزارة السياحة</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Services ===== */}
      <section className="py-20 bg-[#F8F8FC]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-flex items-center rounded-full border border-[#D4A017]/30 bg-[#D4A017]/10 px-4 py-1 text-sm font-bold text-[#D4A017]">
              خدماتنا
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[#0B1F44] mt-4">
              باقة متكاملة من الخدمات السياحية
            </h2>
            <p className="text-[#0B1F44]/60 mt-3 max-w-2xl mx-auto">
              نقدم لك كل ما تحتاجه لرحلة مريحة ومباركة، من تأشيرات الحج والعمرة إلى الرحلات السياحية الداخلية
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
            {services.map((s) => {
              const Icon = s.icon;
              return (
                <article
                  key={s.id}
                  onClick={() => onNavigate(s.id)}
                  className="group flex h-full cursor-pointer flex-col rounded-[24px] border border-[#0B1F44]/10 bg-white shadow-[0_20px_60px_-22px_rgba(11,31,68,0.28)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_80px_-18px_rgba(11,31,68,0.35)]"
                >
                  <div className="relative m-3 mb-0 aspect-[16/9] overflow-hidden rounded-[24px]">
                    <img
                      src={s.img}
                      alt={s.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[#D4A017] backdrop-blur-sm">
                      <Icon size={18} />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5 pt-4">
                    <h3 className="text-lg font-black text-[#0B1F44]">{s.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#0B1F44]/70 line-clamp-2">{s.desc}</p>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#0B1F44]/10 pt-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#D4A017]">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D4A017]/10">
                          <Icon size={16} />
                        </span>
                        <span>خدمة مخصصة</span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(s.id);
                        }}
                        className="rounded-full bg-[#D4A017] px-4 py-2 text-sm font-black text-[#0B1F44] shadow-[0_10px_25px_-12px_rgba(212,160,23,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#C08F0F]"
                      >
                        اعرف المزيد
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Featured Packages ===== */}
      <section className="relative overflow-hidden bg-[#F8F9FB] py-20">
        <div className="absolute inset-0 opacity-80" style={{ background: 'radial-gradient(circle at top right, rgba(212, 160, 23, 0.12), transparent 36%)' }} />
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <span className="inline-flex items-center rounded-full border border-[#D4A017]/30 bg-[#D4A017]/10 px-4 py-1 text-sm font-bold text-[#D4A017]">
              باقات مميزة
            </span>
            <h2 className="mt-4 text-3xl font-black text-[#0B1F44] md:text-4xl">استكشف باقاتنا الأكثر طلباً</h2>
            <p className="mx-auto mt-3 max-w-2xl text-[#0B1F44]/60">
              برامج سفر مصممة بعناية لتجمع بين الراحة والرفاهية والتميز في كل التفاصيل.
            </p>
          </div>

          {display.length === 0 ? (
            <div className="rounded-[24px] border border-[#0B1F44]/10 bg-white py-12 text-center shadow-[0_20px_60px_-22px_rgba(11,31,68,0.18)]">
              <p className="text-[#0B1F44]/60">ستتوفر الباقات قريباً بإذن الله</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {display.map((p) => {
                const destination = (p as Package & { destination?: string; city?: string; location?: string }).destination
                  || (p as Package & { destination?: string; city?: string; location?: string }).city
                  || (p as Package & { destination?: string; city?: string; location?: string }).location;
                const mealPlan = (p as Package & { meal_plan?: string }).meal_plan;
                const badgeText = p.featured ? 'الأكثر طلباً' : (p.hotel ? 'فاخرة' : undefined);

                return (
                  <article
                    key={p.id}
                    className="group mx-auto flex h-full w-full max-w-[340px] flex-col overflow-hidden rounded-[20px] border border-[#0B1F44]/10 bg-white shadow-[0_16px_45px_-22px_rgba(11,31,68,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_-20px_rgba(11,31,68,0.35)]"
                  >
                    <div className="relative aspect-[5/3] overflow-hidden">
                      <img
                        src={p.image_url || 'https://images.pexels.com/photos/1620168/pexels-photo-1620168.jpeg?auto=compress&cs=tinysrgb&w=800'}
                        alt={p.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F44]/95 via-[#0B1F44]/20 to-transparent" />
                      {badgeText ? (
                        <span className="absolute right-3 top-3 rounded-full bg-[#D4A017] px-2.5 py-1 text-[10px] font-black text-[#0B1F44] shadow-lg">
                          {badgeText}
                        </span>
                      ) : null}
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                          {p.type}
                        </span>
                        <h3 className="mt-2 text-lg font-black text-white">{p.name}</h3>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <div className="space-y-2.5 text-sm text-[#0B1F44]/70">
                        {p.duration_days ? (
                          <div className="flex items-center gap-2">
                            <Clock size={13} className="text-[#D4A017]" />
                            <span>{p.duration_days} يوم</span>
                          </div>
                        ) : null}
                        {p.hotel_makkah ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[#D4A017] text-xs">🕋</span>
                            <span>فندق مكة: {p.hotel_makkah}</span>
                          </div>
                        ) : null}
                        {p.hotel_madinah ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[#D4A017] text-xs">🕌</span>
                            <span>فندق المدينة: {p.hotel_madinah}</span>
                          </div>
                        ) : null}
                        {!p.hotel_makkah && !p.hotel_madinah && p.hotel ? (
                          <div className="flex items-center gap-2">
                            <HotelIcon size={13} className="text-[#D4A017]" />
                            <span>{p.hotel}</span>
                          </div>
                        ) : null}
                        {p.airline ? (
                          <div className="flex items-center gap-2">
                            <Plane size={13} className="text-[#D4A017]" />
                            <span>{p.airline}</span>
                          </div>
                        ) : null}
                        {destination ? (
                          <div className="flex items-center gap-2">
                            <MapPin size={13} className="text-[#D4A017]" />
                            <span>{destination}</span>
                          </div>
                        ) : null}
                        {mealPlan ? (
                          <div className="flex items-center gap-2">
                            <UtensilsCrossed size={13} className="text-[#D4A017]" />
                            <span>{mealPlan}</span>
                          </div>
                        ) : null}
                      </div>

                      {p.description ? (
                        <div className="mt-3 text-right">
                          <p className="text-sm leading-relaxed text-[#0B1F44]/60">
                            {p.description.length > 80
                              ? p.description.slice(0, 80) + '...'
                              : p.description}
                          </p>
                          <div className="flex justify-center mt-3">
                            <button
                              type="button"
                              onClick={() => onNavigate('package-details', undefined, p.id)}
                              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-[#D4A017] bg-[#D4A017]/15 hover:bg-[#D4A017]/25 px-5 py-2 rounded-full transition-all focus:outline-none border border-[#D4A017]/30 shadow-md hover:scale-105 active:scale-95"
                            >
                              ▼ عرض المزيد
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-4 rounded-[16px] border border-[#0B1F44]/10 bg-[#F8F9FB] p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#0B1F44]/45">ابتداءً من</p>
                        <p className="mt-1 text-xl font-black text-[#D4A017]">
                          {Number((() => {
                            if (Number(p.price) > 0) return Number(p.price);
                            const roomPrices = [p.price_double, p.price_triple, p.price_quad].filter(x => Number(x) > 0);
                            return roomPrices.length > 0 ? Math.min(...roomPrices) : 0;
                          })()).toLocaleString('ar-EG')}
                          <span className="ml-1 text-sm font-semibold text-[#0B1F44]/75">ج.م</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigate('booking', { packageId: p.id, type: p.type })}
                        className="mt-4 w-full rounded-full bg-[#D4A017] px-3 py-2.5 text-sm font-black text-[#0B1F44] shadow-[0_10px_25px_-12px_rgba(212,160,23,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#C08F0F]"
                      >
                        احجز الآن
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ===== Internal Trips ===== */}
      {internalTrips.length > 0 && (
        <section className="py-20 bg-[#F8F8FC]">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <span className="inline-flex items-center rounded-full border border-[#D4A017]/30 bg-[#D4A017]/10 px-4 py-1 text-sm font-bold text-[#D4A017]">
                رحلات داخلية مميزة
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-[#0B2345] mt-4">اكتشف أحدث الوجهات الداخلية برفاهية استثنائية</h2>
              <p className="text-[#0B2345]/60 mt-3 max-w-2xl mx-auto">
                برامج مصممة لتمنحك تجربة سفر فاخرة تجمع بين الراحة والتميز في كل محطة.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {internalTrips.map((trip) => {
                const durationDays = trip.duration
                  ? trip.duration.replace(/[^0-9]/g, '')
                  : (() => {
                      const start = new Date(trip.start_date);
                      const end = new Date(trip.end_date);
                      const diff = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                      return diff.toString();
                    })();

                return (
                  <article key={trip.id} className="group flex h-full flex-col rounded-[24px] border border-[#0B2345]/10 bg-white shadow-[0_20px_60px_-22px_rgba(11,35,69,0.28)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_80px_-18px_rgba(11,35,69,0.35)]">
                    <div className="relative m-3 mb-0 aspect-[16/9] overflow-hidden rounded-[24px]">
                      <img
                        src="https://images.pexels.com/photos/1450360/pexels-photo-1450360.jpeg?auto=compress&cs=tinysrgb&w=1200"
                        alt={trip.destination}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B2345]/95 via-[#0B2345]/20 to-transparent" />
                      <div className="absolute left-4 top-4 rounded-full bg-[#D4A017] px-3 py-1 text-[11px] font-black text-[#0B2345]">
                        {trip.destination}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-5">
                        <h3 className="text-lg font-black text-white">{trip.destination}</h3>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col p-5 pt-4">
                      <h4 className="text-lg font-black text-[#0B2345]">{trip.name}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-[#0B2345]/65 line-clamp-2">
                        {trip.hotel ? `رحلة فاخرة تشمل الإقامة في ${trip.hotel}` : 'رحلة داخلية مميزة مصممة لتمنحك تجربة سفر راقية ومريحة.'}
                      </p>

                      <div className="mt-4 space-y-2 text-sm text-[#0B2345]/70">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-[#D4A017]" />
                          <span>{durationDays} أيام</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-[#D4A017]" />
                          <span>{trip.destination}</span>
                        </div>
                      </div>

                      <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#0B2345]/10 pt-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#0B2345]/45">ابتداءً من</p>
                          <p className="mt-1 text-2xl font-black text-[#D4A017]">
                            {Number(trip.price).toLocaleString('ar-EG')}
                            <span className="ml-1 text-sm font-semibold text-[#0B2345]/70">ج.م</span>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => onNavigate('booking')}
                          className="rounded-full bg-[#D4A017] px-4 py-2 text-sm font-black text-[#0B2345] shadow-[0_10px_25px_-12px_rgba(212,160,23,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#C08F0F]"
                        >
                          احجز الآن
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <button
                onClick={() => onNavigate('internal')}
                className="text-[#D4A017] font-bold text-sm transition-colors duration-300 hover:text-[#C08F0F]"
              >
                عرض جميع الرحلات الداخلية
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ===== Offers ===== */}
      {validOffers.length > 0 && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <span className="text-gold-600 font-bold text-sm">أحدث العروض</span>
              <h2 className="text-3xl md:text-4xl font-black text-navy-900 mt-2">عروض حصرية لفترة محدودة</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {validOffers.map((o) => {
                const disc = o.discounted_price ?? (o.packages ? Math.round(Number(o.packages.price) * (1 - o.discount_percentage / 100)) : null);
                const img = o.image_url || o.packages?.image_url;
                const destination = (o as Offer & { destination?: string; city?: string; location?: string }).destination
                  || (o as Offer & { destination?: string; city?: string; location?: string }).city
                  || (o as Offer & { destination?: string; city?: string; location?: string }).location;
                const validUntil = o.end_date ? new Date(o.end_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

                return (
                  <article key={o.id} className="group flex h-full flex-col rounded-[24px] border border-[#0B1F44]/10 bg-white shadow-[0_20px_60px_-22px_rgba(11,31,68,0.28)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_80px_-18px_rgba(11,31,68,0.35)]">
                    <div className="relative m-3 mb-0 aspect-[16/9] overflow-hidden rounded-[24px]">
                      {img ? (
                        <img src={img} alt={o.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      ) : (
                        <img
                          src="https://images.pexels.com/photos/1450360/pexels-photo-1450360.jpeg?auto=compress&cs=tinysrgb&w=1200"
                          alt={o.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F44]/95 via-[#0B1F44]/20 to-transparent" />
                      <div className="absolute left-4 top-4 rounded-full bg-[#D4A017] px-3 py-1 text-[11px] font-black text-[#0B1F44] shadow-lg">
                        {o.discount_percentage}%
                      </div>
                      <div className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                        عرض لفترة محدودة
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-5">
                        <h3 className="text-lg font-black text-white">{o.name}</h3>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col p-5 pt-4">
                      {o.description && <p className="text-sm leading-relaxed text-[#0B1F44]/65">{o.description}</p>}

                      <div className="mt-4 space-y-2 text-sm text-[#0B1F44]/70">
                        {validUntil ? (
                          <div className="flex items-center gap-2">
                            <CalendarDays size={14} className="text-[#D4A017]" />
                            <span>حتى {validUntil}</span>
                          </div>
                        ) : null}
                        {destination ? (
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-[#D4A017]" />
                            <span>{destination}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-5 border-t border-[#0B1F44]/10 pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            {o.original_price != null && (
                              <p className="text-sm text-[#0B1F44]/45 line-through">{Number(o.original_price).toLocaleString('ar-EG')} ج.م</p>
                            )}
                            {disc != null && (
                              <p className="mt-1 text-2xl font-black text-[#D4A017]">
                                {Number(disc).toLocaleString('ar-EG')}
                                <span className="ml-1 text-sm font-semibold text-[#0B1F44]/70">ج.م</span>
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <button
                              type="button"
                              onClick={() => onNavigate('booking', { packageId: o.packages?.id, type: o.type || o.packages?.type })}
                              className="rounded-full bg-[#D4A017] px-4 py-2 text-sm font-black text-[#0B1F44] shadow-[0_10px_25px_-12px_rgba(212,160,23,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#C08F0F]"
                            >
                              احصل على العرض
                            </button>
                            <button
                              type="button"
                              onClick={() => onNavigate('booking', { packageId: o.packages?.id, type: o.type || o.packages?.type })}
                              className="text-sm font-semibold text-[#0B1F44]/65 transition-colors duration-300 hover:text-[#D4A017]"
                            >
                              التفاصيل
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="text-center mt-8">
              <button onClick={() => onNavigate('offers')} className="text-gold-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all mx-auto">
                عرض كل العروض <ArrowLeft size={14} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ===== Hotels ===== */}
      {hotels.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <span className="text-gold-600 font-bold text-sm">أفضل الفنادق</span>
              <h2 className="text-3xl md:text-4xl font-black text-navy-900 mt-2">إقامة فاخرة في نخبة الفنادق</h2>
              <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-sm">فنادق مصنّفة قرب الحرم الشريف وأجمل الوجهات السياحية</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {hotels.map((h) => (
                <div
                  key={h.id}
                  onClick={() => onNavigate('hotel-details', undefined, h.id)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                >
                  <div className="relative h-40 overflow-hidden bg-navy-100">
                    {h.images?.[0] ? (
                      <img src={h.images[0]} alt={h.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-navy">
                        <HotelIcon size={36} className="text-gold-400/40" />
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                      {Array.from({ length: h.stars }).map((_, i) => (
                        <Star key={i} size={10} className="text-gold-500" fill="currentColor" />
                      ))}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-navy-900 text-sm mb-1 line-clamp-1">{h.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                      <MapPin size={12} className="text-gold-600" /> {h.city}، {h.country}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-[10px] text-gray-400">من / لليلة</p>
                        <p className="font-black text-navy-900 text-sm">{Number(h.price_per_night).toLocaleString('ar-EG')} <span className="text-[10px]">ج.م</span></p>
                      </div>
                      <span className="text-gold-600 font-bold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
                        التفاصيل <ArrowLeft size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <button onClick={() => onNavigate('hotels')} className="text-gold-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all mx-auto">
                عرض كل الفنادق <ArrowLeft size={14} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ===== Why Choose Us ===== */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-gold-600 font-bold text-sm">لماذا تختارنا</span>
            <h2 className="text-3xl md:text-4xl font-black text-navy-900 mt-2">مميزات تجعلنا الخيار الأمثل</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {whyChoose.map((w) => {
              const Icon = w.icon;
              return (
                <div key={w.title} className="text-center bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-navy flex items-center justify-center text-gold-400 mx-auto mb-4">
                    <Icon size={28} />
                  </div>
                  <h3 className="font-bold text-navy-900 mb-2 text-sm">{w.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{w.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>



      {/* ===== FAQ ===== */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-gold-600 font-bold text-sm">الأسئلة الشائعة</span>
            <h2 className="text-3xl md:text-4xl font-black text-navy-900 mt-2">كل ما تحتاج معرفته</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-16 bg-gradient-navy relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 text-center text-white relative">
          <CheckCircle2 size={48} className="text-gold-400 mx-auto mb-4" />
          <h2 className="text-2xl md:text-4xl font-black mb-3">جاهز لبدء رحلتك المباركة؟</h2>
          <p className="text-white/70 mb-7 max-w-xl mx-auto">احجز الآن واستمتع بأفضل العروض على برامج الحج والعمرة والرحلات الداخلية</p>
          <button
            onClick={() => onNavigate('booking')}
            className="bg-gradient-gold text-navy-900 font-bold px-8 py-4 rounded-xl shadow-lg hover:scale-105 transition-all"
          >
            احجز رحلتك الآن
          </button>
        </div>
      </section>
    </div>
  );
}
