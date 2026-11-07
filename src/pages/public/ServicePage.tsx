import { useEffect, useState } from 'react';
import { Plane } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Package } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';
import PublicPackageCard from '../../components/public/PublicPackageCard';
import { Empty, Loading, PageHero, SectionHead, TrustBar, ViewAll } from '../../components/public/site/sections';
import { waLink } from '../../components/public/site/siteData';
import { WhatsAppIcon } from '../../components/public/site/icons';

interface Props {
  type: 'حج' | 'عمرة';
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

const copy = {
  'حج': {
    eyebrow: 'مكة المكرمة والمشاعر المقدسة',
    title: <>برامج الحج <em>بعقد رسمي</em></>,
    lead: 'برامج الحج السياحي بإقامة قريبة من الحرم وإشراف ديني ومتابعة من فريقنا خلال المناسك. يُسدد مبلغ البرنامج كاملاً عند التعاقد، ويوقع الحاج عقداً رسمياً يضمن حقوقه.',
    features: [
      { title: 'فنادق قريبة', text: 'من الحرم المكي' },
      { title: 'انتقالات مكيفة', text: 'بين المشاعر' },
      { title: 'إشراف ديني', text: 'ومتابعة خلال المناسك' },
      { title: 'عقد رسمي', text: 'يحفظ حقوق الحاج' },
    ],
    quote: 'السلام عليكم، أريد عرض سعر لبرنامج الحج من برومس للسياحة',
  },
  'عمرة': {
    eyebrow: 'مكة المكرمة والمدينة المنورة',
    title: <>رحلات العمرة <em>على مدار العام</em></>,
    lead: 'برامج رمضان والمولد ونصف العام، بمستويات فنادق مختلفة قريبة من الحرمين، مع التأشيرة والطيران ذهاباً وعودة وزيارة المدينة المنورة.',
    features: [
      { title: 'فنادق قريبة', text: 'من الحرمين' },
      { title: 'تأشيرة وطيران', text: 'ذهاباً وعودة' },
      { title: 'زيارة المدينة', text: 'المنورة' },
      { title: 'عرض سعر مكتوب', text: 'برقم مرجعي' },
    ],
    quote: 'السلام عليكم، أريد عرض سعر لبرنامج عمرة من برومس للسياحة',
  },
} as const;

export default function ServicePage({ type, onNavigate }: Props) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const c = copy[type];

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data } = await supabase.from('packages').select('*').eq('is_active', true).eq('type', type).order('created_at', { ascending: false });
      setPackages((data as Package[]) || []);
      setLoading(false);
    })();
  }, [type]);

  return (
    <div>
      <PageHero
        eyebrow={c.eyebrow}
        title={c.title}
        lead={c.lead}
        crumbs={[{ label: 'الرئيسية', page: 'home' }, { label: type === 'حج' ? 'الحج' : 'العمرة' }]}
        onNavigate={onNavigate}
        after={<TrustBar items={c.features.map((f) => ({ title: f.title, text: f.text }))} />}
      >
        <div className="pm-cta-row">
          <a className="pm-btn pm-btn-gold" href={waLink(c.quote)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> اطلب عرض سعر</a>
          <button type="button" className="pm-btn pm-btn-line" onClick={() => onNavigate('booking', { type })}>نموذج الحجز</button>
        </div>
      </PageHero>

      <section className="pm-section">
        <div className="pm-wrap">
          <SectionHead
            kicker={type === 'حج' ? 'الحج' : 'العمرة'}
            title={`باقات ${type === 'حج' ? 'الحج' : 'العمرة'} المتاحة`}
            text="اختر الباقة المناسبة، والأسعار موضحة لكل نوع غرفة."
            action={<ViewAll label="العروض الحالية" onClick={() => onNavigate('offers')} />}
          />
          {loading ? (
            <Loading />
          ) : packages.length === 0 ? (
            <Empty icon={<Plane size={44} />} title="لا توجد باقات متاحة حالياً" text="سيتم إضافتها قريباً بإذن الله، ويمكنك طلب عرض سعر عبر واتساب." />
          ) : (
            <div className="pm-grid-3">
              {packages.map((p) => <PublicPackageCard key={p.id} p={p} onNavigate={onNavigate} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
