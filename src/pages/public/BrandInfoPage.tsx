import { Award, CheckCircle2, Headphones, Plane, ShieldCheck, Sparkles, Users } from 'lucide-react';
import type { PublicPage } from '../../components/public/WebsiteRouter';

interface Props {
  mode: 'about' | 'services';
  onNavigate: (p: PublicPage, preset?: { packageId?: string; type?: string }) => void;
}

const serviceCards = [
  { icon: Sparkles, title: 'برامج العمرة', text: 'باقات عمرة متكاملة تشمل الإقامة والنقل والتأشيرة مع متابعة دقيقة في كل خطوة.' },
  { icon: ShieldCheck, title: 'برامج الحج', text: 'تنظيم هادئ وآمن لفريضة العمر، بإشراف متخصص وخدمات مصممة لراحة ضيوف الرحمن.' },
  { icon: Plane, title: 'الطيران والنقل', text: 'حجوزات طيران مرنة ونقل مريح من وإلى المطارات وبين أهم الوجهات.' },
  { icon: Award, title: 'الفنادق والإقامة', text: 'اختيارات موثوقة من الفنادق القريبة والمميزة، لتستمتع بإقامة تليق برحلتك.' },
  { icon: Users, title: 'الرحلات السياحية', text: 'تجارب سياحية منظمة إلى أجمل الوجهات العربية والعالمية للأفراد والعائلات.' },
  { icon: Headphones, title: 'الدعم والمتابعة', text: 'فريق Promise بجانبك قبل الرحلة وأثناءها وبعد العودة، بإجابة سريعة واهتمام حقيقي.' },
];

const values = ['خبرة واحترافية', 'برامج متنوعة', 'خدمة متكاملة', 'متابعة مستمرة', 'اهتمام بالتفاصيل', 'جودة موثوقة'];

export default function BrandInfoPage({ mode, onNavigate }: Props) {
  const isAbout = mode === 'about';
  return (
    <div>
      <section className="relative min-h-[420px] overflow-hidden bg-emerald-950">
        <img
          src={isAbout ? 'https://images.pexels.com/photos/19042360/pexels-photo-19042360.jpeg?auto=compress&cs=tinysrgb&w=1600' : 'https://images.pexels.com/photos/14750354/pexels-photo-14750354.jpeg?auto=compress&cs=tinysrgb&w=1600'}
          alt={isAbout ? 'من نحن في Promise' : 'خدمات Promise'}
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 public-hero-overlay" />
        <div className="relative max-w-7xl mx-auto px-4 py-28 text-white">
          <span className="inline-flex items-center gap-2 text-gold-300 text-sm font-bold mb-5"><Sparkles size={14} /> Promise للسياحة والسفر</span>
          <h1 className="text-4xl md:text-6xl font-black mb-5">{isAbout ? 'نصنع للرحلة معنى أجمل' : 'كل تفاصيل رحلتك في مكان واحد'}</h1>
          <p className="max-w-2xl text-white/80 text-lg leading-relaxed">{isAbout ? 'نرافقك بخبرة واهتمام من لحظة اختيار البرنامج وحتى عودتك، لتعيش رحلة مطمئنة تستحق الثقة.' : 'خدمات متكاملة للحج والعمرة والسياحة والإقامة، مصممة بعناية لتمنحك راحة أكبر وتجربة أرقى.'}</p>
        </div>
      </section>

      {isAbout ? (
        <>
          <section className="py-20 bg-[#fbfaf7]">
            <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-[1fr_0.9fr] gap-14 items-center">
              <div>
                <span className="public-eyebrow">من نحن</span>
                <h2 className="public-heading mt-3 mb-6">رحلات مدروسة، خدمة صادقة، وذكريات تبقى</h2>
                <p className="public-body mb-5">في PROMISE نؤمن أن الرحلة الناجحة تبدأ من التفاصيل الصغيرة. لذلك نجمع بين الخبرة في تنظيم رحلات الحج والعمرة والسياحة، وبين فريق قريب منك يستمع لاحتياجاتك ويقترح الأنسب لك.</p>
                <p className="public-body mb-8">نقدم برامج واضحة، خيارات إقامة موثوقة، ومتابعة مستمرة تجعل قرار السفر أبسط وأكثر اطمئناناً، سواء كنت تسافر بمفردك أو مع عائلتك أو ضمن مجموعة.</p>
                <div className="grid grid-cols-3 gap-3">
                  {[['15+', 'عاماً من الخبرة'], ['25K+', 'مسافر سعيد'], ['24/7', 'دعم ومتابعة']].map(([value, label]) => (
                    <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm"><p className="text-2xl font-black text-gold-600">{value}</p><p className="text-xs text-gray-500 mt-1">{label}</p></div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <img src="https://images.pexels.com/photos/35241867/pexels-photo-35241867.jpeg?auto=compress&cs=tinysrgb&w=1000" alt="تجربة سفر هادئة" className="w-full h-[430px] object-cover rounded-[2rem] shadow-2xl" />
                <div className="absolute -bottom-6 -right-4 md:-right-8 bg-gradient-gold text-emerald-950 rounded-2xl p-5 shadow-xl"><Award size={28} className="mb-2" /><p className="font-black">ثقة تُبنى بالتفاصيل</p></div>
              </div>
            </div>
          </section>
          <section className="py-20">
            <div className="max-w-7xl mx-auto px-4 text-center"><span className="public-eyebrow">قيمنا</span><h2 className="public-heading mt-3 mb-10">لماذا يختارنا المسافرون؟</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{values.map((value) => <div key={value} className="public-card p-6 text-right"><CheckCircle2 className="text-gold-600 mb-4" size={24} /><h3 className="font-black text-emerald-950">{value}</h3><p className="text-sm text-gray-500 mt-2 leading-relaxed">نضع راحتك ووضوح تجربتك في مقدمة كل قرار نتخذه.</p></div>)}</div></div>
          </section>
        </>
      ) : (
        <section className="py-20 bg-[#fbfaf7]">
          <div className="max-w-7xl mx-auto px-4"><div className="max-w-2xl mb-12"><span className="public-eyebrow">خدماتنا</span><h2 className="public-heading mt-3 mb-4">نرتب كل ما تحتاجه قبل السفر</h2><p className="public-body">اختر الخدمة التي تناسبك، وسيهتم فريقنا ببقية التفاصيل من التخطيط حتى العودة.</p></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{serviceCards.map(({ icon: Icon, title, text }) => <article key={title} className="public-card p-7 group"><div className="w-14 h-14 rounded-2xl bg-emerald-950 text-gold-400 flex items-center justify-center mb-6 group-hover:bg-gold-500 group-hover:text-emerald-950 transition-colors"><Icon size={25} /></div><h3 className="text-xl font-black text-emerald-950 mb-3">{title}</h3><p className="text-sm text-gray-500 leading-relaxed">{text}</p></article>)}</div><div className="mt-12 text-center"><button onClick={() => onNavigate('booking')} className="public-btn-gold px-8 py-4">ابدأ التخطيط لرحلتك</button></div></div>
        </section>
      )}
    </div>
  );
}
