import { useEffect, useState } from 'react';
import {
  ArrowRight, Clock, Hotel as HotelIcon, Plane, Star, MapPin,
  CheckCircle2, Loader2, MessageCircle, Users, ShieldCheck, Sparkles, Link2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { packageShareUrl } from '../../lib/share-urls';
import type { Package, Hotel } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';
import ShareButton from '../../components/public/ShareButton';

interface Props {
  packageId: string;
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

export default function PackageDetailsPage({ packageId, onNavigate }: Props) {
  const [pkg, setPkg] = useState<Package | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyToast, setCopyToast] = useState(false);
  const pkgUrl = packageShareUrl(packageId);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('packages').select('*').eq('id', packageId).maybeSingle();
      if (data) {
        setPkg(data as Package);
        const { data: phData } = await supabase.from('package_hotels').select('hotels(*)').eq('package_id', packageId);
        const linkedHotels = (phData as { hotels: Hotel }[] | null)?.map((r) => r.hotels).filter((h): h is Hotel => !!h && h.status === 'نشط') || [];
        setHotels(linkedHotels);
      }
      setLoading(false);
    })();
  }, [packageId]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 size={32} className="animate-spin text-gold-600" /></div>;
  }

  if (!pkg) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-gray-400 gap-4">
        <Plane size={56} className="opacity-30" />
        <p className="font-bold text-lg">الباقة غير متاحة</p>
        <button onClick={() => onNavigate('home')} className="text-gold-600 font-bold text-sm">العودة للرئيسية</button>
      </div>
    );
  }

  const image = pkg.image_url || (pkg.type === 'حج' ? 'https://images.pexels.com/photos/35332386/pexels-photo-35332386.jpeg?auto=compress&cs=tinysrgb&w=1600' : 'https://images.pexels.com/photos/35299546/pexels-photo-35299546.jpeg?auto=compress&cs=tinysrgb&w=1600');
  const itinerary = Array.isArray(pkg.itinerary)
    ? pkg.itinerary
        .map((day, index) => ({
          day: Number(day.day) || index + 1,
          title: day.title || '',
          desc: day.desc || '',
        }))
        .filter((day) => day.title || day.desc)
    : [];
  const toTextList = (value: unknown) => Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const includedServices = toTextList(pkg.included_services);
  const notIncluded = toTextList(pkg.excluded_services);
  const conditions = toTextList(pkg.booking_conditions);

  return (
    <div className="bg-[#fbfaf7] pb-20">
      {/* Breadcrumb */}
      <div className="bg-emerald-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 text-xs text-gray-500 flex-wrap">
          <button onClick={() => onNavigate('home')} className="hover:text-gold-600">الرئيسية</button>
          <ArrowRight size={12} className="opacity-50" />
          <button onClick={() => onNavigate(pkg.type === 'حج' ? 'hajj' : 'umrah')} className="hover:text-gold-600">{pkg.type === 'حج' ? 'برامج الحج' : 'برامج العمرة'}</button>
          <ArrowRight size={12} className="opacity-50" />
          <span className="text-emerald-950 font-semibold">{pkg.name}</span>
        </div>
      </div>

      {/* Hero image */}
      <section className="max-w-7xl mx-auto px-4 pt-6">
        <div className="relative h-[340px] md:h-[500px] rounded-[2rem] overflow-hidden">
          <img src={image} alt={pkg.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/30 to-transparent" />
          {pkg.featured && (
            <div className="absolute top-5 right-5 bg-gradient-gold text-emerald-950 text-sm font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg">
              <Star size={14} fill="currentColor" /> باقة مميزة
            </div>
          )}
          <div className="absolute top-5 left-5">
            <ShareButton title={pkg.name} compact shareUrl={pkgUrl} />
          </div>
          <div className="absolute bottom-7 right-6 left-6 text-white">
            <span className="inline-flex items-center gap-2 text-gold-300 text-sm font-bold mb-3">
              <Sparkles size={15} /> {pkg.type === 'حج' ? 'برنامج حج متكامل' : 'برنامج عمرة'}
            </span>
            <h1 className="text-3xl md:text-5xl font-black">{pkg.name}</h1>
            {pkg.description && <p className="text-white/75 mt-3 max-w-2xl text-sm md:text-base">{pkg.description}</p>}
          </div>
        </div>
      </section>

      {/* Quick info cards */}
      <section className="max-w-7xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Clock, label: 'المدة', value: pkg.duration_days ? `${pkg.duration_days} أيام` : 'حسب البرنامج' },
            { icon: MapPin, label: 'الوجهة', value: pkg.type === 'حج' || pkg.type === 'عمرة' ? 'مكة والمدينة' : 'وجهة مميزة' },
            { icon: HotelIcon, label: 'الفندق', value: pkg.hotel || 'فنادق مصنّفة' },
            { icon: Plane, label: 'الطيران', value: pkg.airline || 'خطوط مميزة' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="public-card p-5">
                <Icon size={20} className="text-gold-600 mb-3" />
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className="font-black text-emerald-950 mt-1 text-sm">{item.value}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main content + sidebar */}
      <section className="max-w-7xl mx-auto px-4 mt-8 grid lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-7">
          {/* Description */}
          <div className="public-card p-7">
            <h2 className="text-2xl font-black text-emerald-950 mb-5">تفاصيل البرنامج</h2>
            <p className="text-gray-600 leading-relaxed">
              {pkg.description || `برنامج ${pkg.type === 'حج' ? 'حج' : 'عمرة'} متكامل مع ${pkg.duration_days || ''} ${pkg.duration_days ? 'أيام' : ''} من الخدمة المميزة. نقدم لكم إقامة مريحة وخدمات نقل راقية وإشراف متخصص طوال الرحلة لضمان تجربة مطمئنة ومباركة مع Promise.`}
            </p>
          </div>

          {/* Itinerary */}
          {itinerary.length > 0 && (
            <div className="public-card p-7">
              <h2 className="text-2xl font-black text-emerald-950 mb-5">البرنامج يومًا بيوم</h2>
              <div className="space-y-4">
                {itinerary.map((day) => (
                  <div key={day.day} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-emerald text-gold-400 flex items-center justify-center font-black text-sm">
                      {day.day}
                    </div>
                    <div className="flex-1 pb-4 border-b border-gray-50 last:border-0">
                      <h3 className="font-black text-emerald-950 text-sm mb-1">اليوم {day.day}: {day.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{day.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Included / Not included */}
          {(includedServices.length > 0 || notIncluded.length > 0) && (
            <div className="grid md:grid-cols-2 gap-6">
              {includedServices.length > 0 && (
                <div className="public-card p-7">
                  <h2 className="text-lg font-black text-emerald-950 mb-5 flex items-center gap-2"><CheckCircle2 size={20} className="text-emerald-600" /> الخدمات المشمولة</h2>
                  <ul className="space-y-3">
                    {includedServices.map((s) => (
                      <li key={s} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {notIncluded.length > 0 && (
                <div className="public-card p-7">
                  <h2 className="text-lg font-black text-emerald-950 mb-5 flex items-center gap-2"><ShieldCheck size={20} className="text-gray-400" /> الخدمات غير المشمولة</h2>
                  <ul className="space-y-3">
                    {notIncluded.map((s) => (
                      <li key={s} className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Conditions */}
          {conditions.length > 0 && (
            <div className="public-card p-7">
              <h2 className="text-lg font-black text-emerald-950 mb-5">شروط الحجز</h2>
              <ul className="space-y-3 text-sm text-gray-600 leading-relaxed list-disc pr-5">
                {conditions.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
          )}

          {/* Linked hotels */}
          {hotels.length > 0 && (
            <div>
              <h2 className="text-lg font-black text-emerald-950 mb-5">الفنادق المرتبطة بالباقة</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {hotels.map((h) => (
                  <div key={h.id} onClick={() => onNavigate('hotel-details', undefined, h.id)} className="public-card overflow-hidden cursor-pointer group">
                    <div className="relative h-32 overflow-hidden bg-emerald-100">
                      {h.images?.[0] ? <img src={h.images[0]} alt={h.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-emerald"><HotelIcon size={28} className="text-gold-400/40" /></div>}
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-1.5 py-0.5 rounded-full flex items-center gap-0.5">{Array.from({ length: h.stars }).map((_, i) => <Star key={i} size={9} className="text-gold-500" fill="currentColor" />)}</div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-emerald-950 text-sm mb-1 line-clamp-1">{h.name}</h3>
                      <p className="text-xs text-gray-500"><MapPin size={11} className="inline text-gold-600 ml-1" />{h.city}، {h.country}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Booking sidebar */}
        <aside className="lg:sticky lg:top-28 h-fit">
          <div className="bg-emerald-950 rounded-[2rem] p-7 text-white shadow-xl">
            <p className="text-white/60 text-sm">السعر يبدأ من</p>
            <p className="text-4xl font-black text-gold-300 mt-1">{Number(pkg.price).toLocaleString('ar-EG')} <span className="text-sm font-medium">ج.م</span></p>
            <p className="text-white/50 text-xs mt-1">للشخص الواحد</p>

            <div className="border-t border-white/10 my-6" />

            <div className="space-y-3 text-sm mb-6">
              {pkg.duration_days && (
                <div className="flex items-center gap-2 text-white/80"><Clock size={16} className="text-gold-400" /> {pkg.duration_days} أيام</div>
              )}
              {pkg.hotel && (
                <div className="flex items-center gap-2 text-white/80"><HotelIcon size={16} className="text-gold-400" /> {pkg.hotel}</div>
              )}
              {pkg.airline && (
                <div className="flex items-center gap-2 text-white/80"><Plane size={16} className="text-gold-400" /> {pkg.airline}</div>
              )}
              <div className="flex items-center gap-2 text-white/80"><Users size={16} className="text-gold-400" /> للأفراد والعائلات</div>
            </div>

            <button
              onClick={() => onNavigate('booking', { packageId: pkg.id, type: pkg.type })}
              className="w-full bg-gradient-gold text-emerald-950 font-black py-4 rounded-xl shadow-lg hover:scale-[1.02] transition-all"
            >
              احجز الآن
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="w-full mt-3 border border-white/20 text-white font-bold py-3.5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle size={17} /> تواصل معنا
            </button>

            <div className="border-t border-white/10 mt-6 pt-5">
              <p className="text-white/60 text-xs mb-3">شارك هذه الباقة</p>
              <ShareButton title={pkg.name} label="مشاركة" shareUrl={pkgUrl} />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(pkgUrl).then(() => {
                    setCopyToast(true);
                    setTimeout(() => setCopyToast(false), 2500);
                  });
                }}
                className="w-full mt-2 flex items-center justify-center gap-1.5 text-white/60 hover:text-gold-300 font-medium text-xs py-2 rounded-lg hover:bg-white/5 transition-all"
              >
                {copyToast ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Link2 size={13} />}
                {copyToast ? 'تم نسخ رابط الباقة' : 'نسخ رابط الباقة'}
              </button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
