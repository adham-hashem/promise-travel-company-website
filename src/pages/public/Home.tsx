import { useEffect, useState } from 'react';
import {
  Plane, Moon, MapPin, Star, Hotel as HotelIcon, ArrowLeft,
  ShieldCheck, Award, Users, Headphones, Plus, Minus, Tag, Bus,
  CheckCircle2, Sparkles, Compass, Users2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Package, Offer, Hotel } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';
import ShareButton from '../../components/public/ShareButton';
import PublicPackageCard from '../../components/public/PublicPackageCard';

interface Props {
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

const heroSlides = [
  {
    img: 'https://images.pexels.com/photos/35299546/pexels-photo-35299546.jpeg?auto=compress&cs=tinysrgb&w=1920',
    place: 'مكة المكرمة',
    title: 'رحلتك تبدأ مع PROMISE',
    subtitle: 'نرتب لك رحلتك بكل تفاصيلها، من الحجز وحتى العودة، بخدمة احترافية وتجربة تستحق الثقة.',
  },
  {
    img: 'https://images.pexels.com/photos/27628044/pexels-photo-27628044.jpeg?auto=compress&cs=tinysrgb&w=1920',
    place: 'المدينة المنورة',
    title: 'سكينة الطيبة في رحاب الحبيب',
    subtitle: 'برامج زيارة مدروسة بإقامة قريبة من المسجد النبوي الشريف ومتابعة دقيقة طوال الرحلة.',
  },
  {
    img: 'https://images.pexels.com/photos/14750354/pexels-photo-14750354.jpeg?auto=compress&cs=tinysrgb&w=1920',
    place: 'وجهات سياحية مميزة',
    title: 'اكتشف العالم مع PROMISE',
    subtitle: 'رحلات منظمة إلى أجمل الوجهات العربية والعالمية بخدمة تليق بتطلعاتك.',
  },
];

const services = [
  { id: 'umrah' as const, icon: Moon, title: 'برامج العمرة', desc: 'باقات عمرة متكاملة على مدار العام بإقامة قريبة من الحرم وخدمة نقل راقية.', img: 'https://images.pexels.com/photos/35299546/pexels-photo-35299546.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { id: 'hajj' as const, icon: ShieldCheck, title: 'برامج الحج', desc: 'تنظيم هادئ لفريضة العمر بإشراف متخصص وإقامة قرب المشاعر المقدسة.', img: 'https://images.pexels.com/photos/35332386/pexels-photo-35332386.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { id: 'internal' as const, icon: Compass, title: 'الرحلات السياحية', desc: 'تجارب سياحية منظمة إلى أجمل الوجهات للأفراد والعائلات والمجموعات.', img: 'https://images.pexels.com/photos/14750354/pexels-photo-14750354.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { id: 'hotels' as const, icon: HotelIcon, title: 'الفنادق', desc: 'نخبة من الفنادق المصنّفة قرب الحرم وأجمل الوجهات بأسعار مناسبة.', img: 'https://images.pexels.com/photos/2899687/pexels-photo-2899687.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { icon: Plane, title: 'الطيران', desc: 'حجوزات تذاكر طيران مرنة على أفضل الخطوط مع أفضل الأسعار.', img: 'https://images.pexels.com/photos/2382904/pexels-photo-2382904.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { icon: Bus, title: 'النقل والجولات', desc: 'نقل مريح ومكيف بين المشاعر والوجهات مع جولات سياحية منظمة.', img: 'https://images.pexels.com/photos/35241867/pexels-photo-35241867.jpeg?auto=compress&cs=tinysrgb&w=800' },
];

const whyChoose = [
  { icon: Award, title: 'خبرة واحترافية', desc: 'فريق مرخص بخبرة سنوات في تنظيم رحلات الحج والعمرة والسياحة.' },
  { icon: Compass, title: 'برامج متنوعة', desc: 'باقات مرنة تناسب الأفراد والعائلات والمجموعات بميزانيات مختلفة.' },
  { icon: CheckCircle2, title: 'خدمة متكاملة', desc: 'من التأشيرة والإقامة والطيران حتى النقل والمتابعة في خدمة واحدة.' },
  { icon: Users, title: 'متابعة العملاء', desc: 'نبقى بقربك قبل السفر وأثناءه وبعد العودة لخدمة مستمرة.' },
  { icon: ShieldCheck, title: 'تنظيم الرحلة بالكامل', desc: 'نتولى كل تفاصيل الرحلة لتسافر مطمئناً وتعود راضياً.' },
  { icon: Headphones, title: 'دعم العملاء', desc: 'فريق دعم متاح على مدار الساعة للإجابة على استفساراتك.' },
  { icon: HotelIcon, title: 'جودة الفنادق', desc: 'فنادق مختارة بعناية تجمع بين الراحة والموقع المميز.' },
  { icon: Sparkles, title: 'اهتمام بالتفاصيل', desc: 'نهتم بكل تفصيلة صغيرة لأنها تصنع تجربة تستحق الثقة.' },
];

const destinations = [
  { name: 'مكة المكرمة', img: 'https://images.pexels.com/photos/35299546/pexels-photo-35299546.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'المدينة المنورة', img: 'https://images.pexels.com/photos/27628044/pexels-photo-27628044.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'إسطنبول', img: 'https://images.pexels.com/photos/1549326/pexels-photo-1549326.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'دبي', img: 'https://images.pexels.com/photos/14750354/pexels-photo-14750354.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'شرم الشيخ', img: 'https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'الغردقة', img: 'https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg?auto=compress&cs=tinysrgb&w=800' },
];

const travelDestinations = [
  { name: 'إسطنبول', duration: '5 أيام / 4 ليالٍ', desc: 'تمتع بسحر التاريخ والثقافة العثمانية في قارتي العالم.', img: 'https://images.pexels.com/photos/1549326/pexels-photo-1549326.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'دبي', duration: '4 أيام / 3 ليالٍ', desc: 'مدينة الفخامة والمعالم الحديثة وتجارب التسوق الفريدة.', img: 'https://images.pexels.com/photos/14750354/pexels-photo-14750354.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'شرم الشيخ', duration: '5 أيام / 4 ليالٍ', desc: 'شواطئ البحر الأحمر ومراكز الغوص والاستجمام على أجمل ساحل.', img: 'https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'الغردقة', duration: '4 أيام / 3 ليالٍ', desc: 'منتجعات فاخرة وحياه بحرية ساحرة على سحر البحر الأحمر.', img: 'https://images.pexels.com/photos/3225561/pexels-photo-3225561.jpeg?auto=compress&cs=tinysrgb&w=800' },
];

const faqs = [
  { q: 'كيف يمكنني الحجز؟', a: 'يمكنك الحجز مباشرة من خلال زر "احجز رحلتك" على موقعنا، أو التواصل معنا هاتفياً وسيقوم فريقنا بمساعدتك.' },
  { q: 'هل تشمل الباقات تذاكر الطيران؟', a: 'نعم، جميع باقات الحج والعمرة تشمل تذاكر الطيران ذهاباً وعودة، كما تشمل الإقامة والنقل والتأشيرات.' },
  { q: 'هل يمكنني الدفع على دفعات؟', a: 'نعم، نوفر نظام دفع مرن يتيح لك دفع جزء من المبلغ عند الحجز والباقي قبل موعد السفر بفترة كافية.' },
  { q: 'هل توفرون مرشدين سياحيين؟', a: 'نعم، نوفر مرشدين متخصصين يتحدثون العربية والإنجليزية طوال فترة الرحلة لضمان تجربة مريحة وممتعة.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all hover:shadow-md">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-right hover:bg-emerald-50/40 transition-colors">
        <span className="font-bold text-emerald-950 text-sm">{q}</span>
        <span className="text-gold-600 flex-shrink-0 mr-3">{open ? <Minus size={18} /> : <Plus size={18} />}</span>
      </button>
      {open && <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed animate-fadeIn">{a}</div>}
    </div>
  );
}

export default function Home({ onNavigate }: Props) {
  const [slide, setSlide] = useState(0);
  const [packages, setPackages] = useState<Package[]>([]);
  const [offers, setOffers] = useState<(Offer & { packages?: Package })[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % heroSlides.length), 6000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: pkgs } = await supabase.from('packages').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(6);
      setPackages((pkgs as Package[]) || []);
      const { data: offrs } = await supabase.from('offers').select('*, packages(*)').eq('is_active', true).order('created_at', { ascending: false }).limit(3);
      setOffers((offrs as (Offer & { packages?: Package })[]) || []);
      const { data: htl } = await supabase.from('hotels').select('*').eq('status', 'نشط').order('stars', { ascending: false }).limit(4);
      setHotels((htl as Hotel[]) || []);
    })();
  }, []);

