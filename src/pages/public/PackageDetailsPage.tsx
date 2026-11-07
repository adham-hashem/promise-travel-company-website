import { useEffect, useState } from 'react';
import { Clock, Hotel as HotelIcon, Plane, Star, MapPin, CheckCircle2, Users, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { packageShareUrl } from '../../lib/share-urls';
import type { Package, Hotel } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';
import ShareButton from '../../components/public/ShareButton';
import { Empty, Loading, PageHero } from '../../components/public/site/sections';
import { CopyLink, HotelCard } from '../../components/public/site/cards';
import { formatEGP, hasAmount, waLink } from '../../components/public/site/siteData';
import { WhatsAppIcon } from '../../components/public/site/icons';

interface Props {
  packageId: string;
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

const toTextList = (value: unknown) => (Array.isArray(value)
  ? value.map((item) => String(item || '').trim()).filter(Boolean)
  : []);

export default function PackageDetailsPage({ packageId, onNavigate }: Props) {
  const [pkg, setPkg] = useState<Package | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const pkgUrl = packageShareUrl(packageId);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data } = await supabase.from('packages').select('*').eq('id', packageId).maybeSingle();
      setPkg((data as Package) || null);
      if (data) {
        const { data: phData } = await supabase.from('package_hotels').select('hotels(*)').eq('package_id', packageId);
        const linkedHotels = (phData as { hotels: Hotel }[] | null)?.map((r) => r.hotels).filter((h): h is Hotel => !!h && h.status === 'نشط') || [];
        setHotels(linkedHotels);
      }
      setLoading(false);
    })();
  }, [packageId]);

  if (loading) return <Loading />;

  if (!pkg) {
    return (
      <div className="pm-wrap pm-section">
        <Empty icon={<Plane size={48} />} title="الباقة غير متاحة" />
        <div className="text-center mt-5"><button type="button" className="pm-btn pm-btn-teal" onClick={() => onNavigate('home')}>العودة للرئيسية</button></div>
      </div>
    );
  }

  const isHajj = pkg.type === 'حج';
  const itinerary = Array.isArray(pkg.itinerary)
    ? pkg.itinerary
      .map((day, index) => ({ day: Number(day.day) || index + 1, title: day.title || '', desc: day.desc || '' }))
      .filter((day) => day.title || day.desc)
    : [];
  const includedServices = toTextList(pkg.included_services);
  const notIncluded = toTextList(pkg.excluded_services);
  const conditions = toTextList(pkg.booking_conditions);
  const prices = [
    { label: 'بالغ', value: pkg.price },
    { label: 'غرفة ثنائية', value: pkg.price_double },
    { label: 'غرفة ثلاثية', value: pkg.price_triple },
    { label: 'غرفة رباعية', value: pkg.price_quad },
    { label: 'طفل', value: pkg.price_child },
    { label: 'رضيع', value: pkg.price_infant },
  ].filter((p) => hasAmount(p.value));

  return (
    <div>
      <PageHero
        eyebrow={isHajj ? 'برنامج حج' : pkg.type === 'عمرة' ? 'برنامج عمرة' : pkg.type}
        title={pkg.name}
        lead={pkg.description || undefined}
        crumbs={[
          { label: 'الرئيسية', page: 'home' },
          { label: isHajj ? 'الحج' : 'العمرة', page: isHajj ? 'hajj' : 'umrah' },
          { label: pkg.name },
        ]}
        onNavigate={onNavigate}
      >
        {pkg.featured && <div className="mt-4"><span className="pm-pill gold"><Star size={12} fill="currentColor" /> باقة مميزة</span></div>}
      </PageHero>

      <section className="pm-wrap py-10 grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="space-y-6 min-w-0">
          {pkg.image_url && (
            <div className="pm-card-media h-[260px] md:h-[440px] rounded-[14px]">
              <img src={pkg.image_url} alt={pkg.name} />
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Clock, label: 'المدة', value: pkg.duration_days ? `${pkg.duration_days} أيام` : 'حسب البرنامج' },
              { icon: MapPin, label: 'الوجهة', value: isHajj || pkg.type === 'عمرة' ? 'مكة والمدينة' : 'حسب البرنامج' },
              { icon: HotelIcon, label: 'الفندق', value: pkg.hotel || pkg.hotel_makkah || 'حسب عرض السعر' },
              { icon: Plane, label: 'الطيران', value: pkg.airline || 'حسب عرض السعر' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="pm-panel" style={{ padding: 18 }}>
                <Icon size={20} className="text-pm-gold-deep mb-2" />
                <p className="text-xs text-pm-muted">{label}</p>
                <p className="font-semibold text-pm-teal mt-0.5 text-sm">{value}</p>
              </div>
            ))}
          </div>

          {(pkg.hotel_makkah || pkg.hotel_madinah) && (
            <div className="pm-panel">
              <h3 className="mb-3">الإقامة</h3>
              <div className="pm-meta" style={{ fontSize: 15 }}>
                {pkg.hotel_makkah && <div><HotelIcon size={16} /> مكة: {pkg.hotel_makkah}</div>}
                {pkg.hotel_madinah && <div><HotelIcon size={16} /> المدينة: {pkg.hotel_madinah}</div>}
              </div>
            </div>
          )}

          {prices.length > 0 && (
            <div className="pm-panel">
              <h3 className="mb-4">الأسعار حسب نوع الغرفة</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {prices.map((p) => <div key={p.label} className="pm-price-cell"><span>{p.label}</span><b>{formatEGP(p.value)}</b></div>)}
              </div>
            </div>
          )}

          {itinerary.length > 0 && (
            <div className="pm-panel">
              <h3 className="mb-5">البرنامج يوماً بيوم</h3>
              <ol className="space-y-4">
                {itinerary.map((day) => (
                  <li key={day.day} className="flex gap-4">
                    <span className="flex-none w-11 h-11 rounded-full border border-pm-gold text-pm-gold-deep grid place-items-center pm-display font-semibold">{day.day}</span>
                    <div className="flex-1 pb-4 border-b border-pm-line last:border-0 min-w-0">
                      <p className="pm-display text-pm-teal font-semibold mb-1">{day.title || `اليوم ${day.day}`}</p>
                      {day.desc && <p className="text-sm text-pm-muted">{day.desc}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {(includedServices.length > 0 || notIncluded.length > 0) && (
            <div className="grid md:grid-cols-2 gap-6">
              {includedServices.length > 0 && (
                <div className="pm-panel">
                  <h3 className="mb-4" style={{ fontSize: 20 }}>الخدمات المشمولة</h3>
                  <ul className="space-y-2.5">
                    {includedServices.map((s) => <li key={s} className="flex items-start gap-2 text-sm text-pm-ink"><CheckCircle2 size={16} className="text-pm-gold-deep flex-none mt-1" /> {s}</li>)}
                  </ul>
                </div>
              )}
              {notIncluded.length > 0 && (
                <div className="pm-panel">
                  <h3 className="mb-4" style={{ fontSize: 20 }}>غير مشمول</h3>
                  <ul className="space-y-2.5">
                    {notIncluded.map((s) => <li key={s} className="flex items-start gap-2 text-sm text-pm-muted"><X size={16} className="flex-none mt-1 opacity-60" /> {s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {conditions.length > 0 && (
            <div className="pm-panel">
              <h3 className="mb-3">شروط الحجز</h3>
              <ul className="pm-bullets text-pm-muted" style={{ fontSize: 15 }}>
                {conditions.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
          )}

          {hotels.length > 0 && (
            <div>
              <h3 className="text-2xl font-semibold text-pm-teal mb-4">الفنادق المرتبطة بالباقة</h3>
              <div className="pm-grid-3">{hotels.map((h) => <HotelCard key={h.id} hotel={h} onNavigate={onNavigate} />)}</div>
            </div>
          )}
        </div>

        <aside className="pm-sticky">
          <div className="pm-side">
            <p className="muted text-sm">السعر يبدأ من</p>
            <p className="pm-price mt-1">{formatEGP(pkg.price)}</p>
            <p className="muted text-xs mt-1">للشخص الواحد</p>
            <hr />
            <div className="pm-meta" style={{ gap: 10 }}>
              {pkg.duration_days ? <div><Clock size={16} /> {pkg.duration_days} أيام</div> : null}
              {pkg.hotel && <div><HotelIcon size={16} /> {pkg.hotel}</div>}
              {pkg.airline && <div><Plane size={16} /> {pkg.airline}</div>}
              <div><Users size={16} /> للأفراد والعائلات</div>
            </div>
            <hr />
            <button type="button" onClick={() => onNavigate('booking', { packageId: pkg.id, type: pkg.type })} className="pm-btn pm-btn-gold pm-btn-block">احجز الآن</button>
            <a className="pm-btn pm-btn-line pm-btn-block mt-3" href={waLink(`السلام عليكم، أريد الاستفسار عن باقة: ${pkg.name}`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> اسأل عبر واتساب</a>
            <hr />
            <p className="muted text-xs mb-3">شارك هذه الباقة</p>
            <ShareButton title={pkg.name} label="مشاركة" shareUrl={pkgUrl} />
            <div className="text-pm-on-teal-muted [&_button]:text-pm-on-teal-muted [&_button:hover]:text-pm-gold">
              <CopyLink url={pkgUrl} label="نسخ رابط الباقة" />
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
