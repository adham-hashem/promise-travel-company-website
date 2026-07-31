import { Phone, MapPin, Facebook, Instagram, Send } from 'lucide-react';
import Logo from './Logo';
import type { PublicPage } from './WebsiteRouter';

interface Props {
  onNavigate: (p: PublicPage) => void;
}

export default function WebsiteFooter({ onNavigate }: Props) {
  return (
    <footer className="bg-navy-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <Logo size={56} withText variant="light" />
            <p className="text-white/60 text-sm mt-4 leading-relaxed">
              Promise للسياحة والسفر — شريكك الموثوق في رحلات الحج والعمرة والسياحة الداخلية. خبرة سنوات في خدمة ضيوف الرحمن.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a href="https://www.facebook.com/Promisetravil" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-gold-500 hover:text-navy-900 transition-all">
                <Facebook size={16} />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-gold-500 hover:text-navy-900 transition-all">
                <Instagram size={16} />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-gold-500 hover:text-navy-900 transition-all">
                <Send size={16} />
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-bold text-gold-400 mb-4 text-sm">روابط سريعة</h4>
            <ul className="space-y-2.5">
              {[
                { id: 'home' as const, label: 'الرئيسية' },
                { id: 'hajj' as const, label: 'برامج الحج' },
                { id: 'umrah' as const, label: 'برامج العمرة' },
                { id: 'internal' as const, label: 'الرحلات الداخلية' },
                { id: 'hotels' as const, label: 'الفنادق' },
                { id: 'offers' as const, label: 'العروض' },
                { id: 'booking' as const, label: 'الحجز' },
                { id: 'contact' as const, label: 'تواصل معنا' },
              ].map((l) => (
                <li key={l.id}>
                  <button onClick={() => onNavigate(l.id)} className="text-white/60 hover:text-gold-300 text-sm transition-colors">
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-bold text-gold-400 mb-4 text-sm">خدماتنا</h4>
            <ul className="space-y-2.5 text-white/60 text-sm">
              <li>تأشيرات الحج والعمرة</li>
              <li>حجوزات الفنادق والطيران</li>
              <li>النقل والمواصلات</li>
              <li>البرامج السياحية الداخلية</li>
              <li>خدمات المعتمرين VIP</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-gold-400 mb-4 text-sm">تواصل معنا</h4>
            <ul className="space-y-3 text-white/60 text-sm">
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-gold-400" />
                <a href="tel:01011106989" dir="ltr" className="transition-colors hover:text-gold-300">01011106989</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-gold-400" />
                <a href="tel:01055503857" dir="ltr" className="transition-colors hover:text-gold-300">01055503857</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={14} className="text-gold-400 mt-1" />
                <span>New Damietta, Central District, Next to Al Alfahm Restaurant, Egypt</span>
              </li>
              <li className="pt-1 text-white/50">نخدم عملاءنا في جميع محافظات مصر.</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-white/40 text-xs">© 2026 Promise Travel. جميع الحقوق محفوظة.</p>
          <p className="text-white/40 text-xs">تصميم وتطوير فريق Promise</p>
        </div>
      </div>
    </footer>
  );
}
