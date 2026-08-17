import { useEffect, useState } from 'react';
import WebsiteHeader from './WebsiteHeader';
import WebsiteFooter from './WebsiteFooter';
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

export default function WebsiteRouter() {
  const [page, setPage] = useState<PublicPage>('home');
  const [bookingPreset, setBookingPreset] = useState<HotelPreset | undefined>();
  const [hotelId, setHotelId] = useState<string | undefined>();
  const [offerId, setOfferId] = useState<string | undefined>();
  const [packageId, setPackageId] = useState<string | undefined>();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const go = (p: PublicPage, preset?: HotelPreset, id?: string) => {
    setBookingPreset(preset);
    setHotelId(id);
    setOfferId(id);
    setPackageId(id);
    setPage(p);
  };

  return (
    <div className="public-shell min-h-screen bg-white flex flex-col" dir="rtl">
      <WebsiteHeader currentPage={page} onNavigate={go} />

      <main className="flex-1 overflow-hidden">
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
        {page === 'booking' && <BookingPage preset={bookingPreset} onDone={() => go('home')} />}
        {page === 'contact' && <ContactPage />}
      </main>

      <WebsiteFooter onNavigate={go} />
      <FloatingSocial />
    </div>
  );
}
