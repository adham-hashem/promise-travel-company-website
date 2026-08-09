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
import PackageDetailsPage from '../../pages/public/PackageDetailsPage';
import OffersPage from '../../pages/public/OffersPage';
import BookingPage from '../../pages/public/BookingPage';
import ContactPage from '../../pages/public/ContactPage';

export type PublicPage =
  | 'home' | 'hajj' | 'umrah' | 'internal'
  | 'hotels' | 'hotel-details' | 'package-details' | 'offers' | 'booking' | 'contact';

interface HotelPreset {
  packageId?: string;
  type?: string;
}

export interface NavigateProps {
  page: PublicPage;
  preset?: HotelPreset;
  hotelId?: string;
}

const SEO_META: Record<PublicPage, { title: string; description: string; path: string }> = {
  home: {
    title: 'Promise Travel | بروميس للسياحة والسفر — برامج الحج والعمرة والرحلات',
    description: 'وكالة بروميس للسياحة والسفر — خيارك الأول لرحلات العمرة والحج، الفنادق المصنفة قرب الحرم الشريف، السياحة الداخلية وتذاكر الطيران بأفضل الأسعار.',
    path: '',
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
    description: 'استمتع بأجمل رحلات السياحة الداخلية في مصر (شرم الشيخ، الغردقة، الأقصر وأسوان) مع وكالة بروميس للسياحة والسفر.',
    path: 'internal',
  },
  hotels: {
    title: 'حجز فنادق مكة والمدينة المنورة | Promise Travel',
    description: 'احجز أفضل فنادق مكة المكرمة والمدينة المنورة المصنفة 5 نجوم و 4 نجوم بأفضل الأسعار وأقرب المواقع للحرمين الشريفين.',
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
  'package-details': {
    title: 'تفاصيل الباقة والحجز المباشر | Promise Travel',
    description: 'عرض تفاصيل باقة الحج أو العمرة، خطة الرحلة والأسعار والحجز المباشر مع بروميس للسياحة.',
    path: 'packages',
  },
};

const PAGE_JSONLD: Partial<Record<PublicPage, object>> = {
  home: {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'كيف يمكنني الحجز مع بروميس للسياحة؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'يمكنك الحجز مباشرة من خلال صفحة الحجز على موقعنا، أو التواصل معنا هاتفياً وسيقوم فريقنا بمساعدتك في إتمام الحجز.',
        },
      },
      {
        '@type': 'Question',
        name: 'هل تشمل باقات الحج والعمرة تذاكر الطيران؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'نعم، جميع باقات الحج والعمرة تشمل تذاكر الطيران ذهاباً وعودة، كما تشمل الإقامة والنقل والتأشيرات.',
        },
      },
      {
        '@type': 'Question',
        name: 'هل يمكنني الدفع على دفعات؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'نعم، نوفر نظام دفع مرن يتيح لك دفع جزء من المبلغ عند الحجز والباقي قبل موعد السفر بفترة كافية.',
        },
      },
      {
        '@type': 'Question',
        name: 'هل توفرون مرشدين سياحيين؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'نعم، نوفر مرشدين متخصصين يتحدثون العربية والإنجليزية طوال فترة الرحلة لضمان تجربة مريحة وممتعة.',
        },
      },
    ],
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
    '@type': 'LocalBusiness',
    name: 'Promise Travel | بروميس للسياحة والسفر',
    telephone: '+201012484971',
    email: 'info@promisetravel.com',
    url: 'https://promisetravelgroup.com/contact',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'القاهرة',
      addressCountry: 'EG',
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      opens: '09:00',
      closes: '22:00',
    },
  },
};

