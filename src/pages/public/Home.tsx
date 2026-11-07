import { useEffect, useRef, useState } from 'react';
import { Plane } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Package, Hotel } from '../../types';
import type { PublicPage } from '../../components/public/WebsiteRouter';
import PublicPackageCard from '../../components/public/PublicPackageCard';
import { SITE, waLink } from '../../components/public/site/siteData';
import { WhatsAppIcon } from '../../components/public/site/icons';
import {
  Empty, FaqSection, ProgramsGrid, PromiseSection, SectionHead, StepsSection, ViewAll,
} from '../../components/public/site/sections';
import { HotelCard, OfferCard } from '../../components/public/site/cards';
import { isOfferLive, type OfferWithPackage } from '../../components/public/site/siteData';
import QuoteContact, { type QuoteContactHandle } from '../../components/public/site/QuoteContact';

interface Props {
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

export default function Home({ onNavigate }: Props) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [offers, setOffers] = useState<OfferWithPackage[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loaded, setLoaded] = useState(false);
  const quoteRef = useRef<QuoteContactHandle>(null);

  useEffect(() => {
    (async () => {
      const [pkgs, offrs, htl] = await Promise.all([
        supabase.from('packages').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(6),
        supabase.from('offers').select('*, packages(*)').eq('is_active', true).order('created_at', { ascending: false }).limit(3),
        supabase.from('hotels').select('*').eq('status', 'نشط').order('stars', { ascending: false }).limit(4),
      ]);
      setPackages((pkgs.data as Package[]) || []);
      setOffers((offrs.data as OfferWithPackage[]) || []);
      setHotels((htl.data as Hotel[]) || []);
      setLoaded(true);
    })();
  }, []);

  const umrahPackages = packages.filter((p) => p.type === 'عمرة').slice(0, 3);
  const hajjPackages = packages.filter((p) => p.type === 'حج').slice(0, 3);
  const liveOffers = offers.filter((o) => isOfferLive(o)).slice(0, 3);
  const quote = (program: string) => quoteRef.current?.prefill(program);

  return (
    <div id="top">
      {/* ===== Hero ===== */}
      <div className="pm-hero pm-pattern">
        <div className="pm-wrap">
          <div>
            <span className="pm-eyebrow">الحج · العمرة · فنادق مكة والمدينة · السياحة الداخلية</span>
            <h1>رحلتك إلى الحرمين<br /><em>وعدٌ نلتزم به</em></h1>
            <p className="pm-lead">من مكتبنا في دمياط الجديدة نرتب لك الرحلة كاملة: التأشيرة والطيران والفندق القريب من الحرم والانتقالات، بعرض سعر مكتوب وعقد رسمي.</p>
            <div className="pm-cta-row">
              <a className="pm-btn pm-btn-gold" href={waLink()} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> احجز عبر واتساب
              </a>
              <button type="button" className="pm-btn pm-btn-line" onClick={() => scrollToId('programs')}>تصفح البرامج</button>
            </div>
          </div>
          <img className="pm-hero-mark" src={SITE.logoFull} alt={`شعار ${SITE.name}`} />
        </div>
        <div className="pm-trust">
          <div className="pm-wrap">
            <div className="pm-trust-item"><b>ترخيص <span className="pm-num">{SITE.license}</span></b><span>شركة مرخصة من وزارة السياحة</span></div>
            <div className="pm-trust-item"><b>عقد رسمي</b><span>لكل حاج يضمن حقوقه</span></div>
            <div className="pm-trust-item"><b>عرض سعر مكتوب</b><span>برقم مرجعي لكل عميل</span></div>
            <div className="pm-trust-item"><b>دمياط الجديدة</b><span>مكتب تقدر تزوره وتقابلنا</span></div>
          </div>
        </div>
      </div>

      {/* ===== Programs ===== */}
      <section id="programs" className="pm-section" style={{ scrollMarginTop: 'var(--nav-h)' }}>
        <div className="pm-wrap">
          <SectionHead kicker="خدماتنا" title="برامج مصممة لكل رحلة" text="اختر البرنامج، ونرسل لك عرض سعر مفصلاً بالفندق والمسافة من الحرم ومواعيد الطيران." />
          <ProgramsGrid onQuote={quote} onNavigate={onNavigate} />
        </div>
      </section>

      {/* ===== Umrah packages (from backend) ===== */}
      <section className="pm-section tint">
        <div className="pm-wrap">
          <SectionHead kicker="العمرة" title="برامج العمرة المتاحة" action={<ViewAll label="كل برامج العمرة" onClick={() => onNavigate('umrah')} />} />
          {loaded && umrahPackages.length === 0 ? (
            <Empty icon={<Plane size={44} />} title="ستتوفر برامج العمرة قريباً بإذن الله" text="راسلنا وسنرسل لك أقرب البرامج المتاحة." />
          ) : (
            <div className="pm-grid-3">{umrahPackages.map((p) => <PublicPackageCard key={p.id} p={p} onNavigate={onNavigate} />)}</div>
          )}
        </div>
      </section>

      {/* ===== Hajj packages (from backend) ===== */}
      <section className="pm-section pm-pattern pm-on-teal">
        <div className="pm-wrap">
          <SectionHead kicker="الحج" title="برامج الحج" text="إقامة قريبة من الحرم، انتقالات مكيفة بين المشاعر، وعقد رسمي يحفظ حقوق الحاج." action={<ViewAll label="كل برامج الحج" onClick={() => onNavigate('hajj')} />} />
          {loaded && hajjPackages.length === 0 ? (
            <Empty icon={<Plane size={44} />} title="ستتوفر برامج الحج قريباً بإذن الله" />
          ) : (
            <div className="pm-grid-3">{hajjPackages.map((p) => <PublicPackageCard key={p.id} p={p} onNavigate={onNavigate} />)}</div>
          )}
        </div>
      </section>

      {/* ===== Offers (from backend) ===== */}
      {liveOffers.length > 0 && (
        <section className="pm-section">
          <div className="pm-wrap">
            <SectionHead kicker="أحدث العروض" title="عروض لفترة محدودة" action={<ViewAll label="كل العروض" onClick={() => onNavigate('offers')} />} />
            <div className="pm-grid-3">{liveOffers.map((o) => <OfferCard key={o.id} offer={o} onNavigate={onNavigate} />)}</div>
          </div>
        </section>
      )}

      {/* ===== Hotels (from backend) ===== */}
      {hotels.length > 0 && (
        <section className={`pm-section ${liveOffers.length > 0 ? 'tint' : ''}`}>
          <div className="pm-wrap">
            <SectionHead kicker="فنادق مكة والمدينة" title="فنادق نحجزها لك" text="فنادق 4 و5 نجوم قريبة من الحرمين بأسعار مباشرة." action={<ViewAll label="كل الفنادق" onClick={() => onNavigate('hotels')} />} />
            <div className="pm-grid-4">{hotels.map((h) => <HotelCard key={h.id} hotel={h} onNavigate={onNavigate} />)}</div>
          </div>
        </section>
      )}

      <PromiseSection id="why" />
      <StepsSection id="how" />
      <FaqSection id="faq" />
      <QuoteContact ref={quoteRef} onBooking={() => onNavigate('booking')} />
    </div>
  );
}
