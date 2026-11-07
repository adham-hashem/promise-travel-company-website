import { useEffect, useState } from 'react';
import { MapPin, Hotel, Users, Calendar, Plane } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { InternalTrip } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';
import ShareButton from '../../components/public/ShareButton';
import { Empty, Loading, PageHero, SectionHead } from '../../components/public/site/sections';
import { formatEGP, waLink } from '../../components/public/site/siteData';
import { WhatsAppIcon } from '../../components/public/site/icons';

interface Props {
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }) => void;
}

export default function InternalPage({ onNavigate }: Props) {
  const [trips, setTrips] = useState<InternalTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('internal_trips').select('*').eq('status', 'متاحة').order('start_date', { ascending: true });
      setTrips((data as InternalTrip[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <PageHero
        eyebrow="شرم الشيخ · الغردقة · الأقصر وأسوان"
        title={<>السياحة <em>الداخلية</em></>}
        lead="رحلات عائلية ورحلات شركات داخل مصر، بفنادق مختارة وبرنامج واضح من أول يوم لآخر يوم."
        crumbs={[{ label: 'الرئيسية', page: 'home' }, { label: 'السياحة الداخلية' }]}
        onNavigate={onNavigate}
      >
        <div className="pm-cta-row">
          <a className="pm-btn pm-btn-gold" href={waLink('السلام عليكم، أريد برنامج رحلة داخلية من برومس للسياحة')} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> اطلب برنامج رحلة</a>
        </div>
      </PageHero>

      <section className="pm-section">
        <div className="pm-wrap">
          <SectionHead kicker="رحلات قادمة" title="الرحلات المتاحة" text="المقاعد محدودة في كل رحلة، والأسعار للفرد." />
          {loading ? (
            <Loading />
          ) : trips.length === 0 ? (
            <Empty icon={<Plane size={44} />} title="لا توجد رحلات متاحة حالياً" text="راسلنا ونرتب لك برنامجاً خاصاً لعائلتك أو شركتك." />
          ) : (
            <div className="pm-grid-3">
              {trips.map((t) => {
                const seatPct = t.total_seats > 0 ? Math.round((t.available_seats / t.total_seats) * 100) : 0;
                return (
                  <article key={t.id} className="pm-card flex flex-col">
                    <div className="pm-card-media pm-pattern h-40">
                      <div className="pm-media-fallback"><MapPin size={46} /></div>
                      <span className="pm-pill glass absolute bottom-3 right-3"><MapPin size={12} /> {t.destination}</span>
                      <div className="absolute top-3 left-3"><ShareButton title={t.name} compact /></div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col gap-3">
                      <div>
                        <h3 className="text-xl">{t.name}</h3>
                        {t.duration && <p className="text-sm text-pm-muted">{t.duration}</p>}
                      </div>
                      <div className="pm-meta">
                        {t.hotel && <div><Hotel size={14} /> {t.hotel}</div>}
                        <div><Calendar size={14} /> {new Date(t.start_date).toLocaleDateString('ar-EG')} ← {new Date(t.end_date).toLocaleDateString('ar-EG')}</div>
                        <div><Users size={14} /> مقاعد متاحة: {t.available_seats} / {t.total_seats}</div>
                      </div>
                      <div className="h-1.5 rounded-full bg-pm-line overflow-hidden" aria-hidden="true">
                        <div className={`h-full rounded-full ${seatPct > 20 ? 'bg-pm-teal-3' : 'bg-pm-gold-deep'}`} style={{ width: `${seatPct}%` }} />
                      </div>
                      <div className="mt-auto pt-3 pm-divider flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[12px] text-pm-muted">السعر للفرد</p>
                          <p className="pm-price">{formatEGP(t.price)}</p>
                        </div>
                        <button type="button" onClick={() => onNavigate('booking', { type: 'داخلي' })} className="pm-btn pm-btn-gold pm-btn-sm">احجز مقعدك</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
