import { useEffect, useState } from 'react';
import {
  X, Loader2, Hash, User, Phone, Package, Wallet, Calendar,
  UserCheck, FileText, CircleDot,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Booking } from '../types';
import DocumentsSection from './DocumentsSection';

interface Props {
  bookingId: string | null;
  onClose: () => void;
}

const bookingStatusColors: Record<string, string> = {
  مؤكد: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  معلق: 'bg-amber-100 text-amber-700 border-amber-200',
  ملغي: 'bg-red-100 text-red-700 border-red-200',
};

const paymentStatusColors: Record<string, string> = {
  'مدفوع بالكامل': 'bg-emerald-100 text-emerald-700',
  'مدفوع جزئياً': 'bg-blue-100 text-blue-700',
  'غير مدفوع': 'bg-gray-100 text-gray-600',
};

function Field({
  icon: Icon, label, value, dir,
}: { icon: React.ElementType; label: string; value?: React.ReactNode; dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
        <Icon size={12} />
        <span className="text-[11px] font-semibold">{label}</span>
      </div>
      <p className="text-sm font-bold text-navy-900" dir={dir}>
        {value ?? '—'}
      </p>
    </div>
  );
}

export default function BookingDetailsModal({ bookingId, onClose }: Props) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bookingId) {
      setBooking(null);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    (async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, customers(*), packages(*), employees(*)')
        .eq('id', bookingId)
        .maybeSingle();
      if (error) {
        setError(error.message);
      } else if (!data) {
        setError('لم يتم العثور على الحجز');
      } else {
        setBooking(data as Booking);
      }
      setLoading(false);
    })();
  }, [bookingId]);

  if (!bookingId) return null;

  const remaining = (booking?.total_amount ?? 0) - (booking?.paid_amount ?? 0);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-fadeIn max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-navy p-5 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-white font-bold text-base sm:text-lg">تفاصيل الحجز</h3>
            <p className="text-white/60 text-xs">
              {booking ? `#${booking.id.slice(0, 8)}` : 'جارٍ التحميل...'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 min-h-0 p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-navy-700" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          ) : booking ? (
            <div className="space-y-5">
              {/* Status badges */}
              <div className="flex flex-wrap items-center gap-2">
                {booking.status && (
                  <span className={`badge border ${bookingStatusColors[booking.status] || 'bg-gray-100'}`}>
                    <CircleDot size={12} className="ml-1" />حجز: {booking.status}
                  </span>
                )}
                {booking.payment_status && (
                  <span className={`badge ${paymentStatusColors[booking.payment_status] || 'bg-gray-100'}`}>
                    <Wallet size={12} className="ml-1" />دفع: {booking.payment_status}
                  </span>
                )}
              </div>

              {/* Customer + Package info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field icon={Hash} label="رقم الحجز" value={`#${booking.id.slice(0, 8)}`} />
                <Field icon={User} label="اسم العميل" value={booking.customers?.name} />
                <Field icon={Phone} label="رقم الهاتف" value={booking.customers?.phone} dir="ltr" />
                <Field
                  icon={Package}
                  label="نوع الخدمة / الباقة"
                  value={
                    booking.packages
                      ? `${booking.packages.name} — ${booking.packages.type}`
                      : '—'
                  }
                />
                <Field
                  icon={Calendar}
                  label="تاريخ الحجز"
                  value={booking.booking_date ? new Date(booking.booking_date).toLocaleDateString('ar-EG') : '—'}
                />
                <Field
                  icon={UserCheck}
                  label="الموظف المسؤول"
                  value={booking.employees?.name}
                />
              </div>

              {/* Financial summary */}
              <div className="bg-gradient-navy rounded-2xl p-4 text-white">
                <p className="text-white/60 text-xs mb-3 font-semibold">الملخص المالي</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-white/50">الإجمالي</p>
                    <p className="text-base font-black">{Number(booking.total_amount ?? 0).toLocaleString('ar-EG')}</p>
                    <p className="text-[9px] text-white/50">ج.م</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-300">المدفوع</p>
                    <p className="text-base font-black text-emerald-300">{Number(booking.paid_amount ?? 0).toLocaleString('ar-EG')}</p>
                    <p className="text-[9px] text-white/50">ج.م</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-amber-300">المتبقي</p>
                    <p className="text-base font-black text-amber-300">
                      {remaining > 0 ? remaining.toLocaleString('ar-EG') : '0'}
                    </p>
                    <p className="text-[9px] text-white/50">ج.م</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex items-center gap-1.5 text-gray-500 mb-1.5">
                  <FileText size={12} />
                  <span className="text-[11px] font-semibold">ملاحظات</span>
                </div>
                <p className="text-sm text-navy-900 whitespace-pre-wrap">
                  {booking.notes?.trim() ? booking.notes : 'لا توجد ملاحظات'}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Documents Section */}
        {booking && <DocumentsSection bookingId={booking.id} customerName={booking.customers?.name} />}
      </div>
    </div>
  );
}
