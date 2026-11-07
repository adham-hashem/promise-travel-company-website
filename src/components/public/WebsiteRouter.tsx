import { useEffect, useState } from 'react';
import WebsiteHeader from './WebsiteHeader';
import WebsiteFooter from './WebsiteFooter';
import SEOHead from './SEOHead';
import Home from '../../pages/public/Home';
import HajjPage from '../../pages/public/HajjPage';
import UmrahPage from '../../pages/public/UmrahPage';
import InternalPage from '../../pages/public/InternalPage';
import HotelsPage from '../../pages/public/HotelsPage';
import HotelDetailsPage from '../../pages/public/HotelDetailsPage';
import OffersPage from '../../pages/public/OffersPage';
import OfferDetailsPage from '../../pages/public/OfferDetailsPage';
import PackageDetailsPage from '../../pages/public/PackageDetailsPage';
import BookingPage from '../../pages/public/BookingPage';
import ContactPage from '../../pages/public/ContactPage';
import BrandInfoPage from '../../pages/public/BrandInfoPage';
import FloatingSocial from './FloatingSocial';
import { FAQS, SITE } from './site/siteData';
import '../../styles/public-site.css';

export type PublicPage =
  | 'home' | 'about' | 'services' | 'hajj' | 'umrah' | 'internal'
  | 'hotels' | 'hotel-details' | 'offers' | 'offer-details'
  | 'package-details' | 'booking' | 'contact';

interface HotelPreset {
  packageId?: string;
  type?: string;
}

export interface NavigateProps {
  page: PublicPage;
  preset?: HotelPreset;
  hotelId?: string;
  offerId?: string;
}

const SEO_META: Record<PublicPage, { title: string; description: string; path: string }> = {
  home: {
    title: 'Promise Travel | بروميس للسياحة والسفر — برامج الحج والعمرة والرحلات',
    description: 'وكالة بروميس للسياحة والسفر — خيارك الأول لرحلات العمرة والحج، الفنادق المصنفة قرب الحرم الشريف، السياحة الداخلية وتذاكر الطيران بأفضل الأسعار.',
    path: '',
  },
  about: {
    title: 'عن Promise Travel | بروميس للسياحة والسفر',
    description: 'تعرف على وكالة بروميس للسياحة والسفر وخبرتها في تنظيم رحلات الحج والعمرة والسياحة الداخلية والفنادق.',
    path: 'about',
  },
  services: {
    title: 'خدمات Promise Travel | الحج والعمرة والفنادق والرحلات',
    description: 'خدمات سياحية متكاملة تشمل الحج، العمرة، الفنادق، الرحلات الداخلية، الطيران، والنقل مع بروميس للسياحة.',
    path: 'services',
  },
  hajj: {
    title: 'برامج الحج السياحي الفاخر | Promise Travel بروميس للسياحة',
    description: 'اكتشف أقوى عروض وبرامج الحج السياحي الفاخر مع بروميس للسياحة: إقامة قرب الحرم، انتقالات مكيفة، وإشراف ديني متخصص.',
    path: 'hajj',
  },
  umrah: {
    title: 'عروض ورحلات العمرة طوال العام | Promise Travel بروميس للسياحة',
    description: 'أفضل رحلات العمرة الاقتصادية والفاخرة طوال العام مع بروميس للسياحة. فنادق ممتازة على بعد خطوات من الحرم المكي والنبوي.',
    path: 'umrah',
  },
  internal: {
    title: 'رحلات السياحة الداخلية | Promise Travel بروميس للسياحة',
    description: 'استمتع بأجمل رحلات السياحة الداخلية في مصر مع وكالة بروميس للسياحة والسفر.',
    path: 'internal',
  },
  hotels: {
    title: 'حجز فنادق مكة والمدينة المنورة | Promise Travel',
    description: 'احجز أفضل فنادق مكة المكرمة والمدينة المنورة المصنفة بأفضل الأسعار وأقرب المواقع للحرمين الشريفين.',
    path: 'hotels',
  },
  'hotel-details': {
    title: 'تفاصيل الفندق والحجز المباشر | Promise Travel',
    description: 'عرض تفاصيل الفندق، صور الغرف، الخدمات المتاحة وإمكانية الحجز المباشر عبر وكالة بروميس للسياحة.',
    path: 'hotels',
  },
  offers: {
    title: 'أقوى عروض الخصومات على الحج والعمرة | Promise Travel',
    description: 'تابع أحدث العروض والخصومات الحصرية على رحلات العمرة، الحج، الفنادق والرحلات الداخلية من بروميس للسياحة.',
    path: 'offers',
  },
  'offer-details': {
    title: 'تفاصيل العرض والحجز المباشر | Promise Travel',
    description: 'عرض تفاصيل العرض، الخصم، البرنامج المرتبط، وإمكانية الحجز المباشر مع بروميس للسياحة.',
    path: 'offers',
  },
  'package-details': {
    title: 'تفاصيل الباقة والحجز المباشر | Promise Travel',
    description: 'عرض تفاصيل باقة الحج أو العمرة، خطة الرحلة والأسعار والحجز المباشر مع بروميس للسياحة.',
    path: 'packages',
  },
  booking: {
    title: 'حجز الرحلة والبرنامج online | Promise Travel',
    description: 'احجز رحلتك أو فندقك الآن عبر الإنترنت مع وكالة بروميس للسياحة والسفر بخطوات سهلة وآمنة.',
    path: 'booking',
  },
  contact: {
    title: 'اتصل بنا وتواصل مع بروميس للسياحة | Promise Travel',
    description: 'تواصل مع وكالة بروميس للسياحة والسفر للحصول على الاستشارات والحجوزات. هاتف، واتساب، والعنوان.',
    path: 'contact',
  },
};

