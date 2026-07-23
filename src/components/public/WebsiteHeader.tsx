import { useEffect, useRef, useState } from 'react';
import { Menu, X, Phone, ChevronLeft } from 'lucide-react';
import Logo from './Logo';
import type { PublicPage, NavigateProps } from './WebsiteRouter';

interface Props {
  currentPage: PublicPage;
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }) => void;
}

const navItems: { id: PublicPage; label: string }[] = [
  { id: 'home', label: 'الرئيسية' },
  { id: 'hajj', label: 'الحج' },
  { id: 'umrah', label: 'العمرة' },
  { id: 'internal', label: 'الرحلات الداخلية' },
  { id: 'hotels', label: 'الفنادق' },
  { id: 'offers', label: 'العروض' },
  { id: 'booking', label: 'الحجز' },
  { id: 'contact', label: 'تواصل معنا' },
];

const PAGE_URLS: Record<PublicPage, string> = {
  home: '/',
  hajj: '/hajj',
  umrah: '/umrah',
  internal: '/internal',
  hotels: '/hotels',
  'hotel-details': '/hotels',
  offers: '/offers',
  booking: '/booking',
  contact: '/contact',
};

export default function WebsiteHeader({ currentPage, onNavigate }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleNavigate = (p: PublicPage) => {
    onNavigate(p);
    setMenuOpen(false);
  };

  return (
    <>
      {/* Top bar */}
      <div className="bg-navy-950 text-white/70 text-xs py-2 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Phone size={12} className="text-gold-400" />
            <span dir="ltr">+20 100 123 4567</span>
          </span>
          <span className="text-gold-300 font-semibold tracking-wide">رحلتك المباركة تبدأ من Promise</span>
        </div>
      </div>

      <header
        ref={headerRef}
        className="sticky top-0 z-50 bg-white transition-all duration-300"
        style={{
          boxShadow: scrolled ? '0 12px 30px -8px rgba(12, 34, 79, 0.18)' : '0 1px 3px rgba(0,0,0,0.06)',
          borderBottom: scrolled ? '1px solid rgba(212,160,23,0.15)' : '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-20">
          {/* Logo — right side in RTL */}
          <a href="/" onClick={(e) => { e.preventDefault(); handleNavigate('home'); }} className="flex-shrink-0 flex items-center gap-2.5 group">
            <img
              src="/WhatsApp_Image_2026-06-20_at_4.57.54_PM.jpeg"
              alt="Promise Travel"
              className="w-12 h-12 rounded-xl object-cover shadow-md ring-1 ring-gold-200/40 group-hover:ring-gold-400 transition-all"
            />
            <div className="leading-tight text-right hidden sm:block">
              <p className="font-black text-lg text-navy-900">Promise</p>
              <p className="text-[10px] font-semibold tracking-wide text-gold-600">بروميس للسياحة والسفر</p>
            </div>
          </a>

          {/* Desktop nav — centered */}
          <nav className="hidden lg:flex items-center gap-0.5 mx-auto">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={PAGE_URLS[item.id]}
                onClick={(e) => { e.preventDefault(); handleNavigate(item.id); }}
                className={`px-3.5 py-2 rounded-xl text-sm font-bold transition-all duration-200 relative ${
                  currentPage === item.id
                    ? 'text-gold-600'
                    : 'text-navy-800 hover:text-gold-600'
                }`}
              >
                {item.label}
                {currentPage === item.id && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-gold rounded-full" />
                )}
              </a>
            ))}
          </nav>

          {/* CTA — left side in RTL (desktop only) */}
          <div className="hidden lg:block flex-shrink-0">
            <a
              href="/booking"
              onClick={(e) => { e.preventDefault(); handleNavigate('booking'); }}
              className="bg-gradient-gold text-navy-900 font-black text-sm px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
              احجز الآن
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 rounded-xl text-navy-800 hover:bg-navy-50 transition-colors flex-shrink-0"
            aria-label="القائمة"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

        {/* Mobile slide-down menu */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out bg-white border-t border-gray-100 ${
            menuOpen ? 'max-h-[32rem] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="flex flex-col p-3 gap-1">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={PAGE_URLS[item.id]}
                onClick={(e) => { e.preventDefault(); handleNavigate(item.id); }}
                className={`px-4 py-3.5 rounded-xl text-right text-sm font-bold transition-all flex items-center justify-between ${
                  currentPage === item.id ? 'bg-navy-800 text-white' : 'text-navy-800 hover:bg-navy-50'
                }`}
              >
                {item.label}
                <ChevronLeft size={16} className="opacity-40" />
              </a>
            ))}
            <a
              href="/booking"
              onClick={(e) => { e.preventDefault(); handleNavigate('booking'); }}
              className="mt-2 bg-gradient-gold text-navy-900 font-black text-sm px-5 py-3.5 rounded-xl text-center shadow-md"
            >
              احجز الآن
            </a>
          </nav>
        </div>
      </header>
    </>
  );
}
