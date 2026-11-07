import type { PublicPage } from '../WebsiteRouter';
import type { Offer, Package } from '../../../types';

/** Company contact details shown across the visitor site. */
export const SITE = {
  name: 'برومس للسياحة',
  latin: 'PROMISE',
  tagline: 'وعدٌ نلتزم به',
  license: '1457',
  whatsapp: '201093838839',
  phones: ['01093838839', '01055503850', '01055503857', '01055503191'],
  email: 'Promisetravelcompany@gmail.com',
  facebook: 'https://www.facebook.com/share/1KMnsgykQi/',
  facebookLabel: 'برومس للسياحة-Promise',
  instagram: 'https://www.instagram.com/promise_travel',
  instagramLabel: '@promise_travel',
  address: 'المركزية خلف بي تك – دمياط الجديدة – دمياط',
  logoMark: '/brand/logo-mark.webp',
  logoFull: '/brand/logo-full.webp',
} as const;

export const waLink = (text?: string) =>
  `https://wa.me/${SITE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export type ProgramIconKey = 'hajj' | 'umrah' | 'hotels' | 'internal' | 'flights';

export interface Program {
  key: ProgramIconKey;
  /** Value used to prefill the quote form's "program" select. */
  title: string;
  desc: string;
  bullets?: string[];
  cta: string;
  feature?: boolean;
  page?: PublicPage;
  pageLabel?: string;
}

export const PROGRAMS: Program[] = [
  {
    key: 'hajj', title: 'الحج', feature: true, page: 'hajj', pageLabel: 'برامج الحج المتاحة',
    desc: 'برامج الحج السياحي بإقامة قريبة من الحرم وإشراف ديني ومتابعة من فريقنا خلال المناسك.',
    bullets: ['فنادق قريبة من الحرم المكي', 'انتقالات مكيفة بين المشاعر', 'عقد رسمي يحفظ حقوق الحاج'],
    cta: 'اطلب عرض سعر الحج',
  },
  {
    key: 'umrah', title: 'العمرة', feature: true, page: 'umrah', pageLabel: 'برامج العمرة المتاحة',
    desc: 'رحلات عمرة على مدار العام، منها برامج رمضان والمولد ونصف العام، بمستويات فنادق مختلفة.',
    bullets: ['فنادق قريبة من الحرمين', 'تأشيرة وطيران ذهاباً وعودة', 'زيارة المدينة المنورة'],
    cta: 'اطلب عرض سعر العمرة',
  },
  {
    key: 'hotels', title: 'فنادق مكة والمدينة', page: 'hotels', pageLabel: 'تصفح الفنادق',
    desc: 'حجز فنادق 4 و5 نجوم بأسعار مباشرة، للأفراد والعائلات والمجموعات.',
    cta: 'اسأل عن فندق',
  },
  {
    key: 'internal', title: 'السياحة الداخلية', page: 'internal', pageLabel: 'الرحلات المتاحة',
    desc: 'شرم الشيخ، الغردقة، الأقصر وأسوان. رحلات عائلية ورحلات شركات.',
    cta: 'اطلب برنامج رحلة',
  },
  {
    key: 'flights', title: 'تذاكر الطيران',
    desc: 'حجز تذاكر داخلية ودولية، ونساعدك تختار أنسب موعد وخط طيران.',
    cta: 'احجز تذكرة',
  },
];

export const PROGRAM_NAMES = ['العمرة', 'الحج', 'فنادق مكة والمدينة', 'السياحة الداخلية', 'تذاكر الطيران'];

/** Maps booking/package types used by the backend to quote-form program names. */
export const programFromType = (type?: string): string | undefined => {
  if (!type) return undefined;
  if (PROGRAM_NAMES.includes(type)) return type;
  return ({ 'حج': 'الحج', 'عمرة': 'العمرة', 'فندق': 'فنادق مكة والمدينة', 'داخلي': 'السياحة الداخلية' } as Record<string, string>)[type];
};

/** Reverse of programFromType: quote-form program name → booking service type. */
export const typeFromProgram = (program?: string): string | undefined => {
  if (!program) return undefined;
  return ({ 'الحج': 'حج', 'العمرة': 'عمرة', 'فنادق مكة والمدينة': 'فندق', 'السياحة الداخلية': 'داخلي' } as Record<string, string>)[program]
    ?? (['حج', 'عمرة', 'فندق', 'داخلي'].includes(program) ? program : undefined);
};

export const VOWS = [
  { title: 'شركة مرخصة', text: `نعمل بترخيص وزارة السياحة رقم ${SITE.license}، والرقم مطبوع على كل عرض سعر.` },
  { title: 'كل شيء مكتوب', text: 'الفندق ومستواه والمسافة من الحرم ومواعيد الطيران مذكورة في العرض قبل ما تدفع.' },
  { title: 'عقد رسمي', text: 'في الحج يوقع الحاج عقداً رسمياً يضمن حقوقه ويوضح كل الشروط.' },
  { title: 'متابعة شخصية', text: 'موظف مسؤول عن حجزك تتواصل معه مباشرة قبل السفر وأثناء الرحلة.' },
];

export const STEPS = [
  { title: 'تواصل معنا', text: 'عبر واتساب أو التليفون أو زيارة المكتب، وقول لنا البرنامج والموعد وعدد الأفراد.' },
  { title: 'استلم عرض السعر', text: 'نرسل لك عرضاً مكتوباً برقم مرجعي فيه كل التفاصيل والسعر النهائي.' },
  { title: 'التعاقد والأوراق', text: 'توقع العقد وتسلمنا الأوراق المطلوبة للتأشيرة، ونتابع كل الإجراءات.' },
  { title: 'السفر', text: 'نسلمك تذاكرك وبرنامج الرحلة، ونفضل معاك لحد رجوعك.' },
];

export const FAQS = [
  { q: 'كيف أحجز؟', a: 'راسلنا على واتساب أو اتصل بأحد أرقامنا، أو املأ نموذج الاستفسار في آخر الصفحة. نرسل لك عرض سعر مكتوباً، وبعد موافقتك نبدأ إجراءات التعاقد.' },
  { q: 'هل برامج الحج والعمرة تشمل الطيران؟', a: 'نعم، برامج الحج والعمرة تشمل تذاكر الطيران ذهاباً وعودة، إلا إذا ذُكر غير ذلك صراحة في عرض السعر.' },
  { q: 'ما نظام الدفع في الحج؟', a: 'يُسدد مبلغ برنامج الحج كاملاً عند التعاقد، ولا يمكن الإلغاء أو التعديل بعد التعاقد. ويوقع الحاج عقداً رسمياً يضمن حقوقه.' },
  { q: 'وماذا عن العمرة والرحلات الأخرى؟', a: 'نظام السداد يختلف حسب البرنامج والموسم، ويكون موضحاً في عرض السعر قبل الحجز.' },
  { q: 'هل أستطيع زيارة المكتب؟', a: 'أكيد. مكتبنا في المركزية خلف بي تك بدمياط الجديدة، ويسعدنا نقابلك ونشرح لك البرنامج.' },
];

export const formatEGP = (value: unknown) => `${Number(value).toLocaleString('ar-EG')} ج.م`;
export const hasAmount = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
};

export const hotelShareUrl = (id: string) => `${typeof window !== 'undefined' ? window.location.origin : ''}/#hotel/${id}`;

export type OfferWithPackage = Offer & { packages?: Package };

/** Original and discounted price for an offer, falling back to its linked package. */
export function offerPricing(o: OfferWithPackage) {
  const original = o.original_price ?? o.packages?.price ?? null;
  const discounted = o.discounted_price ?? (o.packages ? Math.round(Number(o.packages.price) * (1 - o.discount_percentage / 100)) : null);
  return { original, discounted };
}

export function isOfferLive(o: Offer, today = new Date().toISOString().split('T')[0]) {
  return o.end_date >= today && o.start_date <= today;
}
