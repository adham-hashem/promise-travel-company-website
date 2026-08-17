import { Phone, Mail, MapPin, Facebook, Instagram, Send, Sparkles } from 'lucide-react';
import type { PublicPage } from './WebsiteRouter';

interface Props {
  onNavigate: (p: PublicPage) => void;
}

export default function WebsiteFooter({ onNavigate }: Props) {
  return (
    <footer className="bg-emerald-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <img
                src="/images/WhatsApp_Image_2026-08-16_at_6.55.03_PM.jpeg"
                alt="Promise Travel"
                className="w-14 h-14 rounded-xl object-cover shadow-md ring-1 ring-white/20"
              />
              <div className="leading-tight">
                <p className="font-black text-xl text-white">Promise</p>
                <p className="text-[10px] font-semibold tracking-wide text-gold-400">بروميس للسياحة والسفر</p>
              </div>
            </div>
            <p className="text-white/60 text-sm mt-4 leading-relaxed">
              Promise للسياحة والسفر — شريكك الموثوق في رحلات الحج والعمرة والسياحة. خبرة سنوات في خدمة ضيوف الرحمن بأعلى معايير الجودة والاحترافية.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a href="https://www.facebook.com/Promisetravil" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-gold-500 hover:text-emerald-950 transition-all">
                <Facebook size={16} />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-gold-500 hover:text-emerald-950 transition-all">
                <Instagram size={16} />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-gold-500 hover:text-emerald-950 transition-all">
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
                { id: 'about' as const, label: 'من نحن' },
                { id: 'umrah' as const, label: 'برامج العمرة' },
                { id: 'hajj' as const, label: 'برامج الحج' },
                { id: 'internal' as const, label: 'الرحلات السياحية' },
                { id: 'hotels' as const, label: 'الفنادق' },
                { id: 'offers' as const, label: 'العروض' },
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
              <li>النقل والجولات السياحية</li>
              <li>البرامج السياحية الداخلية</li>
              <li>خدمات المعتمرين VIP</li>
              <li>تنظيم رحلات الشركات</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-gold-400 mb-4 text-sm">تواصل معنا</h4>
            <ul className="space-y-3 text-white/60 text-sm">
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-gold-400" />
                <span dir="ltr">0100 123 4567</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-gold-400" />
                info@promisetravel.com
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={14} className="text-gold-400 mt-1" />
                دمياط الجديدة، المنطقة المركزية، بجوار مطعم عالفحم
              </li>
            </ul>
            <div className="mt-4 inline-flex items-center gap-1.5 text-gold-300 text-xs font-semibold bg-white/5 rounded-lg px-3 py-1.5">
              <Sparkles size={11} className="text-gold-400" />
              خبرة أكثر من 15 عاماً
            </div>
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
