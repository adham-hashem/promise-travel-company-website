import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, MapPin, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { offerShareUrl } from '../../lib/share-urls';
import type { PublicPage } from '../../components/public/WebsiteRouter';
import ShareButton from '../../components/public/ShareButton';
import { Empty, Loading, PageHero } from '../../components/public/site/sections';
import { formatEGP, offerPricing, waLink, type OfferWithPackage } from '../../components/public/site/siteData';
import { WhatsAppIcon } from '../../components/public/site/icons';

interface Props {
  offerId: string;
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

export default function OfferDetailsPage({ offerId, onNavigate }: Props) {
  const [offer, setOffer] = useState<OfferWithPackage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase.from('offers').select('*, packages(*)').eq('id', offerId).maybeSingle().then(({ data }) => {
      setOffer(data as OfferWithPackage | null);
      setLoading(false);
    });
  }, [offerId]);

  if (loading) return <Loading />;
  if (!offer) {
    return (
      <div className="pm-wrap pm-section">
        <Empty icon={<Tag size={48} />} title="العرض غير متاح حالياً" />
        <div className="text-center mt-5"><button type="button" className="pm-btn pm-btn-teal" onClick={() => onNavigate('offers')}>العودة إلى العروض</button></div>
      </div>
    );
  }

  const pkg = offer.packages;
  const { original, discounted } = offerPricing(offer);
  const image = offer.image_url || pkg?.image_url;
  const type = offer.type || pkg?.type || 'رحلة سياحية';
  const url = offerShareUrl(offer.id);

  return (
    <div>
      <PageHero
        eyebrow={type}
        title={offer.name}
        lead={offer.description || undefined}
        crumbs={[{ label: 'الرئيسية', page: 'home' }, { label: 'العروض', page: 'offers' }, { label: offer.name }]}
        onNavigate={onNavigate}
      >
        <div className="mt-4"><span className="pm-pill gold" style={{ fontSize: 15, padding: '4px 14px' }}><Tag size={14} /> خصم {offer.discount_percentage}%</span></div>
      </PageHero>

      <section className="pm-wrap py-10 grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="space-y-6 min-w-0">
          {image && (
            <div className="pm-card-media h-[260px] md:h-[420px] rounded-[14px]">
              <img src={image} alt={offer.name} />
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: Clock3, label: 'المدة', value: pkg?.duration_days ? `${pkg.duration_days} أيام` : 'حسب البرنامج' },
              { icon: MapPin, label: 'الوجهة', value: type === 'حج' || type === 'عمرة' ? 'مكة والمدينة' : 'حسب البرنامج' },
              { icon: CalendarDays, label: 'صلاحية العرض', value: `حتى ${new Date(offer.end_date).toLocaleDateString('ar-EG')}` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="pm-panel" style={{ padding: 20 }}>
                <Icon size={20} className="text-pm-gold-deep mb-2" />
                <p className="text-xs text-pm-muted">{label}</p>
                <p className="font-semibold text-pm-teal mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          <div className="pm-panel">
            <h3 className="mb-3">تفاصيل البرنامج</h3>
            <p className="text-pm-muted">{offer.description || 'تواصل مع فريقنا لمعرفة الجدول اليومي والتفاصيل المناسبة لاحتياجاتك، ونرسل لك عرض سعر مكتوباً برقم مرجعي.'}</p>
            {pkg && (
              <button type="button" className="pm-link mt-4" onClick={() => onNavigate('package-details', undefined, pkg.id)}>عرض تفاصيل الباقة المرتبطة ←</button>
            )}
          </div>

          <div className="pm-panel">
            <h3 className="mb-3">شروط الحجز</h3>
            <ul className="pm-bullets text-pm-muted" style={{ fontSize: 15 }}>
              <li>يتم تأكيد الحجز بعد مراجعة البيانات والتواصل مع فريق برومس.</li>
              <li>الأسعار قابلة للتحديث حسب التوافر ومواعيد السفر.</li>
              <li>تطبق الشروط الخاصة بالبرنامج كما هي موضحة في عرض السعر.</li>
            </ul>
          </div>
        </div>

        <aside className="pm-sticky">
          <div className="pm-side">
            <p className="muted text-sm">السعر الخاص يبدأ من</p>
            {original != null && discounted != null && <p className="pm-price-old mt-1">{formatEGP(original)}</p>}
            {discounted != null ? <p className="pm-price mt-1">{formatEGP(discounted)}</p> : <p className="pm-price mt-1" style={{ fontSize: 26 }}>تواصل معنا</p>}
            <hr />
            <button type="button" onClick={() => onNavigate('booking', { packageId: pkg?.id, type: offer.type || pkg?.type })} className="pm-btn pm-btn-gold pm-btn-block">احجز الآن</button>
            <a className="pm-btn pm-btn-line pm-btn-block mt-3" href={waLink(`السلام عليكم، أريد الاستفسار عن عرض: ${offer.name}`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> اسأل عبر واتساب</a>
            <hr />
            <p className="muted text-xs mb-3">شارك هذا العرض</p>
            <ShareButton title={offer.name} label="مشاركة" shareUrl={url} />
          </div>
        </aside>
      </section>
    </div>
  );
}
