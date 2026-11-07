import type { PublicPage } from '../../components/public/WebsiteRouter';
import { PageHero } from '../../components/public/site/sections';
import QuoteContact from '../../components/public/site/QuoteContact';
import { SITE, programFromType, typeFromProgram, waLink } from '../../components/public/site/siteData';
import { WhatsAppIcon } from '../../components/public/site/icons';

interface Props {
  preset?: { packageId?: string; type?: string };
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }, id?: string) => void;
}

export default function ContactPage({ preset, onNavigate }: Props) {
  return (
    <div>
      <PageHero
        eyebrow="مكتبنا في دمياط الجديدة"
        title={<>تواصل <em>معنا</em></>}
        lead={<>راسلنا على واتساب أو اتصل بأحد أرقامنا، أو زورنا في {SITE.address}. ترخيص وزارة السياحة رقم <span className="pm-num">{SITE.license}</span>.</>}
        crumbs={[{ label: 'الرئيسية', page: 'home' }, { label: 'تواصل معنا' }]}
        onNavigate={onNavigate}
      >
        <div className="pm-cta-row">
          <a className="pm-btn pm-btn-gold" href={waLink()} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> راسلنا على واتساب</a>
          <a className="pm-btn pm-btn-line" href={`tel:+2${SITE.phones[0]}`}>اتصل: <span className="pm-num">{SITE.phones[0]}</span></a>
        </div>
      </PageHero>
      <QuoteContact
        initialProgram={programFromType(preset?.type)}
        onBooking={() => {
          const type = typeFromProgram(preset?.type);
          onNavigate('booking', type ? { type, packageId: preset?.packageId } : undefined);
        }}
      />
    </div>
  );
}
