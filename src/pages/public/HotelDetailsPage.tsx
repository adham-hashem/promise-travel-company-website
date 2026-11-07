import { useEffect, useState } from 'react';
import { MapPin, CheckCircle2, Hotel as HotelIcon, Bed } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Hotel, Package } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';
import ShareButton from '../../components/public/ShareButton';
import PublicPackageCard from '../../components/public/PublicPackageCard';
import { Empty, Loading, PageHero, SectionHead } from '../../components/public/site/sections';
import { HotelCard, Stars } from '../../components/public/site/cards';
import { formatEGP, hotelShareUrl, waLink } from '../../components/public/site/siteData';
import { WhatsAppIcon } from '../../components/public/site/icons';

interface Props {
  hotelId: string;
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

export default function HotelDetailsPage({ hotelId, onNavigate }: Props) {
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [similar, setSimilar] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    setLoading(true);
    setActiveImg(0);
    (async () => {
      const { data } = await supabase.from('hotels').select('*').eq('id', hotelId).maybeSingle();
      setHotel((data as Hotel) || null);
      if (data) {
        const { data: pkData } = await supabase.from('package_hotels').select('packages(*)').eq('hotel_id', hotelId);
        const linked = (pkData as { packages: Package }[] | null)?.map((r) => r.packages).filter((p): p is Package => !!p && p.is_active) || [];
        setPackages(linked);
        if ((data as Hotel).city) {
          const { data: sim } = await supabase.from('hotels').select('*').eq('status', 'نشط').eq('city', (data as Hotel).city).neq('id', hotelId).limit(3);
          setSimilar((sim as Hotel[]) || []);
        }
      }
      setLoading(false);
    })();
  }, [hotelId]);

  if (loading) return <Loading />;
  if (!hotel) {
    return (
      <div className="pm-wrap pm-section">
        <Empty icon={<HotelIcon size={48} />} title="الفندق غير متاح" />
        <div className="text-center mt-5"><button type="button" className="pm-btn pm-btn-teal" onClick={() => onNavigate('hotels')}>العودة للفنادق</button></div>
      </div>
    );
  }

  const images = hotel.images?.length ? hotel.images : [];
  const base = Number(hotel.price_per_night);
  const rooms: [string, number][] = [['غرفة فردية', Math.round(base)], ['غرفة مزدوجة', Math.round(base * 1.4)], ['غرفة عائلية', Math.round(base * 2)]];

  return (
    <div>
      <PageHero
        eyebrow={`${hotel.city}${hotel.country ? `، ${hotel.country}` : ''}`}
        title={hotel.name}
        lead={hotel.address || undefined}
        crumbs={[{ label: 'الرئيسية', page: 'home' }, { label: 'الفنادق', page: 'hotels' }, { label: hotel.name }]}
        onNavigate={onNavigate}
      >
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {hotel.stars > 0 && <Stars count={hotel.stars} size={13} />}
          {hotel.category && <span className="pm-pill teal" style={{ border: '1px solid rgba(221,187,107,.4)' }}>{hotel.category}</span>}
        </div>
      </PageHero>

      {/* Gallery */}
      {images.length > 0 && (
        <section className="pm-wrap pt-8">
          <div className={`grid gap-3 ${images.length > 1 ? 'lg:grid-cols-[1fr_200px]' : ''}`}>
            <div className="pm-card-media h-[280px] md:h-[440px] rounded-[14px]">
              <img src={images[activeImg]} alt={hotel.name} />
            </div>
            {images.length > 1 && (
              <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:max-h-[440px]">
                {images.map((img, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setActiveImg(i)}
                    aria-label={`صورة ${i + 1}`}
                    aria-pressed={i === activeImg}
                    className={`flex-shrink-0 w-24 h-20 lg:w-full lg:h-24 rounded-[10px] overflow-hidden border-2 transition-all ${i === activeImg ? 'border-pm-gold-deep' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="pm-wrap py-10 grid lg:grid-cols-[1fr_340px] gap-8 items-start">
        <div className="space-y-6 min-w-0">
          {hotel.description && (
            <div className="pm-panel">
              <h3 className="mb-3">عن الفندق</h3>
              <p className="text-pm-muted">{hotel.description}</p>
            </div>
          )}

          {hotel.services?.length > 0 && (
            <div className="pm-panel">
              <h3 className="mb-4">الخدمات والمرافق</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {hotel.services.map((s) => (
                  <div key={s} className="flex items-center gap-2 rounded-[10px] border border-pm-line bg-pm-paper px-3 py-2.5 text-sm text-pm-ink">
                    <CheckCircle2 size={16} className="text-pm-gold-deep flex-none" />{s}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pm-panel">
            <h3 className="mb-4">أنواع الغرف وأسعارها</h3>
            <div className="space-y-3">
              {rooms.map(([type, price]) => (
                <div key={type} className="flex items-center justify-between gap-3 rounded-[10px] border border-pm-line px-4 py-3">
                  <div className="flex items-center gap-3"><span className="pm-ico" style={{ width: 38, height: 38 }}><Bed size={18} /></span><span className="font-semibold text-pm-teal">{type}</span></div>
                  <p className="pm-price" style={{ fontSize: 18 }}>{formatEGP(price)} <small>/ ليلة</small></p>
                </div>
              ))}
            </div>
          </div>

          <div className="pm-panel">
            <h3 className="mb-3">معلومات الإقامة</h3>
            <ul className="pm-bullets text-pm-muted" style={{ fontSize: 15 }}>
              <li>تسجيل الوصول: من الساعة 2:00 ظهراً</li>
              <li>تسجيل المغادرة: حتى الساعة 12:00 ظهراً</li>
              <li>الإفطار مشمول حسب الباقة المختارة</li>
            </ul>
          </div>

          {packages.length > 0 && (
            <div>
              <h3 className="text-2xl font-semibold text-pm-teal mb-4">الباقات المرتبطة بهذا الفندق</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {packages.map((p) => <PublicPackageCard key={p.id} p={p} onNavigate={onNavigate} compact />)}
              </div>
            </div>
          )}
        </div>

        <aside className="pm-sticky">
          <div className="pm-side">
            <p className="muted text-sm">السعر يبدأ من / لليلة</p>
            <p className="pm-price mt-1">{formatEGP(hotel.price_per_night)}</p>
            <hr />
            <div className="pm-meta" style={{ gap: 10 }}>
              <div><MapPin size={16} /> {hotel.city}{hotel.country ? `، ${hotel.country}` : ''}</div>
              {hotel.category && <div><HotelIcon size={16} /> {hotel.category}</div>}
            </div>
            <hr />
            <button type="button" onClick={() => onNavigate('booking', { type: 'فندق' })} className="pm-btn pm-btn-gold pm-btn-block">احجز الآن</button>
            <a className="pm-btn pm-btn-line pm-btn-block mt-3" href={waLink(`السلام عليكم، أريد الاستفسار عن فندق ${hotel.name}`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> اسأل عبر واتساب</a>
            <hr />
            <p className="muted text-xs mb-3">شارك هذا الفندق</p>
            <ShareButton title={hotel.name} label="مشاركة" shareUrl={hotelShareUrl(hotel.id)} />
          </div>
        </aside>
      </section>

      {similar.length > 0 && (
        <section className="pm-section tint">
          <div className="pm-wrap">
            <SectionHead kicker={hotel.city} title="فنادق مشابهة" />
            <div className="pm-grid-3">{similar.map((h) => <HotelCard key={h.id} hotel={h} onNavigate={onNavigate} />)}</div>
          </div>
        </section>
      )}
    </div>
  );
}
