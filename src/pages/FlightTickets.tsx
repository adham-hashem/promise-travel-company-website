import { useEffect, useState, useRef } from 'react';
import {
  Plane, Plus, X, Loader2, Search, Upload, Eye, Download,
  FileText, CheckCircle2, Clock, User, Ticket, Undo2, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { compressImage } from '../lib/imageCompressor';
import { exportToExcel, exportToPDF } from '../lib/exportUtils';
import type { FlightTicket, Page } from '../types';

const emptyForm = {
  customer_id: '',
  booking_id: '',
  pnr: '',
  airline: '',
  flight_number: '',
  departure_airport: '',
  arrival_airport: '',
  departure_datetime: '',
  return_datetime: '',
  e_ticket_number: '',
};


const stageLabels: Record<string, { label: string; color: string }> = {
  new: { label: 'جديد', color: 'bg-gray-100 text-gray-600' },
  accounts: { label: 'الحسابات', color: 'bg-amber-100 text-amber-700' },
  operations: { label: 'التشغيل', color: 'bg-blue-100 text-blue-700' },
  visa: { label: 'التأشيرات', color: 'bg-purple-100 text-purple-700' },
  flight: { label: 'الطيران', color: 'bg-cyan-100 text-cyan-700' },
  ready: { label: 'جاهز للسفر', color: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'مكتمل', color: 'bg-navy-100 text-navy-700' },
};

interface Props {
  onNavigate: (page: Page, id?: string) => void;
}

export default function FlightTickets({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<FlightTicket[]>([]);
  const [readyCustomers, setReadyCustomers] = useState<Array<{ customer_id: string; customer_name: string; client_code: string; booking_id: string; workflow_stage: string; destination: string; travel_date: string; return_date: string; pax_count: number; passport_name: string; visa_id: string; hotel_name: string; package_name: string; notes?: string; customer?: any; booking?: any }>>([]);
  const [allCustomers, setAllCustomers] = useState<Array<{ id: string; name: string; client_code: string }>>([]);
  const [detailCustomer, setDetailCustomer] = useState<any | null>(null);
  const [detailDocs, setDetailDocs] = useState<any[]>([]);
  const [loadingDetailDocs, setLoadingDetailDocs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<FlightTicket | null>(null);
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!detailCustomer) {
      setDetailDocs([]);
      return;
    }
    setLoadingDetailDocs(true);
    supabase.from('documents')
      .select('*')
      .eq('customer_id', detailCustomer.id)
      .then(({ data }) => {
        setDetailDocs(data || []);
        setLoadingDetailDocs(false);
      });
  }, [detailCustomer]);

  const load = async () => {
    setLoading(true);
    const [ticketRes, opsRes, custRes] = await Promise.all([
      supabase.from('flight_tickets').select('*, customers(*, packages(*)), bookings(*), user_profiles(*)').order('created_at', { ascending: false }),
      supabase.from('operation_files').select(`
        *,
        customer:customers(*, packages(*)),
        booking:bookings(*, package:packages(*)),
        hotel:hotels(*)
      `).in('workflow_stage', ['flight', 'ready', 'completed']).order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name, client_code, service_type, client_type').order('name', { ascending: true }),
    ]);

    if (opsRes.error) {
      console.error('[FlightTickets] Error fetching ops data:', opsRes.error);
    }

    const fetchedTickets = (ticketRes.data as FlightTicket[]) || [];
    setTickets(fetchedTickets.filter(t => t.customers?.service_type !== 'سياحة داخلية' && t.customers?.client_type !== 'فوج'));

    setAllCustomers((custRes.data || [])
      .filter((c: any) => c.service_type !== 'سياحة داخلية' && c.client_type !== 'فوج')
      .map((c: any) => ({ id: c.id, name: c.name || '—', client_code: c.client_code || '' })));

    const opsData = (opsRes.data || [])
      .filter((o: any) => o.customer?.service_type !== 'سياحة داخلية' && o.customer?.client_type !== 'فوج')
      .map((o: any) => ({
        customer_id: o.customer_id,
        customer_name: o.customer?.name || '—',
        client_code: o.customer?.client_code || '—',
        booking_id: o.booking_id,
        workflow_stage: o.workflow_stage,
        destination: o.booking?.destination || o.booking?.package?.destination || (o.customer?.packages?.type === 'حج' ? 'مكة والمدينة (حج)' : o.customer?.packages?.type === 'عمرة' ? 'مكة والمدينة (عمرة)' : '—'),
        travel_date: o.travel_date || o.booking?.travel_date || '—',
        return_date: o.return_date || o.booking?.return_date || '—',
        pax_count: o.pax_count || o.booking?.pax_count || 1,
        passport_name: o.customer?.name || '—',
        visa_id: '',
        hotel_name: o.booking?.hotel?.name || o.booking?.package?.hotel?.name || (o.customer?.hotel_makkah ? `${o.customer.hotel_makkah}${o.customer.hotel_madinah ? ' / ' + o.customer.hotel_madinah : ''}` : o.customer?.hotel_madinah || '—'),
        package_name: o.booking?.package?.name || o.customer?.packages?.name || '—',
        notes: o.notes || '',
        is_archived: o.customer?.is_archived || false,
        customer: o.customer,
        booking: o.booking
      }));
    setReadyCustomers(opsData);
    setLoading(false);
  };

  const handleDeleteReadyCustomer = async (r: typeof readyCustomers[0]) => {
    if (!confirm(`هل أنت متأكد من إرجاع العميل "${r.customer_name}" إلى قسم التشغيل وإلغاء تحويله للطيران؟`)) return;
    const { error } = await supabase.from('operation_files').update({ workflow_stage: 'operations' }).eq('customer_id', r.customer_id);
    if (error) {
      alert('فشل الإرجاع: ' + error.message);
      return;
    }
    setReadyCustomers(prev => prev.filter(c => c.customer_id !== r.customer_id));
    alert('تم إرجاع العميل إلى قسم التشغيل بنجاح.');
  };

  const filteredReady = readyCustomers.filter((r: any) => {
    if (r.is_archived && !search) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.customer_name.toLowerCase().includes(q) && !r.client_code.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredTickets = tickets.filter(t => {
    if (t.customers?.is_archived && !search) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.customers?.name?.toLowerCase().includes(q) && !(t.pnr || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const issueTicket = async () => {
    if (!form.customer_id || !ticketFile) {
      alert('يرجى اختيار العميل ورفع ملف التذكرة');
      return;
    }
    const ext = ticketFile.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
      alert('الملفات المدعومة: PDF, JPG, PNG فقط');
      return;
    }
    setSaving(true);

    const tempTicketId = crypto.randomUUID();
    const compressedFile = await compressImage(ticketFile);
    const cleanFileName = compressedFile.name.replace(/[^\x00-\x7F]/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filePath = `ticket-files/${tempTicketId}/${Date.now()}-${cleanFileName}`;
    
    const { error: upErr } = await supabase.storage.from('documents').upload(filePath, compressedFile);
    if (upErr) {
      alert('فشل رفع ملف التذكرة: ' + upErr.message);
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from('flight_tickets')
      .insert({
        id: tempTicketId,
        customer_id: form.customer_id,
        booking_id: form.booking_id || null,
        pnr: form.pnr || 'صادرة',
        airline: form.airline || '',
        flight_number: form.flight_number || '',
        departure_airport: form.departure_airport || '',
        arrival_airport: form.arrival_airport || '',
        departure_datetime: form.departure_datetime || null,
        return_datetime: form.return_datetime || null,
        ticket_file_path: filePath,
        ticket_file_name: ticketFile.name,
        issued_by: profile?.id || null,
        status: 'صادر',
      })
      .select('*, customers(*), bookings(*), user_profiles(*)')
      .single();

    if (error) {
      alert('خطأ في حفظ التذكرة: ' + error.message);
    } else if (data) {
      setTickets([data as FlightTicket, ...tickets]);
      // Update operation_files to return to operations
      await supabase.from('operation_files').update({
        workflow_stage: 'operations',
        file_status: 'بانتظار استكمال التشغيل'
      }).eq('customer_id', form.customer_id);
      
      setReadyCustomers(readyCustomers.filter(r => r.customer_id !== form.customer_id));
    }
    setForm(emptyForm);
    setTicketFile(null);
    setShowForm(false);
    setSaving(false);
  };

  const uploadTicketFile = async (file: File) => {
    if (!selectedTicket) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
      alert('الملفات المدعومة: PDF, JPG, PNG فقط');
      return;
    }
    setUploading(true);
    const compressedFile = await compressImage(file);
    const cleanFileName = compressedFile.name.replace(/[^\x00-\x7F]/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filePath = `ticket-files/${selectedTicket.id}/${Date.now()}-${cleanFileName}`;
    const { error: upErr } = await supabase.storage.from('documents').upload(filePath, compressedFile);
    if (upErr) { alert('فشل رفع الملف: ' + upErr.message); setUploading(false); return; }
    const { data } = await supabase
      .from('flight_tickets')
      .update({ ticket_file_path: filePath, ticket_file_name: compressedFile.name })
      .eq('id', selectedTicket.id)
      .select('*, customers(*), bookings(*), user_profiles(*)')
      .single();
    if (data) {
      setTickets(tickets.map(t => t.id === selectedTicket.id ? (data as FlightTicket) : t));
      setSelectedTicket(data as FlightTicket);

      // Return the file to operations stage
      if (selectedTicket.customer_id) {
        await supabase.from('operation_files').update({
          workflow_stage: 'operations',
          file_status: 'بانتظار استكمال التشغيل'
        }).eq('customer_id', selectedTicket.customer_id);

        setReadyCustomers(prev => prev.filter(r => r.customer_id !== selectedTicket.customer_id));
      }
    }
    setUploading(false);
  };

  const handleDeleteTicket = async (t: FlightTicket) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه التذكرة بالكامل؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    const { error } = await supabase.from('flight_tickets').delete().eq('id', t.id);
    if (error) {
      alert('خطأ في حذف التذكرة: ' + error.message);
      return;
    }
    if (t.ticket_file_path) {
      await supabase.storage.from('documents').remove([t.ticket_file_path]);
    }
    setTickets(tickets.filter(x => x.id !== t.id));
    if (selectedTicket?.id === t.id) setSelectedTicket(null);
  };

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('ar-EG') : '—';
  const fmtDateTime = (d?: string) => d ? new Date(d).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  const handleExportExcel = () => {
    const data = filteredTickets.map(t => ({
      'PNR': t.pnr,
      'اسم العميل': t.customers?.name || '—',
      'شركة الطيران': t.airline,
      'رقم الرحلة': t.flight_number,
      'مطار المغادرة': t.departure_airport,
      'مطار الوصول': t.arrival_airport,
      'تاريخ المغادرة': t.departure_datetime ? new Date(t.departure_datetime).toLocaleDateString('ar-EG') : '—',
      'رقم التذكرة الإلكترونية': t.e_ticket_number || '—',
    }));
    exportToExcel(data, 'تذاكر_الطيران');
  };

  const handleExportPDF = () => {
    const headers = ['PNR', 'اسم العميل', 'شركة الطيران', 'رقم الرحلة', 'المغادرة', 'الوصول', 'تاريخ المغادرة', 'رقم التذكرة'];
    const rows = filteredTickets.map(t => [
      t.pnr,
      t.customers?.name || '—',
      t.airline,
      t.flight_number,
      t.departure_airport,
      t.arrival_airport,
      t.departure_datetime ? new Date(t.departure_datetime).toLocaleDateString('ar-EG') : '—',
      t.e_ticket_number || '—',
    ]);
    exportToPDF('تقرير تذاكر الطيران الصادرة', headers, rows);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">قسم الطيران</h2>
          <p className="section-subtitle">إصدار تذاكر الطيران والملفات الجاهزة للإصدار</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <Download size={14} /> Excel
          </button>
          <button onClick={handleExportPDF} className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-red-200 text-red-700 hover:bg-red-50">
            <Download size={14} /> PDF
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-gold">
            <Plus size={16} /> إصدار تذكرة
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'جاهز للإصدار', value: readyCustomers.filter(r => r.workflow_stage === 'flight').length, icon: Clock, color: 'text-cyan-600 bg-cyan-100' },
          { label: 'تم الإصدار', value: tickets.length, icon: Ticket, color: 'text-emerald-600 bg-emerald-100' },
          { label: 'جاهز للسفر', value: readyCustomers.filter(r => r.workflow_stage === 'ready').length, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100' },
          { label: 'إجمالي العملاء', value: readyCustomers.length, icon: User, color: 'text-navy-600 bg-navy-100' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="stat-card">
              <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-1.5`}>
                <Icon size={16} />
              </div>
              <p className="text-xl font-black text-navy-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالعميل، Client Code، أو PNR..." className="form-input pr-9" />
        </div>
      </div>

      {/* Ready for ticketing section */}
      <div>
        <h3 className="text-sm font-bold text-navy-800 mb-3 flex items-center gap-2">
          <Clock size={16} className="text-cyan-500" /> ملفات جاهزة لإصدار التذاكر
        </h3>
        {filteredReady.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-12 text-gray-400">
            <Plane size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">لا توجد ملفات جاهزة للإصدار</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReady.map(r => {
              const stage = stageLabels[r.workflow_stage] || stageLabels.new;
              return (
                <div key={r.customer_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center flex-shrink-0"><Plane size={18} className="text-cyan-600" /></div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-navy-900 text-sm leading-tight">{r.customer_name}</p>
                          {r.customer && (
                            <button
                              onClick={() => setDetailCustomer(r.customer)}
                              title="عرض تفاصيل العميل بالكامل"
                              className="p-1 rounded hover:bg-cyan-100 text-cyan-700 transition-colors flex-shrink-0"
                            >
                              <Eye size={13} />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{r.client_code}</p>
                      </div>
                    </div>
                    <span className={`badge text-xs ${stage.color}`}>{stage.label}</span>
                  </div>
                  <div className="space-y-1.5 text-xs border-b border-gray-100 pb-2.5 mb-2.5">
                    <div className="flex justify-between"><span className="text-gray-400">الباقة</span><span className="font-semibold text-navy-700">{r.package_name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">الفندق</span><span className="font-semibold text-navy-700">{r.hotel_name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">الوجهة</span><span className="font-semibold text-navy-700">{r.destination}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">تاريخ السفر</span><span className="font-semibold text-navy-700">{r.travel_date !== '—' ? fmtDate(r.travel_date) : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">المسافرين</span><span className="font-semibold text-navy-700">{r.pax_count}</span></div>
                  </div>
                  <div className="space-y-1.5 text-xs bg-navy-50/50 p-2.5 rounded-xl border border-navy-100/40 mb-2.5">
                    <div className="flex justify-between"><span className="text-gray-400 font-semibold">الهاتف</span><span className="font-semibold text-navy-800" dir="ltr">{r.customer?.phone || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400 font-semibold">رقم الهوية</span><span className="font-mono font-semibold text-navy-800">{r.customer?.national_id || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400 font-semibold">رقم الجواز</span><span className="font-mono font-semibold text-navy-800">{r.customer?.passport_number || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400 font-semibold">نوع الخدمة</span><span className="badge bg-blue-50 text-blue-700 font-semibold">{r.customer?.service_type || '—'}</span></div>
                  </div>
                  {r.notes && (
                    <div className="mt-2.5 bg-cyan-50/80 p-2.5 rounded-xl border border-cyan-100 text-[11px] text-navy-800">
                      <span className="font-bold text-cyan-800 block mb-0.5">📝 ملاحظات قسم التشغيل:</span>
                      <p className="leading-relaxed whitespace-pre-wrap">{r.notes}</p>
                    </div>
                  )}
                  {r.workflow_stage === 'flight' && (
                    <button
                      onClick={() => {
                        setForm({ ...emptyForm, customer_id: r.customer_id, booking_id: r.booking_id });
                        setShowForm(true);
                      }}
                      className="w-full btn-gold text-xs py-2 mt-3 flex items-center justify-center gap-1"
                    >
                      <Ticket size={13} /> إصدار تذكرة
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteReadyCustomer(r)}
                    title="إرجاع العميل إلى قسم التشغيل"
                    className="w-full text-xs py-2 mt-2 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-400 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Undo2 size={13} /> إرجاع لقسم التشغيل
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Issued tickets */}
      <div>
        <h3 className="text-sm font-bold text-navy-800 mb-3 flex items-center gap-2">
          <Ticket size={16} className="text-emerald-500" /> التذاكر الصادرة
        </h3>
        {filteredTickets.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-12 text-gray-400">
            <Ticket size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">لا توجد تذاكر صادرة</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
            <table className="w-full data-table min-w-[900px]">
              <thead>
                <tr>
                  <th>PNR</th><th>العميل</th><th>شركة الطيران</th><th>رقم الرحلة</th>
                  <th>المغادرة</th><th>الوصول</th><th>تاريخ المغادرة</th><th>رقم التذكرة</th><th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(t => (
                  <tr key={t.id} className="cursor-pointer hover:bg-gray-50/50" onClick={() => setSelectedTicket(t)}>
                    <td><span className="font-mono font-bold text-cyan-700">{t.pnr || '—'}</span></td>
                    <td className="font-semibold text-navy-900">{t.customers?.name || '—'}</td>
                    <td className="text-gray-600">{t.airline || '—'}</td>
                    <td className="text-gray-600">{t.flight_number || '—'}</td>
                    <td className="text-gray-600 text-xs">{t.departure_airport || '—'}</td>
                    <td className="text-gray-600 text-xs">{t.arrival_airport || '—'}</td>
                    <td className="text-gray-500 text-xs">{fmtDateTime(t.departure_datetime)}</td>
                    <td className="font-mono text-xs text-navy-600">{t.e_ticket_number || '—'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelectedTicket(t)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="تفاصيل التذكرة"><Eye size={15} /></button>
                        {t.customers && (
                          <button onClick={() => setDetailCustomer(t.customers)} className="p-1.5 rounded-lg hover:bg-navy-50 text-navy-600" title="بيانات العميل بالكامل"><User size={15} /></button>
                        )}
                        <button onClick={() => handleDeleteTicket(t)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="حذف التذكرة"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2"><Ticket size={20} className="text-cyan-500" /> إصدار تذكرة طيران</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Select Customer if empty */}
              {!form.customer_id ? (
                <div>
                  <label className="form-label">العميل المرتبط <span className="text-red-500">*</span></label>
                  <select
                    value={form.customer_id}
                    onChange={(e) => {
                      const sel = readyCustomers.find(r => r.customer_id === e.target.value);
                      setForm({ ...form, customer_id: e.target.value, booking_id: sel?.booking_id || '' });
                    }}
                    className="form-input"
                  >
                    <option value="">اختر العميل</option>
                    {/* First: customers in flight workflow stage */}
                    {readyCustomers.filter(r => r.workflow_stage === 'flight').length > 0 && (
                      <optgroup label="▸ جاهزون للطيران (من التشغيل)">
                        {readyCustomers.filter(r => r.workflow_stage === 'flight').map(r => (
                          <option key={r.customer_id} value={r.customer_id}>{r.customer_name} ({r.client_code})</option>
                        ))}
                      </optgroup>
                    )}
                    {/* All customers fallback */}
                    <optgroup label="▸ جميع العملاء">
                      {allCustomers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}{c.client_code ? ` (${c.client_code})` : ''}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">العميل المحدد</p>
                    <p className="font-bold text-navy-950 text-sm">
                      {readyCustomers.find(r => r.customer_id === form.customer_id)?.customer_name ||
                        allCustomers.find(c => c.id === form.customer_id)?.name || 'عميل'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gold-600 bg-gold-50 px-2 py-1 rounded">
                      {readyCustomers.find(r => r.customer_id === form.customer_id)?.client_code ||
                        allCustomers.find(c => c.id === form.customer_id)?.client_code || ''}
                    </span>
                    <button type="button" onClick={() => setForm({ ...form, customer_id: '', booking_id: '' })} className="text-xs text-red-500 hover:text-red-700 underline">تغيير</button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">PNR (رمز الحجز)</label>
                  <input value={form.pnr} onChange={(e) => setForm({ ...form, pnr: e.target.value })} className="form-input" placeholder="مثال: ABC123" />
                </div>
                <div>
                  <label className="form-label">شركة الطيران</label>
                  <input value={form.airline} onChange={(e) => setForm({ ...form, airline: e.target.value })} className="form-input" placeholder="مثال: EgyptAir" />
                </div>
                <div>
                  <label className="form-label">رقم الرحلة</label>
                  <input value={form.flight_number} onChange={(e) => setForm({ ...form, flight_number: e.target.value })} className="form-input" placeholder="مثال: MS123" />
                </div>
                <div>
                  <label className="form-label">مطار المغادرة</label>
                  <input value={form.departure_airport} onChange={(e) => setForm({ ...form, departure_airport: e.target.value })} className="form-input" placeholder="مثال: CAI" />
                </div>
                <div>
                  <label className="form-label">مطار الوصول</label>
                  <input value={form.arrival_airport} onChange={(e) => setForm({ ...form, arrival_airport: e.target.value })} className="form-input" placeholder="مثال: JED" />
                </div>
                <div>
                  <label className="form-label">تاريخ ووقت المغادرة</label>
                  <input type="datetime-local" value={form.departure_datetime} onChange={(e) => setForm({ ...form, departure_datetime: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">تاريخ ووقت العودة (اختياري)</label>
                  <input type="datetime-local" value={form.return_datetime} onChange={(e) => setForm({ ...form, return_datetime: e.target.value })} className="form-input" />
                </div>
              </div>

              {/* Upload Flight Ticket File (Required) */}
              <div>
                <label className="form-label">ملف التذكرة (صورة أو PDF) <span className="text-red-500">*</span></label>
                {ticketFile ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={16} className="text-emerald-600 flex-shrink-0" />
                      <p className="text-xs font-semibold text-emerald-800 truncate">{ticketFile.name}</p>
                    </div>
                    <button type="button" onClick={() => setTicketFile(null)} className="p-1 rounded text-red-500 hover:bg-red-50"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,image/*"
                      onChange={(e) => setTicketFile(e.target.files?.[0] || null)}
                      className="form-input text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="btn-outline">إلغاء</button>
              <button onClick={issueTicket} disabled={saving || !ticketFile} className="btn-gold">
                {saving ? (
                  <span className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> جارٍ الرفع والإصدار...</span>
                ) : 'إصدار التذكرة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket detail modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTicket(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-navy p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center"><Plane size={22} /></div>
                  <div>
                    <h3 className="font-bold text-lg">{selectedTicket.customers?.name || '—'}</h3>
                    <p className="text-xs text-cyan-300 font-mono">PNR: {selectedTicket.pnr}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="p-1 rounded-lg hover:bg-white/10"><X size={18} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'شركة الطيران', value: selectedTicket.airline },
                  { label: 'رقم الرحلة', value: selectedTicket.flight_number },
                  { label: 'مطار المغادرة', value: selectedTicket.departure_airport },
                  { label: 'مطار الوصول', value: selectedTicket.arrival_airport },
                  { label: 'المغادرة', value: fmtDateTime(selectedTicket.departure_datetime) },
                  { label: 'العودة', value: fmtDateTime(selectedTicket.return_datetime) },
                  { label: 'رقم التذكرة', value: selectedTicket.e_ticket_number },
                  { label: 'أصدر بواسطة', value: selectedTicket.user_profiles?.name || '—' },
                ].map(r => (
                  <div key={r.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{r.label}</p>
                    <p className="text-sm font-semibold text-navy-900">{r.value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Ticket file upload */}
              <div>
                <h4 className="text-sm font-bold text-navy-800 mb-3 flex items-center gap-2"><FileText size={15} className="text-gold-500" /> ملف التذكرة</h4>
                {selectedTicket.ticket_file_path ? (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center"><FileText size={16} className="text-red-500" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy-900 truncate">{selectedTicket.ticket_file_name}</p>
                    </div>
                    <button onClick={async () => { const { data } = await supabase.storage.from('documents').createSignedUrl(selectedTicket.ticket_file_path!, 3600); if (data) window.open(data.signedUrl); }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"><Eye size={14} /></button>
                    <button onClick={async () => { const { data } = await supabase.storage.from('documents').download(selectedTicket.ticket_file_path!); if (data) { const url = URL.createObjectURL(data); const a = document.createElement('a'); a.href = url; a.download = selectedTicket.ticket_file_name!; a.click(); } }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"><Download size={14} /></button>
                    <button onClick={() => fileRef.current?.click()} className="p-1.5 hover:bg-gray-200 rounded-lg text-blue-500"><Upload size={14} /></button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full border-2 border-dashed border-gray-300 hover:border-navy-400 rounded-xl py-6 flex flex-col items-center gap-2">
                    {uploading ? <Loader2 size={20} className="animate-spin text-navy-600" /> : <><Upload size={20} className="text-gray-400" /><p className="text-sm text-gray-500">رفع ملف التذكرة (PDF/JPG/PNG)</p></>}
                  </button>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadTicketFile(f); e.target.value = ''; }} />
              </div>

              {selectedTicket.customer_id && (
                <button onClick={() => onNavigate('customer-details', selectedTicket.customer_id)} className="text-xs text-navy-600 font-semibold hover:underline">عرض ملف العميل ←</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer details modal */}
      {detailCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setDetailCustomer(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-fadeIn max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-navy-900 text-white rounded-t-3xl">
              <div>
                <h3 className="text-lg font-bold">{detailCustomer.name}</h3>
                <p className="text-xs text-navy-200 font-mono mt-0.5">{detailCustomer.client_code || 'بدون كود'}</p>
              </div>
              <button onClick={() => setDetailCustomer(null)} className="p-1.5 rounded-xl hover:bg-white/10 text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-right text-xs">
              {/* Section 1: Personal Info */}
              <div>
                <h4 className="font-bold text-navy-800 text-sm border-b border-gray-100 pb-2 mb-3 flex items-center gap-2">
                  <User size={16} className="text-gold-500" /> البيانات الشخصية
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div><span className="text-gray-400 block mb-0.5">الهاتف</span><span className="font-semibold text-gray-800 text-sm" dir="ltr">{detailCustomer.phone || '—'}</span></div>
                  <div><span className="text-gray-400 block mb-0.5">واتساب</span><span className="font-semibold text-gray-800 text-sm" dir="ltr">{detailCustomer.whatsapp || '—'}</span></div>
                  <div><span className="text-gray-400 block mb-0.5">البريد الإلكتروني</span><span className="font-semibold text-gray-800 text-sm">{detailCustomer.email || '—'}</span></div>
                  <div><span className="text-gray-400 block mb-0.5">الجنس</span><span className="font-semibold text-gray-800 text-sm">{detailCustomer.gender || '—'}</span></div>
                  <div><span className="text-gray-400 block mb-0.5">تاريخ الميلاد</span><span className="font-semibold text-gray-800 text-sm">{detailCustomer.birth_date || '—'}</span></div>
                  <div><span className="text-gray-400 block mb-0.5">الجنسية</span><span className="font-semibold text-gray-800 text-sm">{detailCustomer.nationality || '—'}</span></div>
                  <div><span className="text-gray-400 block mb-0.5">المحافظة</span><span className="font-semibold text-gray-800 text-sm">{detailCustomer.governorate || '—'}</span></div>
                  <div><span className="text-gray-400 block mb-0.5">المدينة</span><span className="font-semibold text-gray-800 text-sm">{detailCustomer.city || '—'}</span></div>
                  <div><span className="text-gray-400 block mb-0.5">الدولة</span><span className="font-semibold text-gray-800 text-sm">{detailCustomer.country || '—'}</span></div>
                </div>
              </div>

              {/* Section 2: Passport & National ID */}
              <div>
                <h4 className="font-bold text-navy-800 text-sm border-b border-gray-100 pb-2 mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-gold-500" /> الهوية وجواز السفر
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2"><span className="text-gray-400 block mb-0.5">رقم الهوية الوطنية</span><span className="font-mono font-semibold text-gray-800 text-sm">{detailCustomer.national_id || '—'}</span></div>
                  <div className="col-span-2"><span className="text-gray-400 block mb-0.5">رقم جواز السفر</span><span className="font-mono font-semibold text-gray-800 text-sm">{detailCustomer.passport_number || '—'}</span></div>
                  <div className="col-span-2"><span className="text-gray-400 block mb-0.5">تاريخ إصدار جواز السفر</span><span className="font-semibold text-gray-800 text-sm">{detailCustomer.passport_issue_date || '—'}</span></div>
                  <div className="col-span-2"><span className="text-gray-400 block mb-0.5">تاريخ انتهاء جواز السفر</span><span className="font-semibold text-gray-800 text-sm">{detailCustomer.passport_expiry_date || '—'}</span></div>
                </div>
              </div>

              {/* Section 3: Trip & Housing */}
              <div>
                <h4 className="font-bold text-navy-800 text-sm border-b border-gray-100 pb-2 mb-3 flex items-center gap-2">
                  <Plane size={16} className="text-gold-500" /> تفاصيل الرحلة والتسكين
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div><span className="text-gray-400 block mb-0.5">الباقة المطلوبة</span><span className="font-semibold text-navy-800 text-xs bg-gold-50/70 border border-gold-200 px-2 py-0.5 rounded">{detailCustomer.packages?.name || '—'}</span></div>
                  <div><span className="text-gray-400 block mb-0.5">نوع الخدمة</span><span className="badge bg-blue-50 text-blue-700 font-semibold">{detailCustomer.service_type || '—'}</span></div>
                  <div><span className="text-gray-400 block mb-0.5">حالة المستندات</span><span className={`badge ${detailCustomer.documents_status === 'مكتمل' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{detailCustomer.documents_status || '—'}</span></div>
                  <div><span className="text-gray-400 block mb-0.5">متطلبات التأشيرة</span><span className="font-semibold text-gray-800">{detailCustomer.visa_requirement || '—'}</span></div>
                  <div><span className="text-gray-400 block mb-0.5">فندق مكة</span><span className="font-semibold text-gray-800">{detailCustomer.hotel_makkah || '—'}</span></div>
                  <div><span className="text-gray-400 block mb-0.5">غرفة مكة</span><span className="font-semibold text-gray-800">{detailCustomer.room_type_makkah || '—'}</span></div>
                  <div><span className="text-gray-400 block mb-0.5">فندق المدينة</span><span className="font-semibold text-gray-800">{detailCustomer.hotel_madinah || '—'}</span></div>
                  <div><span className="text-gray-400 block mb-0.5">غرفة المدينة</span><span className="font-semibold text-gray-800">{detailCustomer.room_type_madinah || '—'}</span></div>
                </div>
              </div>

              {/* Section: Uploaded Documents */}
              <div>
                <h4 className="font-bold text-navy-800 text-sm border-b border-gray-100 pb-2 mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-gold-500" /> المستندات المرفوعة للعميل
                </h4>
                {loadingDetailDocs ? (
                  <div className="flex items-center justify-center py-4 text-gray-500 gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>جاري تحميل المستندات...</span>
                  </div>
                ) : detailDocs.length === 0 ? (
                  <p className="text-gray-400 py-2">لا توجد مستندات مرفوعة لهذا العميل.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {detailDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-navy-600" />
                          <div className="text-right">
                            <span className="font-semibold text-gray-800 block text-xs">{doc.doc_type}</span>
                            <span className="text-[10px] text-gray-400 block truncate max-w-[150px]">{doc.file_name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600);
                              if (data) window.open(data.signedUrl);
                            }}
                            className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"
                            title="عرض"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const { data } = await supabase.storage.from('documents').download(doc.file_path);
                              if (data) {
                                const url = URL.createObjectURL(data);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = doc.file_name;
                                a.click();
                              }
                            }}
                            className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"
                            title="تحميل"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 4: Notes */}
              {detailCustomer.notes && (
                <div>
                  <h4 className="font-bold text-navy-800 text-sm border-b border-gray-100 pb-2 mb-2">📝 ملاحظات إضافية</h4>
                  <p className="bg-gray-50 p-3 rounded-2xl text-gray-700 leading-relaxed font-medium">{detailCustomer.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-gray-100 flex justify-end flex-shrink-0 bg-gray-50 rounded-b-3xl">
              <button onClick={() => setDetailCustomer(null)} className="btn-navy py-2 px-6 text-sm rounded-xl">
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
