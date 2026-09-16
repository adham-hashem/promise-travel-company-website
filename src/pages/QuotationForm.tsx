import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Calendar, CheckCircle2, Copy, Edit3, Eye, FileCheck, FileText, History, Hotel, Plus, Printer, RefreshCw, Save, Search, Trash2, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Customer } from '../types';

type QuotationKind = 'program' | 'services';
type QuotationStatus = 'draft' | 'issued' | 'converted';

interface QuotationServiceItem {
  id: string;
  serviceName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
}

interface ProgramGrade {
  id: string;
  name: string;
  is_active: boolean;
}

interface SavedQuotation {
  id: string;
  quotation_number: string;
  customer_id: string;
  quotation_type: QuotationKind;
  title: string;
  quotation_date: string;
  valid_until?: string | null;
  program_section?: string | null;
  program_grade?: string | null;
  departure_date?: string | null;
  return_date?: string | null;
  days_count?: number | null;
  nights_count?: number | null;
  program_details?: string | null;
  hotel_details?: string | null;
  flight_details?: string | null;
  transport_details?: string | null;
  payment_policy?: string | null;
  terms_and_conditions?: string | null;
  subtotal: number;
  total_discount: number;
  total_tax: number;
  total_amount: number;
  status: QuotationStatus | 'cancelled';
  created_at: string;
  updated_at: string;
  customers?: Pick<Customer, 'name' | 'phone' | 'client_code'>;
  quotation_items?: Array<{
    service_name: string;
    description?: string | null;
    quantity: number;
    unit_price: number;
    discount: number;
    tax: number;
    line_total: number;
    sort_order: number;
  }>;
}

const defaultProgramGrades = ['VIP', '4 نجوم', 'اقتصادي مميز', 'اقتصادي عادي'];
const serviceSuggestions = ['تأشيرة', 'حجز طيران', 'حجز فندق', 'تذاكر ذهاب وعودة', 'مواصلات', 'قطار', 'استقبال وتوديع', 'تأمين سفر'];

const newItem = (serviceName = ''): QuotationServiceItem => ({
  id: crypto.randomUUID(),
  serviceName,
  description: '',
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  tax: 0,
});

const lineTotal = (item: QuotationServiceItem) =>
  Math.max(0, (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) - (Number(item.discount) || 0) + (Number(item.tax) || 0));

const money = (value: number) => `${value.toLocaleString('ar-EG')} ج.م`;