const PAGE_JSONLD: Partial<Record<PublicPage, object>> = {
  home: {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  },
  hajj: {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: 'برامج الحج السياحي الفاخر مع بروميس للسياحة',
    description: 'برامج حج متكاملة: إقامة فاخرة قرب المشاعر المقدسة، إشراف ديني متخصص، نقل مكيف، تأشيرات، طيران.',
    touristType: 'حجاج بيت الله الحرام',
    provider: {
      '@type': 'TravelAgency',
      name: 'Promise Travel | بروميس للسياحة والسفر',
      url: 'https://promisetravelgroup.com',
    },
  },
  umrah: {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: 'عروض ورحلات العمرة طوال العام مع بروميس للسياحة',
    description: 'رحلات عمرة اقتصادية وفاخرة طوال العام مع فنادق ممتازة على بعد خطوات من الحرم المكي والنبوي.',
    touristType: 'معتمرين',
    provider: {
      '@type': 'TravelAgency',
      name: 'Promise Travel | بروميس للسياحة والسفر',
      url: 'https://promisetravelgroup.com',
    },
  },
  contact: {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: `${SITE.name} | Promise Travel`,
    telephone: SITE.phones.map((p) => `+2${p}`),
    email: SITE.email,
    url: 'https://promisetravelgroup.com/contact',
    sameAs: [SITE.facebook],
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'المركزية خلف بي تك',
      addressLocality: 'دمياط الجديدة',
      addressRegion: 'دمياط',
      addressCountry: 'EG',
    },
  },
};

const SIMPLE_PAGES: PublicPage[] = ['home', 'about', 'services', 'hajj', 'umrah', 'internal', 'hotels', 'offers', 'booking', 'contact'];

function applyHash(hash: string) {
  const h = hash.replace(/^#\/?/, '').toLowerCase();
  if (!h) return { page: 'home' as PublicPage };

  const parts = h.split('/');
  const kind = parts[0];
  const id = parts.slice(1).join('/');

  if ((kind === 'package' || kind === 'package-details') && id) {
    return { page: 'package-details' as PublicPage, packageId: id };
  }
  if ((kind === 'offer' || kind === 'offer-details') && id) {
    return { page: 'offer-details' as PublicPage, offerId: id };
  }
  if ((kind === 'hotel' || kind === 'hotel-details') && id) {
    return { page: 'hotel-details' as PublicPage, hotelId: id };
  }
  if (SIMPLE_PAGES.includes(h as PublicPage)) {
    return { page: h as PublicPage };
  }

  return { page: 'home' as PublicPage };
}

export default function WebsiteRouter() {
  const initialRoute = typeof window === 'undefined' ? { page: 'home' as PublicPage } : applyHash(window.location.hash);
  const [page, setPage] = useState<PublicPage>(initialRoute.page);
  const [bookingPreset, setBookingPreset] = useState<HotelPreset | undefined>();
  const [hotelId, setHotelId] = useState<string | undefined>(initialRoute.hotelId);
  const [offerId, setOfferId] = useState<string | undefined>(initialRoute.offerId);
  const [packageId, setPackageId] = useState<string | undefined>(initialRoute.packageId);

  useEffect(() => {
    const parseHash = () => {
      const route = applyHash(window.location.hash);
      setPage(route.page);
      setPackageId(route.packageId);
      setOfferId(route.offerId);
      setHotelId(route.hotelId);
      setBookingPreset(undefined);
    };
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const go = (p: PublicPage, preset?: HotelPreset, id?: string) => {
    setBookingPreset(preset);
    setHotelId(p === 'hotel-details' ? id : undefined);
    setOfferId(p === 'offer-details' ? id : undefined);
    setPackageId(p === 'package-details' ? id : undefined);
    if (typeof window !== 'undefined') {
      if (p === 'hotel-details' && id) window.location.hash = `hotel/${id}`;
      else if (p === 'offer-details' && id) window.location.hash = `offer/${id}`;
      else if (p === 'package-details' && id) window.location.hash = `package/${id}`;
      else window.location.hash = p === 'home' ? '' : p;
    }
    setPage(p);
  };

  const currentSEO = SEO_META[page] || SEO_META.home;

  return (
    <div className="public-shell min-h-screen flex flex-col" dir="rtl">
      <SEOHead
        title={currentSEO.title}
        description={currentSEO.description}
        path={currentSEO.path}
        jsonLd={PAGE_JSONLD[page] || null}
      />

      <WebsiteHeader currentPage={page} onNavigate={go} />

      <main className="flex-1">
        {page === 'home' && <Home onNavigate={go} />}
        {page === 'about' && <BrandInfoPage mode="about" onNavigate={go} />}
        {page === 'services' && <BrandInfoPage mode="services" onNavigate={go} />}
        {page === 'hajj' && <HajjPage onNavigate={go} />}
        {page === 'umrah' && <UmrahPage onNavigate={go} />}
        {page === 'internal' && <InternalPage onNavigate={go} />}
        {page === 'hotels' && <HotelsPage onNavigate={go} />}
        {page === 'hotel-details' && hotelId && <HotelDetailsPage hotelId={hotelId} onNavigate={go} />}
        {page === 'offers' && <OffersPage onNavigate={go} />}
        {page === 'offer-details' && offerId && <OfferDetailsPage offerId={offerId} onNavigate={go} />}
        {page === 'package-details' && packageId && <PackageDetailsPage packageId={packageId} onNavigate={go} />}
        {page === 'booking' && <BookingPage preset={bookingPreset} onDone={() => go('home')} onNavigate={go} />}
        {page === 'contact' && <ContactPage preset={bookingPreset} onNavigate={go} />}
      </main>

      <WebsiteFooter onNavigate={go} />
      <FloatingSocial />
    </div>
  );
}
