import type { PublicPage } from '../../components/public/WebsiteRouter';
import {
  FaqSection, PageHero, ProgramsGrid, PromiseSection, SectionHead, StepsSection, TrustBar,
} from '../../components/public/site/sections';
import { SITE } from '../../components/public/site/siteData';

interface Props {
  mode: 'about' | 'services';
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

export default function BrandInfoPage({ mode, onNavigate }: Props) {
  const quote = (program: string) => onNavigate('contact', { type: program });

  if (mode === 'services') {
    return (
      <div>
        <PageHero
          eyebrow="خدماتنا"
          title={<>برامج مصممة <em>لكل رحلة</em></>}
          lead="الحج والعمرة وفنادق مكة والمدينة والسياحة الداخلية وتذاكر الطيران. اختر البرنامج، ونرسل لك عرض سعر مفصلاً بالفندق والمسافة من الحرم ومواعيد الطيران."
          crumbs={[{ label: 'الرئيسية', page: 'home' }, { label: 'خدماتنا' }]}
          onNavigate={onNavigate}
        />
        <section className="pm-section">
          <div className="pm-wrap">
            <ProgramsGrid onQuote={quote} onNavigate={onNavigate} />
          </div>
        </section>
        <StepsSection />
        <section className="pm-section tint tight">
          <div className="pm-wrap pm-cta-band">
            <SectionHead kicker="جاهز تبدأ؟" title="اطلب عرض سعر مكتوب" />
            <div className="flex flex-wrap gap-3">
              <button type="button" className="pm-btn pm-btn-gold" onClick={() => onNavigate('booking')}>نموذج الحجز</button>
              <button type="button" className="pm-btn pm-btn-teal" onClick={() => onNavigate('contact')}>تواصل معنا</button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <PageHero
        eyebrow={`${SITE.name} · ${SITE.latin}`}
        title={<>اسمنا وعد، <em>وده التزامنا معاك</em></>}
        lead="من مكتبنا في دمياط الجديدة نرتب لك الرحلة كاملة: التأشيرة والطيران والفندق القريب من الحرم والانتقالات، بعرض سعر مكتوب وعقد رسمي."
        crumbs={[{ label: 'الرئيسية', page: 'home' }, { label: 'لماذا برومس' }]}
        onNavigate={onNavigate}
        after={(
          <TrustBar items={[
            { title: <>ترخيص <span className="pm-num">{SITE.license}</span></>, text: 'شركة مرخصة من وزارة السياحة' },
            { title: 'عقد رسمي', text: 'لكل حاج يضمن حقوقه' },
            { title: 'عرض سعر مكتوب', text: 'برقم مرجعي لكل عميل' },
            { title: 'دمياط الجديدة', text: 'مكتب تقدر تزوره وتقابلنا' },
          ]}
          />
        )}
      />
      <StepsSection />
      <PromiseSection />
      <FaqSection flush={false} />
      <section className="pm-section tint tight">
        <div className="pm-wrap pm-cta-band">
          <SectionHead kicker="تواصل معنا" title="اطلب عرض سعر" />
          <div className="flex flex-wrap gap-3">
            <button type="button" className="pm-btn pm-btn-gold" onClick={() => onNavigate('booking')}>نموذج الحجز</button>
            <button type="button" className="pm-btn pm-btn-teal" onClick={() => onNavigate('contact')}>تواصل معنا</button>
          </div>
        </div>
      </section>
    </div>
  );
}
