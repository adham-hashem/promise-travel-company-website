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
      <div className="bg-navy-950 text-white/75 text-xs py-2 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <a href="tel:01011106989" dir="ltr" className="flex items-center gap-2 transition-colors hover:text-gold-300">
              <Phone size={12} className="text-gold-400" />
              <span>01011106989</span>
            </a>
            <a href="tel:01055503857" dir="ltr" className="flex items-center gap-2 transition-colors hover:text-gold-300">
              <Phone size={12} className="text-gold-400" />
              <span>01055503857</span>
            </a>
          </div>
          <span className="text-gold-300 font-semibold tracking-wide">نخدم عملاءنا في جميع محافظات مصر.</span>
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
          <button onClick={() => handleNavigate('home')} className="flex-shrink-0 flex items-center gap-2 sm:gap-3 group">
            <img
              src="/WhatsApp_Image_2026-06-20_at_4.57.54_PM.jpeg"
              alt="Promise Travel"
              className="object-contain bg-transparent rounded-none shadow-none ring-0"
              style={{ width: '78px', height: '78px' }}
            />
            <div className="leading-none text-right flex flex-col justify-center">
              <p className="font-black text-base sm:text-lg text-navy-900">Promise</p>
              <p className="hidden sm:block text-[10px] font-semibold tracking-wide text-gold-600">بروميس للسياحة والسفر</p>
            </div>
          </button>

          {/* Desktop nav — centered */}
          <nav className="hidden lg:flex items-center gap-0.5 mx-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
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
              </button>
            ))}
          </nav>

          {/* CTA — left side in RTL (desktop only) */}
          <div className="hidden lg:block flex-shrink-0">
            <button
              onClick={() => handleNavigate('booking')}
              className="bg-gradient-gold text-navy-900 font-black text-sm px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
              احجز الآن
            </button>
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
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`px-4 py-3.5 rounded-xl text-right text-sm font-bold transition-all flex items-center justify-between ${
                  currentPage === item.id ? 'bg-navy-800 text-white' : 'text-navy-800 hover:bg-navy-50'
                }`}
              >
                {item.label}
                <ChevronLeft size={16} className="opacity-40" />
              </button>
            ))}
            <button
              onClick={() => handleNavigate('booking')}
              className="mt-2 bg-gradient-gold text-navy-900 font-black text-sm px-5 py-3.5 rounded-xl text-center shadow-md"
            >
              احجز الآن
            </button>
          </nav>
        </div>
      </header>
    </>
  );
}
