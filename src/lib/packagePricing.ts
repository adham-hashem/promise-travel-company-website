import type { Package } from '../types';

export type AgeGroup = 'بالغ' | 'طفل' | 'رضيع';
export type AdultRoomType = 'ثنائي' | 'ثلاثي' | 'رباعي';

export const adultRoomOptions: Array<{ value: AdultRoomType; label: string; field: keyof Package }> = [
  { value: 'ثنائي', label: 'بالغ ثنائي', field: 'price_double' },
  { value: 'ثلاثي', label: 'بالغ ثلاثي', field: 'price_triple' },
  { value: 'رباعي', label: 'بالغ رباعي', field: 'price_quad' },
];

export const normalizeAdultRoomType = (roomType?: string | null): AdultRoomType | '' => {
  const value = (roomType || '').trim().toLowerCase();
  if (value.includes('ثنائ') || value.includes('double')) return 'ثنائي';
  if (value.includes('ثلاث') || value.includes('triple')) return 'ثلاثي';
  if (value.includes('رباع') || value.includes('quad')) return 'رباعي';
  return '';
};

export const getPackagePriceForCustomer = (
  pkg: Pick<Package, 'price' | 'price_double' | 'price_triple' | 'price_quad' | 'price_child' | 'price_infant'> | null | undefined,
  ageGroup: AgeGroup = 'بالغ',
  roomType?: string | null
) => {
  if (!pkg) return 0;

  if (ageGroup === 'طفل') return Number(pkg.price_child || 0);
  if (ageGroup === 'رضيع') return Number(pkg.price_infant || 0);

  const normalizedRoomType = normalizeAdultRoomType(roomType);
  if (normalizedRoomType === 'ثنائي') return Number(pkg.price_double || 0);
  if (normalizedRoomType === 'ثلاثي') return Number(pkg.price_triple || 0);
  if (normalizedRoomType === 'رباعي') return Number(pkg.price_quad || 0);

  return Number(pkg.price || 0);
};

export const getPackagePriceForCustomerRecord = (customer: any, pkg: any) => {
  const ageGroup = (customer?.age_group || 'بالغ') as AgeGroup;
  const roomType = ageGroup === 'بالغ'
    ? customer?.room_type_makkah || customer?.room_type_madinah || ''
    : '';
  return getPackagePriceForCustomer(pkg, ageGroup, roomType);
};
