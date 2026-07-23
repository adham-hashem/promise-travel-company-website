import { useEffect, useState } from 'react';
import { CalendarCheck, Clock, XCircle, Eye, Globe } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Booking, BookingStatus } from '../types';
import BookingDetailsModal from '../components/BookingDetailsModal';

const statusColors: Record<BookingStatus, string> = {
  مؤكد: 'bg-green-100 text-green-700 border-green-200',
  معلق: 'bg-amber-100 text-amber-700 border-amber-200',
  ملغي: 'bg-red-100 text-red-700 border-red-200',
};

const statusIcons: Record<BookingStatus, React.ElementType> = {
  مؤكد: CalendarCheck, معلق: Clock, ملغي: XCircle,
};

const paymentColors: Record<string, string> = {
  'مدفوع بالكامل': 'bg-emerald-100 text-emerald-700',
  'مدفوع جزئياً': 'bg-blue-100 text-blue-700',
  'غير مدفوع': 'bg-gray-100 text-gray-600',
};



interface Props { searchValue: string; }

export default function Bookings({ searchValue }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingStatus | 'الكل'>('الكل');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('bookings')
        .select('*, customers(*), packages(*)')
        .order('created_at', { ascending: false });
      setBookings((data as Booking[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = bookings.filter((b) => {
    const matchSearch = !searchValue || b.customers?.name?.includes(searchValue);
    const matchFilter = filter === 'الكل' || b.status === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    مؤكد: bookings.filter(b => b.status === 'مؤكد').length,
    معلق: bookings.filter(b => b.status === 'معلق').length,
    ملغي: bookings.filter(b => b.status === 'ملغي').length,
  };

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {(['مؤكد', 'معلق', 'ملغي'] as BookingStatus[]).map((s) => {
          const Icon = statusIcons[s];
          return (
            <div key={s} className="stat-card flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${statusColors[s]}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-800">{counts[s]}</p>
                <p className="text-xs text-gray-500 font-medium">حجوزات {s}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter + Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {(['الكل', 'مؤكد', 'معلق', 'ملغي'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === s ? 'bg-navy-800 text-white' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-navy-300'}`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500">{filtered.length} حجز</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-navy-200 border-t-navy-700 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>اسم العميل</th>
                  <th>المصدر</th>
                  <th>الباقة</th>
                  <th>حالة الحجز</th>
                  <th>حالة الدفع</th>
                  <th>المبلغ الإجمالي</th>
                  <th>المدفوع</th>
                  <th>تاريخ الحجز</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-navy flex items-center justify-center text-white font-bold text-xs">
                          {b.customers?.name?.charAt(0)}
                        </div>
                        <span className="font-semibold text-gray-800">{b.customers?.name}</span>
                      </div>
                    </td>
                    <td>
                      {b.source === 'Website' ? (
                        <span className="badge bg-gold-100 text-gold-700 flex items-center gap-1 w-fit">
                          <Globe size={10} /> موقع
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{b.packages?.name}</p>
                        <p className="text-xs text-gray-400">{b.packages?.type}</p>
                      </div>
                    </td>
                    <td><span className={`badge border ${statusColors[b.status]}`}>{b.status}</span></td>
                    <td><span className={`badge ${paymentColors[b.payment_status]}`}>{b.payment_status}</span></td>
                    <td className="font-semibold text-gray-800">{b.total_amount?.toLocaleString('ar-EG')} ج.م</td>
                    <td className="text-emerald-600 font-medium">{b.paid_amount.toLocaleString('ar-EG')} ج.م</td>
                    <td className="text-gray-500 text-xs">{new Date(b.booking_date).toLocaleDateString('ar-EG')}</td>
                    <td>
                      <button
                        onClick={() => setSelectedBookingId(b.id)}
                        className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-600 transition-colors"
                        aria-label="عرض تفاصيل الحجز"
                        title="عرض التفاصيل"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BookingDetailsModal
        bookingId={selectedBookingId}
        onClose={() => setSelectedBookingId(null)}
      />
    </div>
  );
}
