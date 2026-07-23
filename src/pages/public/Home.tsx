import { useEffect, useState } from 'react';
import {
  Plane, Moon, MapPin, Star, Clock, Hotel as HotelIcon, ArrowLeft,
  ShieldCheck, Award, Users, Headphones, Plus, Minus, Tag,
  CheckCircle2, Quote, Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Package, Offer, Hotel } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';

interface Props {
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, hotelId?: string) => void;
}

const heroSlides = [
  {
    img: 'https://images.pexels.com/photos/1620168/pexels-photo-1620168.jpeg?auto=compress&cs=tinysrgb&w=1920',
    place: 'مكة المكرمة',
    title: 'ابدأ رحلتك الإيمانية معنا',
    subtitle: 'رحلات حج وعمرة وسياحة داخلية بأعلى جودة',
  },
  {
    img: 'https://images.pexels.com/photos/934879/pexels-photo-934879.jpeg?auto=compress&cs=tinysrgb&w=1920',
    place: 'المدينة المنورة',
    title: 'زيارة المسجد النبوي الشريف',
    subtitle: 'أياماً من الطمأنينة والسكينة في رحاب الحبيب',
  },
  {
    img: 'https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg?auto=compress&cs=tinysrgb&w=1920',
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
    img: 'https://images.pexels.com/photos/1620168/pexels-photo-1620168.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 'umrah' as const,
    icon: Plane,
    title: 'العمرة',
    desc: 'عمرة مريحة على مدار العام بأفضل الفنادق القريبة من الحرم، وأسعار تنافسية، وخدمات نقل راقية من وإلى المطار.',
    img: 'https://images.pexels.com/photos/934879/pexels-photo-934879.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 'internal' as const,
    icon: MapPin,
    title: 'الرحلات الداخلية',
    desc: 'اكتشف جمال مصر من شرم الشيخ والغردقة والأقصر وأسوان، برامج سياحية مصممة بعناية لراحتك وإمتاعك.',
    img: 'https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 'hotels' as const,
    icon: HotelIcon,
    title: 'الفنادق',
    desc: 'نخبة من الفنادق المصنّفة قرب الحرم الشريف وأجمل الوجهات السياحية، باقات إقامة فاخرة بأسعار مناسبة.',
    img: 'https://images.pexels.com/photos/2029722/pexels-photo-2029722.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
];

const whyChoose = [
  { icon: ShieldCheck, title: 'موثوق ومرخص', desc: 'محترفون مرخصون رسمياً من وزارة السياحة' },
  { icon: Award, title: 'جودة عالية', desc: 'خدمة متميزة بأعلى المعايير العالمية' },
  { icon: Users, title: 'فريق متخصص', desc: 'مستشارون ذوو خبرة في خدمة الضيوف' },
  { icon: Headphones, title: 'دعم 24/7', desc: 'فريق دعم متواصل طوال أيام الأسبوع' },
];

const testimonials = [
  { name: 'محمود السيد', text: 'تجربة رائعة من البداية للنهاية، الفندق ممتاز وقريب من الحرم والخدمة احترافية. شكراً Promise.', role: 'معتمر', stars: 5 },
  { name: 'أم عبد الله', text: 'أرسلت أبي للحج عن طريقهم وكنت مطمئنة طوال الرحلة. متابعة مستمرة وخدمة راقية. رزقكم الله البركة.', role: 'حاج', stars: 5 },
  { name: 'عائلة العمري', text: 'رحلة شرم الشيخ كانت ممتعة جداً، التنظيم ممتاز والفندق فخم. تعامل راقي جداً مع الجميع.', role: 'سائح', stars: 5 },
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
  const [offers, setOffers] = useState<(Offer & { packages?: Package })[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);

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
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-900/70 to-navy-900/30" />
          </div>
        ))}

        <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-center items-center text-center text-white">
          <span className="inline-flex items-center gap-2 bg-gold-500/20 backdrop-blur border border-gold-400/30 text-gold-300 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 animate-fadeIn">
            <Sparkles size={12} />
            {heroSlides[slide].place}
          </span>
          <h1 className="text-3xl md:text-6xl font-black mb-4 leading-tight max-w-4xl animate-fadeIn">
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
              src="https://images.pexels.com/photos/2382904/pexels-photo-2382904.jpeg?auto=compress&cs=tinysrgb&w=1000"
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
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-gold-600 font-bold text-sm">خدماتنا</span>
            <h2 className="text-3xl md:text-4xl font-black text-navy-900 mt-2">
              باقة متكاملة من الخدمات السياحية
            </h2>
            <p className="text-gray-500 mt-3 max-w-2xl mx-auto">
              نقدم لك كل ما تحتاجه لرحلة مريحة ومباركة، من تأشيرات الحج والعمرة إلى الرحلات السياحية الداخلية
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.id}
                  onClick={() => onNavigate(s.id)}
                  className="group bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img src={s.img} alt={s.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 to-transparent" />
                    <div className="absolute bottom-4 right-4 w-12 h-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-lg">
                      <Icon size={22} className="text-navy-900" />
                    </div>
                    <h3 className="absolute bottom-5 left-5 text-white font-black text-lg">{s.title}</h3>
                  </div>
                  <div className="p-5">
                    <p className="text-gray-600 text-xs leading-relaxed mb-4">{s.desc}</p>
                    <span className="inline-flex items-center gap-1 text-gold-600 font-bold text-sm group-hover:gap-2 transition-all">
                      اعرف المزيد <ArrowLeft size={14} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Featured Packages ===== */}
      <section className="py-20 bg-navy-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url(https://images.pexels.com/photos/1620168/pexels-photo-1620168.jpeg?auto=compress&cs=tinysrgb&w=1500)', backgroundSize: 'cover' }} />
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="text-center mb-12">
            <span className="text-gold-400 font-bold text-sm">باقات مميزة</span>
            <h2 className="text-3xl md:text-4xl font-black mt-2">استكشف باقاتنا الأكثر طلباً</h2>
          </div>

          {display.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/60">ستتوفر الباقات قريباً بإذن الله</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {display.map((p) => (
                <div key={p.id} className="bg-white rounded-3xl overflow-hidden shadow-lg group hover:scale-[1.02] transition-all">
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={p.image_url || 'https://images.pexels.com/photos/1620168/pexels-photo-1620168.jpeg?auto=compress&cs=tinysrgb&w=800'}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {p.featured && (
                      <span className="absolute top-3 right-3 bg-gradient-gold text-navy-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <Star size={10} fill="currentColor" /> مميزة
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-black text-navy-900 text-lg mb-3">{p.name}</h3>
                    <div className="space-y-2 text-xs text-gray-600 mb-4">
                      {p.duration_days && (
                        <div className="flex items-center gap-2"><Clock size={13} className="text-gold-600" /> {p.duration_days} يوم</div>
                      )}
                      {p.hotel && (
                        <div className="flex items-center gap-2"><HotelIcon size={13} className="text-gold-600" /> {p.hotel}</div>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-400">ابتداءً من</p>
                        <p className="font-black text-navy-900 text-lg">{Number(p.price).toLocaleString('ar-EG')} <span className="text-xs font-medium">ج.م</span></p>
                      </div>
                      <button
                        onClick={() => onNavigate('booking', { packageId: p.id, type: p.type })}
                        className="bg-gradient-gold text-navy-900 font-bold text-xs px-4 py-2 rounded-xl hover:shadow-lg transition-all"
                      >
                        احجز الآن
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== Offers ===== */}
      {validOffers.length > 0 && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <span className="text-gold-600 font-bold text-sm">أحدث العروض</span>
              <h2 className="text-3xl md:text-4xl font-black text-navy-900 mt-2">عروض حصرية لفترة محدودة</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {validOffers.map((o) => {
                const disc = o.discounted_price ?? (o.packages ? Math.round(Number(o.packages.price) * (1 - o.discount_percentage / 100)) : null);
                const img = o.image_url || o.packages?.image_url;
                return (
                  <div key={o.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl hover:-translate-y-1 transition-all relative">
                    <div className="absolute top-4 right-4 z-10 bg-gradient-to-l from-red-600 to-red-500 text-white font-black px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 text-sm">
                      <Tag size={13} />
                      {o.discount_percentage}%
                    </div>
                    <div className="relative h-44 overflow-hidden bg-gradient-navy flex items-center justify-center">
                      {img ? (
                        <img src={img} alt={o.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <Tag size={48} className="text-gold-400/40" />
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-black text-navy-900 text-lg mb-2">{o.name}</h3>
                      {o.description && <p className="text-gray-500 text-xs mb-3 line-clamp-2">{o.description}</p>}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div>
                          {o.original_price != null && <p className="text-xs text-gray-400 line-through">{Number(o.original_price).toLocaleString('ar-EG')} ج.م</p>}
                          {disc != null && <p className="font-black text-red-600 text-lg">{Number(disc).toLocaleString('ar-EG')} ج.م</p>}
                        </div>
                        <button
                          onClick={() => onNavigate('booking', { packageId: o.packages?.id, type: o.type || o.packages?.type })}
                          className="bg-gradient-gold text-navy-900 font-bold text-xs px-4 py-2 rounded-xl hover:shadow-lg transition-all"
                        >
                          احصل على العرض
                        </button>
                      </div>
                    </div>
                  </div>
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

      {/* ===== Testimonials ===== */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-gold-600 font-bold text-sm">آراء عملائنا</span>
            <h2 className="text-3xl md:text-4xl font-black text-navy-900 mt-2">قصص نجاح حقيقية</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative">
                <Quote size={36} className="text-gold-200 absolute top-5 left-5" />
                <div className="flex items-center gap-1 mb-4 relative">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={16} className="text-gold-500" fill="currentColor" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4 relative">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-11 h-11 rounded-full bg-gradient-navy flex items-center justify-center text-gold-400 font-black">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-navy-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
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
