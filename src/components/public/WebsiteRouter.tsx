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
import BookingPage from '../../pages/public/BookingPage';
import ContactPage from '../../pages/public/ContactPage';

export type PublicPage =
  | 'home' | 'hajj' | 'umrah' | 'internal'
  | 'hotels' | 'hotel-details' | 'offers' | 'booking' | 'contact';

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
      url: 'https://promise-travel.com',
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
      url: 'https://promise-travel.com',
    },
  },
  contact: {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Promise Travel | بروميس للسياحة والسفر',
    telephone: '+201001234567',
    email: 'info@promisetravel.com',
    url: 'https://promise-travel.com/contact',
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
  const [page, setPage] = useState<PublicPage>('home');
  const [bookingPreset, setBookingPreset] = useState<HotelPreset | undefined>();
  const [hotelId, setHotelId] = useState<string | undefined>();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const go = (p: PublicPage, preset?: HotelPreset, id?: string) => {
    setBookingPreset(preset);
    setHotelId(id);
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
        {page === 'offers' && <OffersPage onNavigate={go} />}
        {page === 'booking' && <BookingPage preset={bookingPreset} onDone={() => go('home')} />}
        {page === 'contact' && <ContactPage />}
      </main>

      <WebsiteFooter onNavigate={go} />
    </div>
  );
}

