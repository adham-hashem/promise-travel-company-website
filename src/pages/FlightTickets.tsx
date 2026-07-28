import { useEffect, useState, useRef } from 'react';
import {
  Plane, Plus, X, Loader2, Search, Upload, Eye, Download,
  FileText, CheckCircle2, Clock, User, Ticket, Undo2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
  const [readyCustomers, setReadyCustomers] = useState<Array<{ customer_id: string; customer_name: string; client_code: string; booking_id: string; workflow_stage: string; destination: string; travel_date: string; return_date: string; pax_count: number; passport_name: string; visa_id: string; hotel_name: string; package_name: string; notes?: string }>>([]);
  const [allCustomers, setAllCustomers] = useState<Array<{ id: string; name: string; client_code: string }>>([]);
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

  const load = async () => {
    setLoading(true);
    const [ticketRes, opsRes, custRes] = await Promise.all([
      supabase.from('flight_tickets').select('*, customers(*), bookings(*), user_profiles(*)').order('created_at', { ascending: false }),
      supabase.from('operation_files').select(`
        *,
        customer:customers(*),
        booking:bookings(*, package:packages(*)),
        hotel:hotels(*)
      `).in('workflow_stage', ['flight', 'ready', 'completed']).order('created_at', { ascending: false }),
      supabase.from('customers').select('id, name, client_code').order('name', { ascending: true }),
    ]);

    if (opsRes.error) {
      console.error('[FlightTickets] Error fetching ops data:', opsRes.error);
    }

    setTickets((ticketRes.data as FlightTicket[]) || []);
    setAllCustomers((custRes.data || []).map((c: any) => ({ id: c.id, name: c.name || '—', client_code: c.client_code || '' })));
    const opsData = (opsRes.data || []).map((o: any) => ({
      customer_id: o.customer_id,
      customer_name: o.customer?.name || '—',
      client_code: o.customer?.client_code || '—',
      booking_id: o.booking_id,
      workflow_stage: o.workflow_stage,
      destination: o.booking?.destination || o.booking?.package?.destination || '—',
      travel_date: o.travel_date || o.booking?.travel_date || '—',
      return_date: o.return_date || o.booking?.return_date || '—',
      pax_count: o.pax_count || o.booking?.pax_count || 1,
      passport_name: o.customer?.name || '—',
      visa_id: '',
      hotel_name: o.booking?.hotel?.name || o.booking?.package?.hotel?.name || '—',
      package_name: o.booking?.package?.name || '—',
      notes: o.notes || '',
    }));
    setReadyCustomers(opsData);
    setLoading(false);
  };

  // Workflow stages ordered sequence for revert logic
  const workflowStagesOrder = ['new', 'accounts', 'operations', 'visa', 'flight', 'ready', 'completed'];
  const stageArabicNames: Record<string, string> = {
    new: 'جديد', accounts: 'الحسابات', operations: 'التشغيل', visa: 'التأشيرة',
    flight: 'الطيران', ready: 'جاهز للسفر', completed: 'مكتمل',
  };

  const revertCustomerStage = async (r: typeof readyCustomers[0]) => {
    const currentIdx = workflowStagesOrder.indexOf(r.workflow_stage);
    if (currentIdx <= 0) return;
    const prevStage = workflowStagesOrder[currentIdx - 1];
    const currentLabel = stageArabicNames[r.workflow_stage] || r.workflow_stage;
    const prevLabel = stageArabicNames[prevStage] || prevStage;
    const confirmMsg = `هل تريد إلغاء مرحلة "${currentLabel}" وإرجاع العميل "${r.customer_name}" إلى مرحلة "${prevLabel}"؟\n\nسيتم إلغاء جميع المراحل اللاحقة تلقائياً.`;
    if (!window.confirm(confirmMsg)) return;
    // Find the operation_file by customer_id to update its workflow_stage
    const { error } = await supabase
      .from('operation_files')
      .update({ workflow_stage: prevStage })
      .eq('customer_id', r.customer_id);
    if (error) {
      alert('فشل إرجاع المرحلة: ' + error.message);
      return;
    }
    // Update local state — if reverting to a stage before 'flight', remove from list; otherwise update
    const prevIdx = workflowStagesOrder.indexOf(prevStage);
    const flightIdx = workflowStagesOrder.indexOf('flight');
    if (prevIdx < flightIdx) {
      // Customer no longer in flight+ stages, remove from the readyCustomers list
      setReadyCustomers(prev => prev.filter(c => c.customer_id !== r.customer_id));
    } else {
      setReadyCustomers(prev => prev.map(c => c.customer_id === r.customer_id ? { ...c, workflow_stage: prevStage } : c));
    }
  };

  const filteredReady = readyCustomers.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      if (!r.customer_name.toLowerCase().includes(q) && !r.client_code.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredTickets = tickets.filter(t => {
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
    const cleanFileName = ticketFile.name.replace(/[^\x00-\x7F]/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filePath = `ticket-files/${tempTicketId}/${Date.now()}-${cleanFileName}`;
    
    const { error: upErr } = await supabase.storage.from('documents').upload(filePath, ticketFile);
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
      setReadyCustomers(readyCustomers.map(r => r.customer_id === form.customer_id ? { ...r, workflow_stage: 'ready' } : r));
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
    const cleanFileName = file.name.replace(/[^\x00-\x7F]/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filePath = `ticket-files/${selectedTicket.id}/${Date.now()}-${cleanFileName}`;
    const { error: upErr } = await supabase.storage.from('documents').upload(filePath, file);
    if (upErr) { alert('فشل رفع الملف: ' + upErr.message); setUploading(false); return; }
    const { data } = await supabase
      .from('flight_tickets')
      .update({ ticket_file_path: filePath, ticket_file_name: file.name })
      .eq('id', selectedTicket.id)
      .select('*, customers(*), bookings(*), user_profiles(*)')
      .single();
    if (data) {
      setTickets(tickets.map(t => t.id === selectedTicket.id ? (data as FlightTicket) : t));
      setSelectedTicket(data as FlightTicket);
    }
    setUploading(false);
  };

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('ar-EG') : '—';
  const fmtDateTime = (d?: string) => d ? new Date(d).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">قسم الطيران</h2>
          <p className="section-subtitle">إصدار تذاكر الطيران والملفات الجاهزة للإصدار</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-gold">
          <Plus size={16} /> إصدار تذكرة
        </button>
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
                      <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center"><Plane size={18} className="text-cyan-600" /></div>
                      <div>
                        <p className="font-bold text-navy-900 text-sm">{r.customer_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{r.client_code}</p>
                      </div>
                    </div>
                    <span className={`badge text-xs ${stage.color}`}>{stage.label}</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-gray-400">الباقة</span><span className="font-semibold text-navy-700">{r.package_name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">الفندق</span><span className="font-semibold text-navy-700">{r.hotel_name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">الوجهة</span><span className="font-semibold text-navy-700">{r.destination}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">تاريخ السفر</span><span className="font-semibold text-navy-700">{r.travel_date !== '—' ? fmtDate(r.travel_date) : '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">المسافرين</span><span className="font-semibold text-navy-700">{r.pax_count}</span></div>
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
                    onClick={() => revertCustomerStage(r)}
                    title={`إرجاع العميل من مرحلة ${stageArabicNames[r.workflow_stage] || r.workflow_stage}`}
                    className="w-full text-xs py-2 mt-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Undo2 size={13} /> إرجاع لمرحلة سابقة
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
                      <button onClick={() => setSelectedTicket(t)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><Eye size={15} /></button>
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

              <div>
                <label className="form-label">PNR (رمز الحجز)</label>
                <input value={form.pnr} onChange={(e) => setForm({ ...form, pnr: e.target.value })} className="form-input" placeholder="مثال: ABC123" />
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
    </div>
  );
}
