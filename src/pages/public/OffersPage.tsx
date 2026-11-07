import { useEffect, useState } from 'react';
import { Tag, Clock, ArrowLeft, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Package } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';
import { Empty, Loading, PageHero } from '../../components/public/site/sections';
import { OfferCard } from '../../components/public/site/cards';
import { formatEGP, isOfferLive, offerPricing, type OfferWithPackage } from '../../components/public/site/siteData';

interface Props {
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

type Tab = 'all' | 'hajj-umrah' | 'travel' | 'hotels' | 'special';

const tabs: { id: Tab; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'hajj-umrah', label: 'حج وعمرة' },
  { id: 'travel', label: 'رحلات داخلية' },
  { id: 'hotels', label: 'فنادق' },
  { id: 'special', label: 'عروض خاصة' },
];

function matchesTab(o: OfferWithPackage & { packages?: Package }, tab: Tab): boolean {
  if (tab === 'all') return true;
  const t = o.type || o.packages?.type;
  if (tab === 'hajj-umrah') return t === 'حج' || t === 'عمرة';
  if (tab === 'travel') return t === 'داخلي';
  if (tab === 'hotels') return !!o.packages?.hotel && (t !== 'حج' && t !== 'عمرة');
  if (tab === 'special') return o.discount_percentage >= 20;
  return true;
}

export default function OffersPage({ onNavigate }: Props) {
  const [offers, setOffers] = useState<OfferWithPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('offers').select('*, packages(*)').eq('is_active', true).order('created_at', { ascending: false });
      setOffers((data as OfferWithPackage[]) || []);
      setLoading(false);
    })();
  }, []);

  const valid = offers.filter((o) => isOfferLive(o));
  const featured = valid.find((o) => o.discount_percentage >= 20);
  const filtered = valid.filter((o) => matchesTab(o, tab));
  const featuredPricing = featured ? offerPricing(featured) : null;

  return (
    <div>
      <PageHero
        eyebrow="عروض لفترة محدودة"
        title={<>عروض <em>برومس</em></>}
        lead="خصومات على برامج الحج والعمرة والرحلات الداخلية والفنادق. كل عرض له تاريخ انتهاء واضح."
        crumbs={[{ label: 'الرئيسية', page: 'home' }, { label: 'العروض' }]}
        onNavigate={onNavigate}
      />

      {featured && featuredPricing && (
        <section className="pm-section tight tint">
          <div className="pm-wrap">
            <span className="pm-kicker flex items-center gap-1.5"><Star size={14} fill="currentColor" /> عرض مميز</span>
            <article
              className="pm-card grid md:grid-cols-2 mt-3"
              role="link"
              tabIndex={0}
              onClick={() => onNavigate('offer-details', undefined, featured.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') onNavigate('offer-details', undefined, featured.id); }}
            >
              <div className="pm-card-media min-h-[260px]">
                {featured.image_url || featured.packages?.image_url
                  ? <img src={featured.image_url || featured.packages?.image_url} alt={featured.name} className="absolute inset-0" />
                  : <div className="pm-media-fallback pm-pattern"><Tag size={56} /></div>}
                <span className="pm-pill gold absolute top-4 right-4" style={{ fontSize: 16, padding: '5px 14px' }}>خصم {featured.discount_percentage}%</span>
              </div>
              <div className="p-7 md:p-9 flex flex-col justify-center gap-3">
                <h2 className="text-3xl font-bold text-pm-teal">{featured.name}</h2>
                {featured.description && <p className="text-pm-muted">{featured.description}</p>}
                <div className="pm-meta"><div><Clock size={14} /> ينتهي في {new Date(featured.end_date).toLocaleDateString('ar-EG')}</div></div>
                <div className="flex items-end gap-4 flex-wrap">
                  {featuredPricing.original != null && featuredPricing.discounted != null && <p className="pm-price-old" style={{ fontSize: 16 }}>{formatEGP(featuredPricing.original)}</p>}
                  {featuredPricing.discounted != null && <p className="pm-price" style={{ fontSize: 32 }}>{formatEGP(featuredPricing.discounted)}</p>}
                </div>
                <button type="button" className="pm-btn pm-btn-gold w-fit mt-2" onClick={(e) => { e.stopPropagation(); onNavigate('offer-details', undefined, featured.id); }}>
                  عرض التفاصيل <ArrowLeft size={16} />
                </button>
              </div>
            </article>
          </div>
        </section>
      )}

      <section className="pm-section tight">
        <div className="pm-wrap">
          <div className="pm-tabs mb-8" role="tablist" aria-label="تصنيف العروض">
            {tabs.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>

          {loading ? (
            <Loading />
          ) : filtered.length === 0 ? (
            <Empty icon={<Tag size={44} />} title="لا توجد عروض متاحة في هذا التصنيف حالياً" text="تابعنا قريباً لعروض جديدة بإذن الله." />
          ) : (
            <div className="pm-grid-3">
              {filtered.map((o) => <OfferCard key={o.id} offer={o} onNavigate={onNavigate} withCopy />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