export default function WebsiteRouter() {
  const [page, setPage] = useState<PublicPage>(() => {
    if (typeof window === 'undefined') return 'home';
    const h = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    if (h.startsWith('hotel-details/')) {
      return 'hotel-details';
    }
    if (h.startsWith('package-details/')) {
      return 'package-details';
    }
    const validPages: PublicPage[] = ['home', 'hajj', 'umrah', 'internal', 'hotels', 'offers', 'booking', 'contact'];
    if (validPages.includes(h as PublicPage)) {
      return h as PublicPage;
    }
    return 'home';
  });

  const [bookingPreset, setBookingPreset] = useState<HotelPreset | undefined>();

  const [hotelId, setHotelId] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    const h = window.location.hash.replace(/^#\/?/, '');
    if (h.startsWith('hotel-details/')) {
      return h.substring('hotel-details/'.length);
    }
    return undefined;
  });

  const [packageId, setPackageId] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    const h = window.location.hash.replace(/^#\/?/, '');
    if (h.startsWith('package-details/')) {
      return h.substring('package-details/'.length);
    }
    return undefined;
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  useEffect(() => {
    const handleHashChange = () => {
      const h = window.location.hash.replace(/^#\/?/, '');
      if (!h) {
        setPage('home');
        return;
      }
      
      if (h.startsWith('hotel-details/')) {
        setHotelId(h.substring('hotel-details/'.length));
        setPage('hotel-details');
      } else if (h.startsWith('package-details/')) {
        setPackageId(h.substring('package-details/'.length));
        setPage('package-details');
      } else {
        const validPages: PublicPage[] = ['home', 'hajj', 'umrah', 'internal', 'hotels', 'offers', 'booking', 'contact'];
        if (validPages.includes(h as PublicPage)) {
          setPage(h as PublicPage);
        } else {
          setPage('home');
        }
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const go = (p: PublicPage, preset?: HotelPreset, id?: string) => {
    setBookingPreset(preset);
    let hash = p as string;
    if (p === 'hotel-details' && id) {
      setHotelId(id);
      hash = `hotel-details/${id}`;
    } else if (p === 'package-details' && id) {
      setPackageId(id);
      hash = `package-details/${id}`;
    }
    window.location.hash = hash;
    setPage(p);
  };

  const currentSEO = SEO_META[page] || SEO_META.home;

  return (
    <div className="min-h-screen bg-white flex flex-col" dir="rtl">
      <SEOHead
        title={currentSEO.title}
        description={currentSEO.description}
        path={currentSEO.path}
        jsonLd={PAGE_JSONLD[page] || null}
      />

      <WebsiteHeader currentPage={page} onNavigate={go} />

      <main className="flex-1">
        {page === 'home' && <Home onNavigate={go} />}
        {page === 'hajj' && <HajjPage onNavigate={go} />}
        {page === 'umrah' && <UmrahPage onNavigate={go} />}
        {page === 'internal' && <InternalPage onNavigate={go} />}
        {page === 'hotels' && <HotelsPage onNavigate={go} />}
        {page === 'hotel-details' && hotelId && <HotelDetailsPage hotelId={hotelId} onNavigate={go} />}
        {page === 'package-details' && packageId && <PackageDetailsPage packageId={packageId} onNavigate={go} />}
        {page === 'offers' && <OffersPage onNavigate={go} />}
        {page === 'booking' && <BookingPage preset={bookingPreset} onDone={() => go('home')} />}
        {page === 'contact' && <ContactPage />}
      </main>

      <WebsiteFooter onNavigate={go} />

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/201012484971"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 bg-emerald-500 text-white p-3 md:p-3.5 rounded-full shadow-[0_8px_30px_rgba(16,185,129,0.4)] hover:bg-emerald-600 hover:scale-110 active:scale-95 transition-all flex items-center justify-center border border-emerald-400/20"
        title="تواصل معنا عبر واتساب"
      >
        <svg
          className="w-6 h-6 md:w-7 md:h-7 fill-current"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.022-.08-.124-.14-.262-.21-.137-.07-.812-.4-1-.47-.188-.07-.324-.103-.462.103-.137.21-.53.667-.648.796-.12.13-.238.143-.377.07-.138-.07-.58-.214-1.107-.686-.407-.364-.682-.814-.762-.95-.08-.138-.01-.212.06-.28.064-.06.137-.16.205-.24.07-.08.09-.14.137-.21.047-.07.025-.136-.011-.21-.037-.07-.325-.785-.445-1.07-.117-.285-.235-.24-.325-.245-.083-.004-.178-.004-.275-.004-.097 0-.256.036-.39.18-.134.143-.513.5-.513 1.21 0 .71.52 1.39.59 1.49.073.097 1.02 1.558 2.47 2.18.347.148.617.237.828.303.35.11.666.095.918.058.28-.04.812-.33 1-.65.187-.32.187-.6.13-.65zM12 2C6.477 2 2 6.477 2 12c0 2.01.593 3.88 1.61 5.45L2.1 21.9l4.58-1.5C8.12 21.407 10 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.84 0-3.55-.52-5.02-1.42l-.36-.22-2.72.89.91-2.61-.24-.38C3.65 14.88 3 13.01 3 12c0-4.96 4.04-9 9-9s9 4.04 9 9-4.04 9-9 9z" />
        </svg>
      </a>
    </div>
  );
}

