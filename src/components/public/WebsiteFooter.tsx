import type { PublicPage } from './WebsiteRouter';
import { SITE } from './site/siteData';

interface Props {
  onNavigate: (p: PublicPage) => void;
}

const links: { id: PublicPage; label: string }[] = [
  { id: 'home', label: 'الرئيسية' },
  { id: 'umrah', label: 'برامج العمرة' },
  { id: 'hajj', label: 'برامج الحج' },
  { id: 'hotels', label: 'الفنادق' },
  { id: 'internal', label: 'السياحة الداخلية' },
  { id: 'offers', label: 'العروض' },
  { id: 'services', label: 'خدماتنا' },
  { id: 'about', label: 'لماذا برومس' },
  { id: 'booking', label: 'نموذج الحجز' },
  { id: 'contact', label: 'تواصل معنا' },
];

export default function WebsiteFooter({ onNavigate }: Props) {
  return (
    <footer className="pm-footer pm-pattern">
      <div className="pm-wrap">
        <div className="pm-footer-main">
          <img src={SITE.logoFull} alt={SITE.name} width={110} />
          <div>
            <div className="tag">{SITE.tagline}</div>
            <p>الحج والعمرة وفنادق الحرمين والسياحة الداخلية وتذاكر الطيران.</p>
          </div>
          <button type="button" className="pm-btn pm-btn-gold" onClick={() => onNavigate('booking')}>اطلب عرض سعر</button>
        </div>
        <ul className="pm-footer-links" aria-label="روابط الموقع">
          {links.map((l) => <li key={l.id}><button type="button" onClick={() => onNavigate(l.id)}>{l.label}</button></li>)}
        </ul>
      </div>
      <div className="pm-legal">
        <a href={SITE.facebook} target="_blank" rel="noopener noreferrer">فيسبوك</a>
        {' · '}
        <a href={SITE.instagram} target="_blank" rel="noopener noreferrer">إنستجرام</a>
        {' · © '}<span className="pm-num">{new Date().getFullYear()}</span> {SITE.name} · ترخيص وزارة السياحة رقم <span className="pm-num">{SITE.license}</span>
      </div>
    </footer>
  );
}
