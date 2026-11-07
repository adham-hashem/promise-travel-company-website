import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { PublicPage } from './WebsiteRouter';
import { SITE } from './site/siteData';

interface Props {
  currentPage: PublicPage;
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }) => void;
}

const navItems: { id: PublicPage; label: string; also?: PublicPage[] }[] = [
  { id: 'home', label: 'الرئيسية' },
  { id: 'umrah', label: 'العمرة' },
  { id: 'hajj', label: 'الحج' },
  { id: 'hotels', label: 'الفنادق', also: ['hotel-details'] },
  { id: 'internal', label: 'السياحة الداخلية' },
  { id: 'offers', label: 'العروض', also: ['offer-details'] },
  { id: 'about', label: 'لماذا برومس' },
  { id: 'contact', label: 'تواصل معنا' },
];

export default function WebsiteHeader({ currentPage, onNavigate }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  const go = (p: PublicPage) => {
    onNavigate(p);
    setMenuOpen(false);
  };

  return (
    <header ref={headerRef} className="pm-nav">
      <div className="pm-wrap">
        <button type="button" className="pm-brand" onClick={() => go('home')} aria-label={`${SITE.name} — الرئيسية`}>
          <img src={SITE.logoMark} alt="" width={40} height={40} />
          <span><b>{SITE.name}</b><small>{SITE.latin}</small></span>
        </button>

        <button
          type="button"
          className="pm-menu-btn"
          aria-label="القائمة"
          aria-expanded={menuOpen}
          aria-controls="pmNavLinks"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <ul id="pmNavLinks" className={`pm-links${menuOpen ? ' open' : ''}`}>
          {navItems.map((item) => {
            const active = currentPage === item.id || item.also?.includes(currentPage);
            return (
              <li key={item.id}>
                <button type="button" onClick={() => go(item.id)} aria-current={active ? 'page' : undefined}>{item.label}</button>
              </li>
            );
          })}
          <li className="pm-links-cta">
            <button type="button" className="pm-btn pm-btn-gold" onClick={() => go('booking')}>اطلب عرض سعر</button>
          </li>
        </ul>

        <button type="button" className="pm-btn pm-btn-gold pm-btn-sm pm-nav-cta" onClick={() => go('booking')}>اطلب عرض سعر</button>
      </div>
    </header>
  );
}