  const umrahPackages = packages.filter((p) => p.type === 'عمرة').slice(0, 3);
  const hajjPackages = packages.filter((p) => p.type === 'حج').slice(0, 3);
  const today = new Date().toISOString().split('T')[0];
  const validOffers = offers.filter((o) => o.end_date >= today && o.start_date <= today).slice(0, 3);

  return (
    <div>
      {/* ===== Hero Slider ===== */}
      <section className="relative h-[90vh] min-h-[620px] overflow-hidden">
        {heroSlides.map((s, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === slide ? 'opacity-100' : 'opacity-0'}`}>
            <img src={s.img} alt={s.place} className="w-full h-full object-cover" />
            <div className="absolute inset-0 public-hero-overlay" />
          </div>
        ))}
        <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-center items-center text-center text-white">
          <span className="inline-flex items-center gap-2 bg-gold-500/20 backdrop-blur border border-gold-400/30 text-gold-300 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 animate-fadeIn">
            <Sparkles size={12} /> {heroSlides[slide].place}
          </span>
          <h1 className="text-3xl md:text-6xl font-black mb-5 leading-tight max-w-4xl animate-fadeIn">{heroSlides[slide].title}</h1>
          <p className="text-white/80 text-base md:text-xl mb-9 max-w-2xl animate-fadeIn">{heroSlides[slide].subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-3 animate-fadeIn">
            <button onClick={() => onNavigate('umrah')} className="public-btn-gold px-8 py-3.5">استكشف برامجنا</button>
            <button onClick={() => onNavigate('booking')} className="border-2 border-white/40 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-all">احجز رحلتك</button>
          </div>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {heroSlides.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} className={`h-2 rounded-full transition-all ${i === slide ? 'bg-gold-400 w-8' : 'bg-white/40 w-2'}`} />
          ))}
        </div>
      </section>

      {/* ===== Umrah Packages ===== */}
      <PackageSection title="برامج العمرة" eyebrow="عمرة" packages={umrahPackages} onNavigate={onNavigate} viewAllPage="umrah" />

      {/* ===== Hajj Packages ===== */}
      <section className="py-20 bg-emerald-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url(https://images.pexels.com/photos/35332386/pexels-photo-35332386.jpeg?auto=compress&cs=tinysrgb&w=1600)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="text-center mb-12">
            <span className="text-gold-400 font-bold text-sm">حج</span>
            <h2 className="text-3xl md:text-4xl font-black mt-3">برامج الحج المتكاملة</h2>
            <p className="text-white/60 mt-3 max-w-2xl mx-auto text-sm">تصميم فخم وهادئ يعكس طبيعة الحج، بإقامة قرب المشاعر وإشراف متخصص.</p>
          </div>
          {hajjPackages.length === 0 ? (
            <div className="text-center py-12"><p className="text-white/60">ستتوفر برامج الحج قريباً بإذن الله</p></div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {hajjPackages.map((p) => <PublicPackageCard key={p.id} p={p} onNavigate={onNavigate} dark />)}
            </div>
          )}
          <div className="text-center mt-10">
            <button onClick={() => onNavigate('hajj')} className="border-2 border-gold-400/60 text-gold-300 font-bold px-7 py-3 rounded-xl hover:bg-gold-500 hover:text-emerald-950 transition-all flex items-center gap-2 mx-auto">عرض جميع برامج الحج <ArrowLeft size={15} /></button>
          </div>
        </div>
      </section>

      {/* ===== Services ===== */}
      <section className="py-20 bg-[#fbfaf7]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="public-eyebrow">خدماتنا</span>
            <h2 className="public-heading mt-3">باقة متكاملة من الخدمات السياحية</h2>
            <p className="text-gray-500 mt-3 max-w-2xl mx-auto">نقدم لك كل ما تحتاجه لرحلة مريحة ومباركة، من تأشيرات الحج والعمرة إلى الرحلات السياحية والإقامة.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} onClick={() => s.id && onNavigate(s.id)} className={`group public-card overflow-hidden ${s.id ? 'cursor-pointer' : ''}`}>
                  <div className="relative h-44 overflow-hidden">
                    <img src={s.img} alt={s.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 to-transparent" />
                    <div className="absolute bottom-4 right-4 w-12 h-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-lg"><Icon size={22} className="text-emerald-950" /></div>
                    <h3 className="absolute bottom-5 left-5 text-white font-black text-lg">{s.title}</h3>
                  </div>
                  <div className="p-5">
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">{s.desc}</p>
                    {s.id && <span className="inline-flex items-center gap-1 text-gold-600 font-bold text-sm group-hover:gap-2 transition-all">اعرف المزيد <ArrowLeft size={14} /></span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Travel Destinations ===== */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="public-eyebrow">الرحلات السياحية</span>
            <h2 className="public-heading mt-3">وجهات تستحق الاكتشاف</h2>
            <p className="text-gray-500 mt-3 max-w-2xl mx-auto">رحلات منظمة إلى أجمل الوجهات العربية والعالمية بخدمات تليق بك.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {travelDestinations.map((d) => (
              <div key={d.name} className="group public-card overflow-hidden cursor-pointer" onClick={() => onNavigate('internal')}>
                <div className="relative h-64 overflow-hidden">
                  <img src={d.img} alt={d.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/30 to-transparent" />
                  <div className="absolute bottom-0 right-0 left-0 p-5 text-white">
                    <h3 className="text-xl font-black mb-1">{d.name}</h3>
                    <p className="text-gold-300 text-xs font-semibold mb-2">{d.duration}</p>
                    <p className="text-white/75 text-xs leading-relaxed line-clamp-2">{d.desc}</p>
                    <span className="inline-flex items-center gap-1 text-gold-300 font-bold text-xs mt-3 group-hover:gap-2 transition-all">استكشف الرحلة <ArrowLeft size={12} /></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => onNavigate('internal')} className="public-btn-outline px-7 py-3">عرض جميع الرحلات</button>
          </div>
        </div>
      </section>

      {/* ===== Offers ===== */}
      {validOffers.length > 0 && (
        <section className="py-20 bg-[#fbfaf7]">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <span className="public-eyebrow">أحدث العروض</span>
              <h2 className="public-heading mt-3">عروض حصرية لفترة محدودة</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {validOffers.map((o) => {
                const disc = o.discounted_price ?? (o.packages ? Math.round(Number(o.packages.price) * (1 - o.discount_percentage / 100)) : null);
                const img = o.image_url || o.packages?.image_url;
                const offerType = o.type || o.packages?.type || 'عمرة';
                return (
                  <div key={o.id} className="public-card overflow-hidden relative cursor-pointer group" onClick={() => onNavigate('offer-details', undefined, o.id)}>
                    <div className="absolute top-4 right-4 z-10 bg-gradient-to-l from-red-600 to-red-500 text-white font-black px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 text-sm"><Tag size={13} />{o.discount_percentage}%</div>
                    <div className="absolute top-4 left-4 z-10" onClick={(e) => e.stopPropagation()}><ShareButton title={o.name} compact shareUrl={`${window.location.origin}/#offer/${o.id}`} /></div>
                    <div className="relative h-44 overflow-hidden bg-emerald-100">
                      {img ? <img src={img} alt={o.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <Tag size={48} className="text-gold-400/40 m-auto" />}
                    </div>
                    <div className="p-5">
                      <h3 className="font-black text-emerald-950 text-lg mb-2">{o.name}</h3>
                      {o.description && <p className="text-gray-500 text-xs mb-3 line-clamp-2">{o.description}</p>}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 mb-3">
                        <div>
                          {o.original_price != null && <p className="text-xs text-gray-400 line-through">{Number(o.original_price).toLocaleString('ar-EG')} ج.م</p>}
                          {disc != null && <p className="font-black text-red-600 text-lg">{Number(disc).toLocaleString('ar-EG')} ج.م</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); onNavigate('offer-details', undefined, o.id); }}
                          className="flex-1 bg-emerald-950 text-white font-bold text-xs px-3 py-2.5 rounded-xl hover:bg-emerald-900 transition-all"
                        >عرض التفاصيل</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onNavigate('booking', { packageId: o.package_id || o.packages?.id, type: offerType }); }}
                          className="flex-1 bg-gradient-gold text-emerald-950 font-bold text-xs px-3 py-2.5 rounded-xl hover:shadow-lg transition-all"
                        >احجز الآن</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-8"><button onClick={() => onNavigate('offers')} className="text-gold-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all mx-auto">عرض كل العروض <ArrowLeft size={14} /></button></div>
          </div>
        </section>
      )}

      {/* ===== Family Discount Banner ===== */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl">
            <img src="https://images.pexels.com/photos/8623377/pexels-photo-8623377.jpeg?auto=compress&cs=tinysrgb&w=1920" alt="خصم العائلات" className="w-full h-[400px] md:h-[420px] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-l from-emerald-950/95 via-emerald-950/60 to-transparent" />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-lg px-6 md:px-12">
                <span className="inline-flex items-center gap-2 bg-gold-500 text-emerald-950 font-black px-4 py-1.5 rounded-full text-xs mb-4 shadow-lg">
                  <Tag size={13} /> عرض خاص
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">خصم خاص للعائلات</h2>
                <p className="text-white/85 text-sm md:text-base leading-relaxed mb-6">
                  استمتعوا برحلة لا تُنسى مع كل أفراد العائلة — خصومات حصرية على الحجوزات العائلية لباقات الحج والعمرة والرحلات السياحية.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => onNavigate('booking')}
                    className="inline-flex items-center gap-2 bg-gradient-gold text-emerald-950 font-black px-7 py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  >
                    <CheckCircle2 size={18} /> احجز الآن
                  </button>
                  <ShareButton title="خصم خاص للعائلات — Promise للسياحة والسفر" />
                </div>
                <div className="flex items-center gap-2 mt-5 text-white/70 text-xs">
                  <Users2 size={16} className="text-gold-400" />
                  <span>كل ما عليك هو ذكر أن الحجز عائلي عند التواصل معنا</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Hotels ===== */}
      {hotels.length > 0 && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <span className="public-eyebrow">أفضل الفنادق</span>
              <h2 className="public-heading mt-3">إقامة فاخرة في نخبة الفنادق</h2>
              <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-sm">فنادق مصنّفة قرب الحرم الشريف وأجمل الوجهات السياحية.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {hotels.map((h) => (
                <div key={h.id} onClick={() => onNavigate('hotel-details', undefined, h.id)} className="public-card overflow-hidden cursor-pointer group">
                  <div className="relative h-40 overflow-hidden bg-emerald-100">
                    {h.images?.[0] ? <img src={h.images[0]} alt={h.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-emerald"><HotelIcon size={36} className="text-gold-400/40" /></div>}
                    <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">{Array.from({ length: h.stars }).map((_, i) => <Star key={i} size={10} className="text-gold-500" fill="currentColor" />)}</div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-emerald-950 text-sm mb-1 line-clamp-1">{h.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3"><MapPin size={12} className="text-gold-600" /> {h.city}، {h.country}</div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div><p className="text-[10px] text-gray-400">من / لليلة</p><p className="font-black text-emerald-950 text-sm">{Number(h.price_per_night).toLocaleString('ar-EG')} <span className="text-[10px]">ج.م</span></p></div>
                      <span className="text-gold-600 font-bold text-xs flex items-center gap-1 group-hover:gap-2 transition-all">التفاصيل <ArrowLeft size={12} /></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-8"><button onClick={() => onNavigate('hotels')} className="text-gold-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all mx-auto">عرض كل الفنادق <ArrowLeft size={14} /></button></div>
          </div>
        </section>
      )}

      {/* ===== About Us ===== */}
      <section className="py-20 bg-[#fbfaf7]">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="public-eyebrow">من نحن</span>
            <h2 className="public-heading mt-3 mb-5">Promise للسياحة والسفر</h2>
            <p className="text-gray-600 leading-relaxed mb-4">نكرّس جهودنا لخدمة ضيوف الرحمن والمسافرين من كل مكان. نقدم برامج حج وعمرة ورحلات متكاملة، بإشراف نخبة من المتخصصين، وحرص على أدق التفاصيل لضمان رحلة مطمئنة ومباركة.</p>
            <p className="text-gray-600 leading-relaxed mb-6">نعمل بشفافية كاملة، ونهتم برضا عملائنا قبل أي شيء آخر. فريقنا متاح على مدار الساعة لخدمتك في كل خطوة من رحلتك.</p>
            <div className="grid grid-cols-3 gap-4">
              {[['15+', 'سنوات خبرة'], ['25K+', 'عميل سعيد'], ['100%', 'رضا العملاء']].map(([value, label]) => (
                <div key={label} className="text-center bg-white rounded-2xl p-4 shadow-sm border border-gray-100"><p className="text-2xl font-black text-gold-600">{value}</p><p className="text-xs text-gray-500 mt-1">{label}</p></div>
              ))}
            </div>
          </div>
          <div className="relative">
            <img src="https://images.pexels.com/photos/35241867/pexels-photo-35241867.jpeg?auto=compress&cs=tinysrgb&w=1000" alt="Promise Travel" className="rounded-3xl shadow-2xl w-full h-[420px] object-cover" />
            <div className="absolute -bottom-5 -right-5 bg-gradient-gold text-emerald-950 rounded-2xl p-5 shadow-xl"><Award size={28} className="mb-1" /><p className="font-black text-sm">جودة معتمدة</p><p className="text-xs">وزارة السياحة</p></div>
          </div>
        </div>
      </section>

      {/* ===== Why Choose Us ===== */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="public-eyebrow">لماذا PROMISE؟</span>
            <h2 className="public-heading mt-3">مميزات تجعلنا الخيار الأمثل</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {whyChoose.map((w) => {
              const Icon = w.icon;
              return (
                <div key={w.title} className="public-card p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-emerald flex items-center justify-center text-gold-400 mx-auto mb-4"><Icon size={28} /></div>
                  <h3 className="font-bold text-emerald-950 mb-2 text-sm">{w.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{w.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Destinations ===== */}
      <section className="py-20 bg-[#fbfaf7]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="public-eyebrow">وجهاتنا</span>
            <h2 className="public-heading mt-3">وجهات نأخذك إليها</h2>
            <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-sm">من المشاعر المقدسة إلى أجمل الوجهات السياحية.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {destinations.map((d) => (
              <div key={d.name} className="group relative h-40 rounded-2xl overflow-hidden cursor-pointer" onClick={() => onNavigate('hotels')}>
                <img src={d.img} alt={d.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 to-transparent" />
                <p className="absolute bottom-3 right-3 left-3 text-white font-black text-sm text-center">{d.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-20 bg-[#fbfaf7]">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12"><span className="public-eyebrow">الأسئلة الشائعة</span><h2 className="public-heading mt-3">كل ما تحتاج معرفته</h2></div>
          <div className="space-y-3">{faqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}</div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 bg-gradient-emerald relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url(https://images.pexels.com/photos/35299546/pexels-photo-35299546.jpeg?auto=compress&cs=tinysrgb&w=1600)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="max-w-7xl mx-auto px-4 text-center text-white relative">
          <CheckCircle2 size={48} className="text-gold-400 mx-auto mb-4" />
          <h2 className="text-2xl md:text-4xl font-black mb-3">جاهز تبدأ رحلتك؟</h2>
          <p className="text-white/70 mb-7 max-w-xl mx-auto">دع PROMISE ترتب لك كل تفاصيل رحلتك.</p>
          <button onClick={() => onNavigate('booking')} className="public-btn-gold px-8 py-4">احجز رحلتك الآن</button>
        </div>
      </section>
    </div>
  );
}

function PackageSection({ title, eyebrow, packages, onNavigate, viewAllPage }: { title: string; eyebrow: string; packages: Package[]; onNavigate: Props['onNavigate']; viewAllPage: PublicPage }) {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <span className="public-eyebrow">{eyebrow}</span>
            <h2 className="public-heading mt-3">{title}</h2>
          </div>
          <button onClick={() => onNavigate(viewAllPage)} className="text-gold-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">عرض الكل <ArrowLeft size={14} /></button>
        </div>
        {packages.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><Plane size={48} className="mx-auto mb-3 opacity-30" /><p className="font-medium">ستتوفر البرامج قريباً بإذن الله</p></div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">{packages.map((p) => <PublicPackageCard key={p.id} p={p} onNavigate={onNavigate} />)}</div>
        )}
      </div>
    </section>
  );
}