export default function QuotationForm() {
  const { profile, can } = useAuth();
  const canEditQuotation = can('inquiries_edit') || can('customers_edit');
  const canManageGrades = can('settings_edit');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [programGrades, setProgramGrades] = useState<ProgramGrade[]>([]);
  const [newGradeName, setNewGradeName] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [savedQuotationId, setSavedQuotationId] = useState<string | null>(null);
  const [quotationHistory, setQuotationHistory] = useState<SavedQuotation[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [form, setForm] = useState({
    quotationKind: 'services' as QuotationKind,
    quotationDate: new Date().toISOString().split('T')[0],
    validUntil: '',
    customerId: '',
    clientName: '',
    title: '',
    programSection: 'سياحة خارجية',
    programGrade: 'VIP',
    departureDate: '',
    returnDate: '',
    daysCount: 0,
    nightsCount: 0,
    programDetails: '',
    hotelDetails: '',
    flightDetails: '',
    transportDetails: '',
    paymentPolicy: 'يتم تحديد طريقة السداد طبقًا للاتفاق النهائي مع العميل.',
    termsAndConditions: 'الأسعار قابلة للتغيير حسب توافر الخدمة وتحديثات شركات الطيران والفنادق والجهات الرسمية.',
  });
  const [items, setItems] = useState<QuotationServiceItem[]>([newItem()]);

  useEffect(() => {
    supabase.from('customers').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setCustomers((data as Customer[]) || []);
    });

    loadProgramGrades();
    loadQuotationHistory();
  }, []);

  const selectedCustomer = customers.find((customer) => customer.id === form.customerId);
  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return customers.slice(0, 8);
    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(query)
      || customer.phone?.includes(query)
      || customer.client_code?.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [customers, customerSearch]);

  const activeItems = items.filter((item) => item.serviceName.trim() || item.description.trim() || lineTotal(item) > 0);
  const subtotal = activeItems.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0);
  const totalDiscount = activeItems.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
  const totalTax = activeItems.reduce((sum, item) => sum + (Number(item.tax) || 0), 0);
  const total = activeItems.reduce((sum, item) => sum + lineTotal(item), 0);
  const filteredQuotationHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();
    if (!query) return quotationHistory;
    return quotationHistory.filter((quote) => {
      const services = (quote.quotation_items || []).map((item) => item.service_name).join(' ');
      return [
        quote.quotation_number,
        quote.title,
        quote.program_section || '',
        quote.program_grade || '',
        quote.quotation_date,
        quote.customers?.name || '',
        services,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [quotationHistory, historySearch]);

  const updateField = (name: string, value: string | number) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updateItem = (id: string, field: keyof QuotationServiceItem, value: string | number) => {
    setItems((current) => current.map((item) => (
      item.id === id
        ? { ...item, [field]: ['quantity', 'unitPrice', 'discount', 'tax'].includes(field) ? Number(value) || 0 : value }
        : item
    )));
  };

  const validate = () => {
    if (!form.customerId) return 'اختر العميل المرتبط بعرض السعر.';
    if (!form.title.trim()) return 'اكتب عنوان عرض السعر.';
    if (activeItems.length === 0) return 'أضف خدمة واحدة على الأقل.';
    if (activeItems.some((item) => !item.serviceName.trim())) return 'كل بند يجب أن يحتوي على اسم الخدمة.';
    return '';
  };

  const loadProgramGrades = async () => {
    const { data } = await supabase
      .from('quotation_program_grades')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    const loaded = (data as ProgramGrade[] | null) || [];
    setProgramGrades(loaded.length ? loaded : defaultProgramGrades.map((name) => ({ id: name, name, is_active: true })));
  };

  const loadQuotationHistory = async () => {
    const { data } = await supabase
      .from('quotations')
      .select('*, customers(name, phone, client_code), quotation_items(*)')
      .order('updated_at', { ascending: false });
    setQuotationHistory((data as SavedQuotation[] | null) || []);
  };

  const applyQuotationToForm = (quote: SavedQuotation, mode: 'edit' | 'clone' | 'view' = 'edit') => {
    setSavedQuotationId(mode === 'clone' ? null : quote.id);
    setCustomerSearch(`${quote.customers?.name || ''} ${quote.customers?.client_code ? `(${quote.customers.client_code})` : ''}`.trim());
    setForm({
      quotationKind: quote.quotation_type,
      quotationDate: mode === 'clone' ? new Date().toISOString().split('T')[0] : quote.quotation_date,
      validUntil: quote.valid_until || '',
      customerId: quote.customer_id,
      clientName: quote.customers?.name || '',
      title: mode === 'clone' ? `${quote.title} - نسخة جديدة` : quote.title,
      programSection: quote.program_section || 'سياحة خارجية',
      programGrade: quote.program_grade || 'VIP',
      departureDate: quote.departure_date || '',
      returnDate: quote.return_date || '',
      daysCount: Number(quote.days_count || 0),
      nightsCount: Number(quote.nights_count || 0),
      programDetails: quote.program_details || '',
      hotelDetails: quote.hotel_details || '',
      flightDetails: quote.flight_details || '',
      transportDetails: quote.transport_details || '',
      paymentPolicy: quote.payment_policy || 'يتم تحديد طريقة السداد طبقًا للاتفاق النهائي مع العميل.',
      termsAndConditions: quote.terms_and_conditions || 'الأسعار قابلة للتغيير حسب توافر الخدمة وتحديثات شركات الطيران والفنادق والجهات الرسمية.',
    });
    const loadedItems = (quote.quotation_items || [])
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .map((item) => ({
        id: crypto.randomUUID(),
        serviceName: item.service_name,
        description: item.description || '',
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unit_price || 0),
        discount: Number(item.discount || 0),
        tax: Number(item.tax || 0),
      }));
    setItems(loadedItems.length ? loadedItems : [newItem()]);
  };

  const saveQuotationVersion = async (quotationId: string) => {
    const quote = quotationHistory.find((entry) => entry.id === quotationId);
    if (!quote) return;
    await supabase.from('quotation_versions').insert({
      quotation_id: quote.id,
      version_number: Date.now(),
      snapshot: quote,
      created_by: profile?.id || null,
    });
  };

  const printSavedQuotation = (quote: SavedQuotation) => {
    const win = window.open('', '_blank');
    if (!win) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }
    const rows = (quote.quotation_items || []).map((item) => `
      <tr>
        <td>${item.service_name}</td>
        <td>${item.description || '—'}</td>
        <td>${item.quantity}</td>
        <td>${money(Number(item.unit_price || 0))}</td>
        <td>${Number(item.discount || 0) > 0 ? money(Number(item.discount || 0)) : '—'}</td>
        <td>${Number(item.tax || 0) > 0 ? money(Number(item.tax || 0)) : '—'}</td>
        <td><strong>${money(Number(item.line_total || 0))}</strong></td>
      </tr>
    `).join('');
    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>${quote.title}</title><style>
      *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      @page{size:A4;margin:12mm}body{margin:0;color:#183b38;font-family:Cairo,Tahoma,Arial,sans-serif;line-height:1.6}
      main{max-width:190mm;margin:0 auto}.header{border-bottom:3px solid #0f5f56;padding-bottom:14px;margin-bottom:18px}
      h1{margin:0;color:#0b4f48;font-size:25px}.muted{color:#5d7773;font-size:12px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:12px 0}
      .box{border:1px solid #cce2de;background:#f4fbf9;border-radius:8px;padding:8px 10px;font-size:12px}.box strong{display:block;color:#0b4f48}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}th{background:#0f5f56;color:white;padding:9px;text-align:right}td{border:1px solid #cce2de;padding:8px}
      .total{background:#0f5f56;color:white;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;margin-top:10px;font-weight:900}.total span:last-child{color:#e4c766;font-size:22px}
      .text{border:1px solid #cce2de;border-radius:8px;padding:10px;white-space:pre-wrap;font-size:12px;margin-top:12px}
    </style></head><body><main>
      <div class="header"><h1>${quote.quotation_type === 'program' ? 'عرض سعر برنامج سياحي' : 'عرض سعر خدمات سياحية'}</h1><div class="muted">PROMISE TRAVEL - بروميس للسياحة والسفر</div></div>
      <div class="grid">
        <div class="box"><strong>رقم العرض</strong>${quote.quotation_number}</div>
        <div class="box"><strong>العميل</strong>${quote.customers?.name || '—'}</div>
        <div class="box"><strong>التاريخ</strong>${new Date(quote.quotation_date).toLocaleDateString('ar-EG')}</div>
        <div class="box"><strong>نوع العرض</strong>${quote.quotation_type === 'program' ? 'برنامج رحلة كامل' : 'خدمات منفصلة'}</div>
      </div>
      <h2>${quote.title}</h2>
      ${quote.program_details ? `<div class="text"><strong>تفاصيل البرنامج</strong><br>${quote.program_details}</div>` : ''}
      <table><thead><tr><th>الخدمة</th><th>الوصف</th><th>العدد</th><th>سعر الوحدة</th><th>الخصم</th><th>الضريبة</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="total"><span>الإجمالي النهائي لعرض السعر</span><span>${money(Number(quote.total_amount || 0))}</span></div>
      ${quote.payment_policy ? `<div class="text"><strong>سياسة السداد</strong><br>${quote.payment_policy}</div>` : ''}
      ${quote.terms_and_conditions ? `<div class="text"><strong>الشروط والأحكام</strong><br>${quote.terms_and_conditions}</div>` : ''}
    </main></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const addProgramGrade = async () => {
    const name = newGradeName.trim();
    if (!name) return;
    const { error } = await supabase.from('quotation_program_grades').insert({
      name,
      sort_order: programGrades.length + 1,
      is_active: true,
    });
    if (error) {
      alert('تعذر إضافة درجة البرنامج: ' + error.message);
      return;
    }
    setNewGradeName('');
    loadProgramGrades();
  };

  const archiveProgramGrade = async (grade: ProgramGrade) => {
    if (!confirm(`هل تريد إخفاء درجة البرنامج "${grade.name}" من عروض السعر الجديدة؟`)) return;
    const { error } = await supabase.from('quotation_program_grades').update({ is_active: false }).eq('id', grade.id);
    if (error) {
      alert('تعذر تعديل درجة البرنامج: ' + error.message);
      return;
    }
    loadProgramGrades();
  };

  const resetForm = () => {
    if (!confirm('هل أنت متأكد من إعادة تعيين عرض السعر؟')) return;
    setSavedQuotationId(null);
    setCustomerSearch('');
    setForm({
      quotationKind: 'services',
      quotationDate: new Date().toISOString().split('T')[0],
      validUntil: '',
      customerId: '',
      clientName: '',
      title: '',
      programSection: 'سياحة خارجية',
      programGrade: 'VIP',
      departureDate: '',
      returnDate: '',
      daysCount: 0,
      nightsCount: 0,
      programDetails: '',
      hotelDetails: '',
      flightDetails: '',
      transportDetails: '',
      paymentPolicy: 'يتم تحديد طريقة السداد طبقًا للاتفاق النهائي مع العميل.',
      termsAndConditions: 'الأسعار قابلة للتغيير حسب توافر الخدمة وتحديثات شركات الطيران والفنادق والجهات الرسمية.',
    });
    setItems([newItem()]);
  };

  const saveQuotation = async (status: QuotationStatus = 'draft', silent = false) => {
    const validationError = validate();
    if (validationError) {
      alert(validationError);
      return null;
    }

    setSaving(true);
    try {
      const payload = {
        customer_id: form.customerId,
        quotation_number: savedQuotationId ? undefined : `QT-${Date.now().toString().slice(-7)}`,
        quotation_type: form.quotationKind,
        title: form.title,
        quotation_date: form.quotationDate,
        valid_until: form.validUntil || null,
        program_section: form.quotationKind === 'program' ? form.programSection : null,
        program_grade: form.quotationKind === 'program' ? form.programGrade : null,
        departure_date: form.quotationKind === 'program' && form.departureDate ? form.departureDate : null,
        return_date: form.quotationKind === 'program' && form.returnDate ? form.returnDate : null,
        days_count: form.quotationKind === 'program' ? form.daysCount : null,
        nights_count: form.quotationKind === 'program' ? form.nightsCount : null,
        program_details: form.quotationKind === 'program' && form.programDetails.trim() ? form.programDetails : null,
        hotel_details: form.quotationKind === 'program' && form.hotelDetails.trim() ? form.hotelDetails : null,
        flight_details: form.flightDetails.trim() ? form.flightDetails : null,
        transport_details: form.transportDetails.trim() ? form.transportDetails : null,
        payment_policy: form.paymentPolicy || null,
        terms_and_conditions: form.termsAndConditions || null,
        subtotal,
        total_discount: totalDiscount,
        total_tax: totalTax,
        total_amount: total,
        status,
        created_by: profile?.id || null,
        updated_at: new Date().toISOString(),
      };

      if (savedQuotationId) await saveQuotationVersion(savedQuotationId);

      const { data: quotation, error: quotationError } = savedQuotationId
        ? await supabase.from('quotations').update(payload).eq('id', savedQuotationId).select('id').single()
        : await supabase.from('quotations').insert(payload).select('id').single();

      if (quotationError) throw quotationError;
      const quotationId = quotation.id as string;

      await supabase.from('quotation_items').delete().eq('quotation_id', quotationId);
      const { error: itemsError } = await supabase.from('quotation_items').insert(activeItems.map((item, index) => ({
        quotation_id: quotationId,
        service_name: item.serviceName,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount: item.discount,
        tax: item.tax,
        line_total: lineTotal(item),
        sort_order: index + 1,
      })));
      if (itemsError) throw itemsError;

      setSavedQuotationId(quotationId);
      await loadQuotationHistory();
      if (!silent) alert(status === 'issued' ? 'تم حفظ وإصدار عرض السعر.' : 'تم حفظ عرض السعر.');
      return quotationId;
    } catch (err: any) {
      alert('تعذر حفظ عرض السعر: ' + (err?.message || 'حدث خطأ غير متوقع'));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const convertToBooking = async () => {
    if (!form.customerId) {
      alert('اختر العميل أولاً.');
      return;
    }
    if (total <= 0) {
      alert('لا يمكن تحويل عرض سعر بدون إجمالي.');
      return;
    }

    setConverting(true);
    try {
      const quotationId = savedQuotationId || await saveQuotation('issued');
      if (!quotationId) return;

      const { error } = await supabase.from('bookings').insert({
        customer_id: form.customerId,
        status: 'مؤكد',
        payment_status: 'غير مدفوع',
        total_amount: total,
        paid_amount: 0,
        source: 'Quotation',
        travel_date: form.departureDate || null,
        num_travelers: 1,
        notes: `تم تحويل عرض السعر إلى حجز: ${form.title}`,
      });
      if (error) throw error;

      await supabase.from('quotations').update({ status: 'converted', converted_at: new Date().toISOString() }).eq('id', quotationId);
      alert('تم تحويل عرض السعر إلى حجز بنجاح.');
    } catch (err: any) {
      alert('تعذر تحويل عرض السعر إلى حجز: ' + (err?.message || 'حدث خطأ غير متوقع'));
    } finally {
      setConverting(false);
    }
  };

  const printQuotation = async () => {
    const quotationId = await saveQuotation('issued', true);
    if (!quotationId) return;
    const printContent = document.getElementById('quotation-print')?.innerHTML;
    if (!printContent) return;

    const win = window.open('', '_blank');
    if (!win) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>${form.title || 'عرض سعر'}</title>
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  @page { size: A4; margin: 12mm; }
  body { margin: 0; color: #183b38; font-family: "Cairo", "Tahoma", "Arial", sans-serif; background: #fff; line-height: 1.6; }
  .quote-sheet { max-width: 190mm; margin: 0 auto; }
  .quote-header { display: flex; justify-content: space-between; align-items: center; gap: 18px; border-bottom: 3px solid #0f5f56; padding-bottom: 14px; margin-bottom: 18px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { width: 58px; height: 58px; border-radius: 12px; object-fit: cover; border: 2px solid #d8ebe7; }
  h1 { margin: 0; color: #0b4f48; font-size: 25px; font-weight: 900; }
  .muted { color: #5d7773; font-size: 12px; }
  .meta { text-align: left; font-size: 12px; color: #315c57; }
  .section { margin: 16px 0; page-break-inside: avoid; }
  .section-title { color: #0f5f56; font-size: 16px; font-weight: 900; margin-bottom: 8px; border-bottom: 1px solid #cce2de; padding-bottom: 5px; }
  .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .info-box { border: 1px solid #cce2de; background: #f4fbf9; border-radius: 8px; padding: 8px 10px; font-size: 12px; }
  .info-box strong { display: block; color: #0b4f48; font-size: 11px; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #0f5f56; color: white; padding: 9px; text-align: right; border: 1px solid #0f5f56; }
  td { border: 1px solid #cce2de; padding: 8px; vertical-align: top; }
  .text-center { text-align: center; }
  .total-panel { background: #0f5f56; color: white; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-weight: 900; }
  .total-panel span:last-child { font-size: 22px; color: #e4c766; }
  .text-block { border: 1px solid #cce2de; border-radius: 8px; padding: 10px; white-space: pre-wrap; font-size: 12px; color: #244f4a; background: #fff; }
  .signatures { display: flex; justify-content: space-around; gap: 18px; margin-top: 38px; page-break-inside: avoid; }
  .signature { flex: 1; text-align: center; border-top: 1px solid #93b9b3; padding-top: 8px; color: #0b4f48; font-weight: 800; font-size: 12px; }
  .footer { text-align: center; margin-top: 24px; padding-top: 10px; border-top: 1px solid #d8ebe7; color: #78928e; font-size: 10px; }
</style>
</head>
<body>${printContent}</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const SectionHeader = ({ title, icon: Icon }: { title: string; icon: React.ElementType }) => (
    <div className="flex items-center gap-2 text-navy-900 mb-4 pb-2 border-b border-gray-200">
      <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg"><Icon size={18} /></div>
      <h3 className="text-lg font-bold">{title}</h3>
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">طلب عرض سعر</h1>
          <p className="text-gray-500 text-sm mt-0.5">نظام مرن لعروض البرامج السياحية والخدمات المنفصلة</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={resetForm} className="btn-secondary flex items-center gap-2"><RefreshCw size={16} /> إعادة تعيين</button>
          <button onClick={() => saveQuotation('draft')} disabled={saving || !canEditQuotation} className="btn-secondary flex items-center gap-2 disabled:opacity-50"><Save size={16} /> حفظ</button>
          <button onClick={() => saveQuotation('issued')} disabled={saving || !canEditQuotation} className="btn-gold flex items-center gap-2 disabled:opacity-50"><FileCheck size={16} /> إصدار العرض</button>
          <button onClick={printQuotation} className="btn-gold flex items-center gap-2"><Printer size={16} /> طباعة / تحميل PDF</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg"><History size={18} /></div>
            <div>
              <h2 className="text-lg font-bold text-navy-900">سجل عروض الأسعار</h2>
              <p className="text-xs text-gray-500 mt-1">كل العروض المحفوظة متاحة للفتح أو التعديل أو الاستخدام كعرض جديد.</p>
            </div>
          </div>
          <div className="relative w-full lg:w-96">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="input-field pr-9"
              placeholder="بحث باسم العميل، رقم العرض، الخدمة، البرنامج، التاريخ"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-right text-xs text-gray-500 border-b border-gray-100">
                <th className="py-2 px-2">رقم العرض</th>
                <th className="py-2 px-2">العميل</th>
                <th className="py-2 px-2">تاريخ الإنشاء</th>
                <th className="py-2 px-2">الخدمات</th>
                <th className="py-2 px-2">الإجمالي</th>
                <th className="py-2 px-2">آخر تعديل</th>
                <th className="py-2 px-2">الحالة</th>
                <th className="py-2 px-2">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotationHistory.slice(0, 12).map((quote) => (
                <tr key={quote.id} className="border-b border-gray-50 align-top">
                  <td className="py-3 px-2 font-bold text-navy-900">{quote.quotation_number}</td>
                  <td className="py-3 px-2">
                    <span className="block font-semibold text-gray-800">{quote.customers?.name || '—'}</span>
                    <span className="block text-[11px] text-gray-400">{quote.customers?.client_code || ''}</span>
                  </td>
                  <td className="py-3 px-2 text-gray-600">{new Date(quote.created_at).toLocaleDateString('ar-EG')}</td>
                  <td className="py-3 px-2 text-gray-600 max-w-xs">
                    {(quote.quotation_items || []).slice(0, 3).map((item) => item.service_name).join('، ') || quote.title}
                  </td>
                  <td className="py-3 px-2 font-black text-emerald-800">{money(Number(quote.total_amount || 0))}</td>
                  <td className="py-3 px-2 text-gray-600">{new Date(quote.updated_at || quote.created_at).toLocaleDateString('ar-EG')}</td>
                  <td className="py-3 px-2">
                    <span className="badge bg-emerald-50 text-emerald-800 border border-emerald-100">
                      {quote.status === 'draft' ? 'مسودة' : quote.status === 'issued' ? 'صادر' : quote.status === 'converted' ? 'محول' : 'ملغي'}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex flex-wrap gap-1">
                      <button type="button" onClick={() => applyQuotationToForm(quote, 'view')} className="p-1.5 rounded-lg hover:bg-gray-100 text-navy-700" title="عرض"><Eye size={15} /></button>
                      <button type="button" onClick={() => applyQuotationToForm(quote, 'edit')} className="p-1.5 rounded-lg hover:bg-gray-100 text-emerald-700" title="تعديل"><Edit3 size={15} /></button>
                      <button type="button" onClick={() => applyQuotationToForm(quote, 'clone')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gold-700" title="استخدام كعرض جديد"><Copy size={15} /></button>
                      <button type="button" onClick={() => printSavedQuotation(quote)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700" title="طباعة"><Printer size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredQuotationHistory.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">لا توجد عروض أسعار محفوظة بعد</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <SectionHeader title="بيانات العميل" icon={User} />
          <div className="space-y-4">
            <div>
              <label className="form-label">بحث عن عميل</label>
              <div className="relative">
                <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="input-field pr-9" placeholder="الاسم، الهاتف، أو كود العميل" />
              </div>
              <div className="mt-2 max-h-44 overflow-y-auto border border-gray-100 rounded-xl">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      updateField('customerId', customer.id);
                      updateField('clientName', customer.name);
                      setCustomerSearch(`${customer.name} ${customer.client_code ? `(${customer.client_code})` : ''}`);
                    }}
                    className={`w-full text-right px-3 py-2 border-b border-gray-50 last:border-b-0 hover:bg-emerald-50 ${form.customerId === customer.id ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-gray-700'}`}
                  >
                    <span className="block text-sm">{customer.name}</span>
                    <span className="block text-[11px] text-gray-400">{customer.client_code || 'بدون كود'} - {customer.phone}</span>
                  </button>
                ))}
                {filteredCustomers.length === 0 && <div className="px-3 py-4 text-xs text-gray-400 text-center">لا توجد نتائج</div>}
              </div>
            </div>
            <div>
              <label className="form-label">اسم العميل في العرض</label>
              <input value={form.clientName} onChange={(e) => updateField('clientName', e.target.value)} className="input-field" placeholder="اسم العميل أو الجهة" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">تاريخ العرض</label>
                <input type="date" value={form.quotationDate} onChange={(e) => updateField('quotationDate', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="form-label">صالح حتى</label>
                <input type="date" value={form.validUntil} onChange={(e) => updateField('validUntil', e.target.value)} className="input-field" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <SectionHeader title="نوع العرض" icon={Briefcase} />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => updateField('quotationKind', 'services')} className={`rounded-xl border px-4 py-3 text-sm font-bold ${form.quotationKind === 'services' ? 'bg-emerald-900 text-white border-emerald-900' : 'bg-white text-gray-600 border-gray-200'}`}>خدمات منفصلة</button>
              <button onClick={() => updateField('quotationKind', 'program')} className={`rounded-xl border px-4 py-3 text-sm font-bold ${form.quotationKind === 'program' ? 'bg-emerald-900 text-white border-emerald-900' : 'bg-white text-gray-600 border-gray-200'}`}>برنامج رحلة كامل</button>
            </div>
            <div>
              <label className="form-label">عنوان العرض</label>
              <input value={form.title} onChange={(e) => updateField('title', e.target.value)} className="input-field" placeholder="مثال: تأشيرات وطيران دبي والصين" />
            </div>
            {form.quotationKind === 'program' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">القسم</label>
                  <select value={form.programSection} onChange={(e) => updateField('programSection', e.target.value)} className="input-field">
                    <option value="حج">حج</option>
                    <option value="عمرة">عمرة</option>
                    <option value="سياحة داخلية">سياحة داخلية</option>
                    <option value="سياحة خارجية">سياحة خارجية</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">درجة البرنامج</label>
                  <select value={form.programGrade} onChange={(e) => updateField('programGrade', e.target.value)} className="input-field">
                    {programGrades.map((grade) => <option key={grade.id} value={grade.name}>{grade.name}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <SectionHeader title="الإجمالي" icon={FileText} />
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-500">قبل الخصم والضريبة</span><span className="font-bold">{money(subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">الخصومات</span><span className="font-bold text-red-600">-{money(totalDiscount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">الضرائب</span><span className="font-bold text-emerald-700">{money(totalTax)}</span></div>
            <div className="rounded-xl bg-emerald-900 text-white p-4 flex justify-between items-center">
              <span className="font-bold">الإجمالي النهائي</span>
              <span className="text-xl font-black text-gold-300">{money(total)}</span>
            </div>
            <button onClick={convertToBooking} disabled={converting || !savedQuotationId || total <= 0} className="w-full btn-secondary justify-center disabled:opacity-50">
              <CheckCircle2 size={16} /> تحويل إلى حجز
            </button>
          </div>
        </div>
      </div>

      {form.quotationKind === 'program' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <SectionHeader title="تفاصيل البرنامج" icon={Calendar} />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><label className="form-label">تاريخ الذهاب</label><input type="date" value={form.departureDate} onChange={(e) => updateField('departureDate', e.target.value)} className="input-field" /></div>
            <div><label className="form-label">تاريخ العودة</label><input type="date" value={form.returnDate} onChange={(e) => updateField('returnDate', e.target.value)} className="input-field" /></div>
            <div><label className="form-label">عدد الأيام</label><input type="number" min="0" value={form.daysCount || ''} onChange={(e) => updateField('daysCount', Number(e.target.value) || 0)} className="input-field" /></div>
            <div><label className="form-label">عدد الليالي</label><input type="number" min="0" value={form.nightsCount || ''} onChange={(e) => updateField('nightsCount', Number(e.target.value) || 0)} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div><label className="form-label">تفاصيل البرنامج</label><textarea value={form.programDetails} onChange={(e) => updateField('programDetails', e.target.value)} className="input-field min-h-[110px] resize-y" placeholder="تفاصيل البرنامج، الزيارات، المزارات، أو خط السير..." /></div>
            <div><label className="form-label flex items-center gap-1"><Hotel size={14} /> تفاصيل الفندق إن وجدت</label><textarea value={form.hotelDetails} onChange={(e) => updateField('hotelDetails', e.target.value)} className="input-field min-h-[110px] resize-y" placeholder="لا تكتب شيئًا إذا لم يتضمن العرض فندقًا." /></div>
          </div>
        </div>
      )}

      {canManageGrades && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-lg font-bold text-navy-900">إدارة درجات البرامج</h3>
              <p className="text-xs text-gray-500 mt-1">تظهر هذه الدرجات في عروض البرامج فقط ولا تقيّد عروض الخدمات المنفصلة.</p>
            </div>
            <div className="flex gap-2">
              <input value={newGradeName} onChange={(e) => setNewGradeName(e.target.value)} className="input-field w-48" placeholder="درجة جديدة" />
              <button type="button" onClick={addProgramGrade} className="btn-secondary"><Plus size={15} /> إضافة</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {programGrades.map((grade) => (
              <span key={grade.id} className="badge bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1.5 flex items-center gap-2">
                {grade.name}
                <button type="button" onClick={() => archiveProgramGrade(grade)} className="text-red-500 hover:text-red-700" title="إخفاء">
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-navy-900">بنود الخدمات</h3>
            <p className="text-xs text-gray-500 mt-1">يمكن إضافة خدمة واحدة أو عدد غير محدود من الخدمات بدون إلزام ببرنامج أو فندق.</p>
          </div>
          <button onClick={() => setItems((current) => [...current, newItem()])} disabled={!canEditQuotation} className="btn-gold flex items-center gap-2 disabled:opacity-50"><Plus size={16} /> إضافة خدمة</button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {serviceSuggestions.map((service) => (
            <button key={service} onClick={() => setItems((current) => [...current, newItem(service)])} disabled={!canEditQuotation} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 hover:border-emerald-300 disabled:opacity-50">+ {service}</button>
          ))}
        </div>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-1 lg:grid-cols-12 gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="lg:col-span-2"><label className="form-label">اسم الخدمة</label><input value={item.serviceName} onChange={(e) => updateItem(item.id, 'serviceName', e.target.value)} disabled={!canEditQuotation} className="input-field bg-white disabled:bg-gray-100" placeholder={`خدمة ${index + 1}`} /></div>
              <div className="lg:col-span-3"><label className="form-label">الوصف</label><input value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} disabled={!canEditQuotation} className="input-field bg-white disabled:bg-gray-100" placeholder="وصف مختصر للخدمة" /></div>
              <div><label className="form-label">العدد</label><input type="number" min="0" value={item.quantity || ''} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} disabled={!canEditQuotation} className="input-field bg-white disabled:bg-gray-100" /></div>
              <div className="lg:col-span-2"><label className="form-label">سعر الوحدة</label><input type="number" min="0" value={item.unitPrice || ''} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} disabled={!canEditQuotation} className="input-field bg-white disabled:bg-gray-100" /></div>
              <div><label className="form-label">الخصم</label><input type="number" min="0" value={item.discount || ''} onChange={(e) => updateItem(item.id, 'discount', e.target.value)} disabled={!canEditQuotation} className="input-field bg-white disabled:bg-gray-100 text-red-600" /></div>
              <div><label className="form-label">الضريبة</label><input type="number" min="0" value={item.tax || ''} onChange={(e) => updateItem(item.id, 'tax', e.target.value)} disabled={!canEditQuotation} className="input-field bg-white disabled:bg-gray-100 text-emerald-700" /></div>
              <div className="lg:col-span-2">
                <label className="form-label">الإجمالي</label>
                <div className="input-field bg-white font-black text-emerald-800 flex items-center justify-between">
                  <span>{money(lineTotal(item))}</span>
                  {items.length > 1 && canEditQuotation && <button type="button" onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
        <div><SectionHeader title="الطيران" icon={Briefcase} /><textarea value={form.flightDetails} onChange={(e) => updateField('flightDetails', e.target.value)} className="input-field min-h-[120px] resize-y" placeholder="تفاصيل الطيران إن وجدت، واتركه فارغًا إذا لم يكن ضمن العرض." /></div>
        <div><SectionHeader title="المواصلات" icon={Briefcase} /><textarea value={form.transportDetails} onChange={(e) => updateField('transportDetails', e.target.value)} className="input-field min-h-[120px] resize-y" placeholder="تفاصيل النقل، القطار، الاستقبال والتوديع إن وجدت." /></div>
        <div><SectionHeader title="الشروط والسداد" icon={FileCheck} /><textarea value={form.paymentPolicy} onChange={(e) => updateField('paymentPolicy', e.target.value)} className="input-field min-h-[58px] resize-y mb-3" placeholder="سياسة السداد" /><textarea value={form.termsAndConditions} onChange={(e) => updateField('termsAndConditions', e.target.value)} className="input-field min-h-[58px] resize-y" placeholder="الشروط والأحكام" /></div>
      </div>

      <div id="quotation-print" className="hidden">
        <main className="quote-sheet">
          <header className="quote-header">
            <div className="brand">
              <img src="/images/WhatsApp_Image_2026-08-16_at_6.55.03_PM.jpeg" alt="Promise Travel" />
              <div>
                <h1>{form.quotationKind === 'program' ? 'عرض سعر برنامج سياحي' : 'عرض سعر خدمات سياحية'}</h1>
                <div className="muted">PROMISE TRAVEL - بروميس للسياحة والسفر</div>
              </div>
            </div>
            <div className="meta">
              <div>التاريخ: {new Date(form.quotationDate).toLocaleDateString('ar-EG')}</div>
              {form.validUntil && <div>صالح حتى: {new Date(form.validUntil).toLocaleDateString('ar-EG')}</div>}
              {selectedCustomer?.client_code && <div>كود العميل: {selectedCustomer.client_code}</div>}
            </div>
          </header>

          <section className="section">
            <div className="section-title">{form.title || 'عرض سعر'}</div>
            <div className="info-grid">
              <div className="info-box"><strong>العميل</strong>{form.clientName || selectedCustomer?.name || '—'}</div>
              <div className="info-box"><strong>نوع العرض</strong>{form.quotationKind === 'program' ? 'برنامج رحلة كامل' : 'خدمات منفصلة'}</div>
              {form.quotationKind === 'program' && <div className="info-box"><strong>القسم</strong>{form.programSection}</div>}
              {form.quotationKind === 'program' && <div className="info-box"><strong>درجة البرنامج</strong>{form.programGrade}</div>}
              {form.quotationKind === 'program' && form.departureDate && <div className="info-box"><strong>تاريخ الذهاب</strong>{new Date(form.departureDate).toLocaleDateString('ar-EG')}</div>}
              {form.quotationKind === 'program' && form.returnDate && <div className="info-box"><strong>تاريخ العودة</strong>{new Date(form.returnDate).toLocaleDateString('ar-EG')}</div>}
              {form.quotationKind === 'program' && (form.daysCount > 0 || form.nightsCount > 0) && <div className="info-box"><strong>المدة</strong>{form.daysCount || 0} أيام / {form.nightsCount || 0} ليالي</div>}
            </div>
          </section>

          {form.quotationKind === 'program' && form.programDetails.trim() && <section className="section"><div className="section-title">تفاصيل البرنامج</div><div className="text-block">{form.programDetails}</div></section>}
          {form.quotationKind === 'program' && form.hotelDetails.trim() && <section className="section"><div className="section-title">الإقامة الفندقية</div><div className="text-block">{form.hotelDetails}</div></section>}
          {(form.flightDetails.trim() || form.transportDetails.trim()) && (
            <section className="section">
              <div className="info-grid">
                {form.flightDetails.trim() && <div className="text-block"><strong>الطيران</strong><br />{form.flightDetails}</div>}
                {form.transportDetails.trim() && <div className="text-block"><strong>المواصلات</strong><br />{form.transportDetails}</div>}
              </div>
            </section>
          )}

          <section className="section">
            <div className="section-title">بنود الخدمات والتكلفة</div>
            <table>
              <thead>
                <tr>
                  <th>الخدمة</th>
                  <th>الوصف</th>
                  <th className="text-center">العدد</th>
                  <th className="text-center">سعر الوحدة</th>
                  <th className="text-center">الخصم</th>
                  <th className="text-center">الضريبة</th>
                  <th className="text-center">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {activeItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.serviceName}</td>
                    <td>{item.description || '—'}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-center">{money(item.unitPrice)}</td>
                    <td className="text-center">{item.discount > 0 ? money(item.discount) : '—'}</td>
                    <td className="text-center">{item.tax > 0 ? money(item.tax) : '—'}</td>
                    <td className="text-center"><strong>{money(lineTotal(item))}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="total-panel"><span>الإجمالي النهائي لعرض السعر</span><span>{money(total)}</span></div>
          </section>

          {(form.paymentPolicy.trim() || form.termsAndConditions.trim()) && (
            <section className="section">
              <div className="info-grid">
                {form.paymentPolicy.trim() && <div className="text-block"><strong>سياسة السداد</strong><br />{form.paymentPolicy}</div>}
                {form.termsAndConditions.trim() && <div className="text-block"><strong>الشروط والأحكام</strong><br />{form.termsAndConditions}</div>}
              </div>
            </section>
          )}

          <div className="signatures">
            <div className="signature">توقيع العميل بالموافقة</div>
            <div className="signature">توقيع مسؤول المبيعات</div>
            <div className="signature">ختم الشركة</div>
          </div>
          <footer className="footer">هذا العرض مبني فقط على البيانات والبنود المدخلة، ولا يتضمن أي خدمة غير مذكورة صراحة في العرض.</footer>
        </main>
      </div>
    </div>
  );
}
