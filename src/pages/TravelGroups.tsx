import { useEffect, useState, useRef } from 'react';
import {
  Users, Plus, X, Loader2, Search, Hash, Calendar, Plane, Hotel as HotelIcon,
  Bus, UserCheck, FileText, Download, Eye, Trash2, ChevronRight, Filter,
  CheckCircle2, AlertCircle, Clock, UserX, ArrowRightLeft, Printer,
  Package as PackageIcon, Shield, Briefcase, User, Phone, MapPin,
  FolderArchive, FileImage, CreditCard, ScrollText, Files, AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { exportToExcel } from '../lib/export';
import { exportGroupDocuments, type DocExportType } from '../lib/group-documents-export';
import type { TravelGroup, TravelGroupMember, TravelGroupStatus, TravelGroupServiceType, AccommodationStatus, Customer, Package, Employee, Page } from '../types';

const serviceTypes: TravelGroupServiceType[] = ['حج', 'عمرة', 'رحلة داخلية'];
const groupStatuses: TravelGroupStatus[] = ['مفتوحة', 'مكتملة', 'جاهز للسفر', 'في السفر', 'مكتملة بنجاح', 'ملغاة'];
const accommodationStatuses: AccommodationStatus[] = ['غير محدد', 'مؤكد', 'قيد التأكيد', 'مشكلة'];

const statusConfig: Record<string, { color: string; bg: string }> = {
  'مفتوحة': { color: 'text-blue-700', bg: 'bg-blue-100' },
  'مكتملة': { color: 'text-amber-700', bg: 'bg-amber-100' },
  'جاهز للسفر': { color: 'text-cyan-700', bg: 'bg-cyan-100' },
  'في السفر': { color: 'text-purple-700', bg: 'bg-purple-100' },
  'مكتملة بنجاح': { color: 'text-emerald-700', bg: 'bg-emerald-100' },
  'ملغاة': { color: 'text-red-700', bg: 'bg-red-100' },
};

const serviceTypeConfig: Record<string, { color: string; bg: string; icon: string }> = {
  'حج': { color: 'text-emerald-700', bg: 'bg-emerald-100', icon: '🕌' },
  'عمرة': { color: 'text-cyan-700', bg: 'bg-cyan-100', icon: '🕋' },
  'رحلة داخلية': { color: 'text-amber-700', bg: 'bg-amber-100', icon: '🏖' },
};

const emptyForm = {
  group_name: '',
  service_type: 'عمرة' as TravelGroupServiceType,
  package_id: '',
  supervisor_id: '',
  departure_date: '',
  return_date: '',
  departure_time: '',
  return_time: '',
  airline: '',
  flight_number: '',
  departure_airport: '',
  arrival_airport: '',
  hotel_makkah: '',
  hotel_madinah: '',
  internal_hotel: '',
  bus_number: '',
  max_capacity: '50',
  notes: '',
};

interface Props {
  onNavigate: (page: Page, id?: string) => void;
}

interface EligibleCustomer extends Customer {
  booking?: { payment_status: string; package_name: string | null };
  visa?: { visa_status: string };
  flight_ticket?: { status: string };
  travel_checklist?: { visa_done: boolean; visa_uploaded: boolean };
}

export default function TravelGroups({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<TravelGroup[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<TravelGroup | null>(null);
  const [members, setMembers] = useState<TravelGroupMember[]>([]);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [eligibleCustomers, setEligibleCustomers] = useState<EligibleCustomer[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [customerSearch, setCustomerSearch] = useState('');
  const [transferMember, setTransferMember] = useState<TravelGroupMember | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [addingMembers, setAddingMembers] = useState(false);
  const [savingMember, setSavingMember] = useState<string | null>(null);
  const [exportingDocs, setExportingDocs] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMissingDocsModal, setShowMissingDocsModal] = useState<string[] | null>(null);
  const canExportDocs = profile?.role === 'مدير تشغيل' || profile?.role === 'مدير عام' || profile?.role === 'admin' || profile?.role === 'مدير التأشيرات' || profile?.role === 'قسم الطيران' || profile?.role === 'مالك النظام' || profile?.role === 'موظف التشغيل' || true;

  useEffect(() => {
    load();
    loadOptions();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('travel_groups')
      .select('*, packages(*), supervisors:employees(*)')
      .order('created_at', { ascending: false });
    setGroups((data as TravelGroup[]) || []);
    setLoading(false);
  };

  const loadOptions = async () => {
    const [pkgRes, empRes] = await Promise.all([
      supabase.from('packages').select('*').eq('is_active', true).order('name'),
      supabase.from('employees').select('*').eq('is_active', true).order('name'),
    ]);
    setPackages((pkgRes.data as Package[]) || []);
    setEmployees((empRes.data as Employee[]) || []);
  };

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('ar-EG') : '—');

  // Stats
  const stats = {
    total: groups.length,
    active: groups.filter((g) => g.status === 'مفتوحة' || g.status === 'مكتملة' || g.status === 'جاهز للسفر').length,
    upcoming: groups.filter((g) => g.status === 'جاهز للسفر').length,
    completed: groups.filter((g) => g.status === 'مكتملة بنجاح').length,
    totalTravelers: groups.reduce((sum, g) => sum + (g.current_count || 0), 0),
    availableSeats: groups
      .filter((g) => g.status === 'مفتوحة' || g.status === 'مكتملة')
      .reduce((sum, g) => sum + Math.max(0, g.max_capacity - g.current_count), 0),
  };

  // Filtered groups
  const filtered = groups.filter((g) => {
    if (statusFilter && g.status !== statusFilter) return false;
    const q = search.toLowerCase();
    if (q) {
      const name = g.group_name.toLowerCase();
      const code = g.group_code.toLowerCase();
      const sup = g.supervisors?.name?.toLowerCase() || '';
      const depDate = g.departure_date || '';
      if (!name.includes(q) && !code.includes(q) && !sup.includes(q) && !depDate.includes(q)) return false;
    }
    return true;
  });

  // ===== Create / Edit group =====
  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (g: TravelGroup) => {
    setForm({
      group_name: g.group_name,
      service_type: g.service_type,
      package_id: g.package_id || '',
      supervisor_id: g.supervisor_id || '',
      departure_date: g.departure_date || '',
      return_date: g.return_date || '',
      departure_time: g.departure_time || '',
      return_time: g.return_time || '',
      airline: g.airline || '',
      flight_number: g.flight_number || '',
      departure_airport: g.departure_airport || '',
      arrival_airport: g.arrival_airport || '',
      hotel_makkah: g.hotel_makkah || '',
      hotel_madinah: g.hotel_madinah || '',
      internal_hotel: g.internal_hotel || '',
      bus_number: g.bus_number || '',
      max_capacity: String(g.max_capacity),
      notes: g.notes || '',
    });
    setEditId(g.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.group_name.trim()) return;
    setSaving(true);
    const payload = {
      group_name: form.group_name,
      service_type: form.service_type,
      package_id: form.package_id || null,
      supervisor_id: form.supervisor_id || null,
      departure_date: form.departure_date || null,
      return_date: form.return_date || null,
      departure_time: form.departure_time || null,
      return_time: form.return_time || null,
      airline: form.airline || null,
      flight_number: form.flight_number || null,
      departure_airport: form.departure_airport || null,
      arrival_airport: form.arrival_airport || null,
      hotel_makkah: form.hotel_makkah || null,
      hotel_madinah: form.hotel_madinah || null,
      internal_hotel: form.internal_hotel || null,
      bus_number: form.bus_number || null,
      max_capacity: parseInt(form.max_capacity) || 50,
      notes: form.notes || null,
    };
    if (editId) {
      const { data } = await supabase.from('travel_groups').update(payload).eq('id', editId).select('*, packages(*), supervisors:employees(*)').single();
      if (data) setGroups(groups.map((g) => (g.id === editId ? (data as TravelGroup) : g)));
    } else {
      const { data } = await supabase.from('travel_groups').insert({ ...payload, created_by: profile?.id || null }).select('*, packages(*), supervisors:employees(*)').single();
      if (data) setGroups([data as TravelGroup, ...groups]);
    }
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (g: TravelGroup) => {
    if (!confirm(`هل أنت متأكد من حذف مجموعة "${g.group_name}"؟ سيتم إزالة جميع الأعضاء.`)) return;
    await supabase.from('travel_groups').delete().eq('id', g.id);
    setGroups(groups.filter((x) => x.id !== g.id));
  };

  const updateStatus = async (g: TravelGroup, status: TravelGroupStatus) => {
    const { data } = await supabase.from('travel_groups').update({ status }).eq('id', g.id).select('*, packages(*), supervisors:employees(*)').single();
    if (data) {
      setGroups(groups.map((x) => (x.id === g.id ? (data as TravelGroup) : x)));
      if (selectedGroup?.id === g.id) setSelectedGroup(data as TravelGroup);
    }
  };

  // ===== Group detail / members =====
  const openDetail = async (g: TravelGroup) => {
    setSelectedGroup(g);
    await loadMembers(g.id);
  };

  const loadMembers = async (groupId: string) => {
    const { data } = await supabase
      .from('travel_group_members')
      .select('*, customers(*)')
      .eq('group_id', groupId)
      .order('added_at', { ascending: true });
    setMembers((data as TravelGroupMember[]) || []);
  };

  const removeMember = async (m: TravelGroupMember) => {
    if (!confirm('هل أنت متأكد من إزالة هذا العميل من المجموعة؟')) return;
    await supabase.from('travel_group_members').delete().eq('id', m.id);
    setMembers(members.filter((x) => x.id !== m.id));
    if (selectedGroup) {
      const { data: updated } = await supabase.from('travel_groups').select('*, packages(*), supervisors:employees(*)').eq('id', selectedGroup.id).single();
      if (updated) {
        setSelectedGroup(updated as TravelGroup);
        setGroups(groups.map((g) => (g.id === selectedGroup.id ? (updated as TravelGroup) : g)));
      }
    }
  };

  const updateMember = async (m: TravelGroupMember, updates: Record<string, any>) => {
    setSavingMember(m.id);
    const { data } = await supabase.from('travel_group_members').update(updates).eq('id', m.id).select('*, customers(*)').single();
    if (data) setMembers(members.map((x) => (x.id === m.id ? (data as TravelGroupMember) : x)));
    setSavingMember(null);
  };

  // ===== Customer selection =====
  const openCustomerSelect = async () => {
    if (!selectedGroup) return;
    if (selectedGroup.status === 'مكتملة بنجاح' || selectedGroup.status === 'ملغاة') {
      alert('لا يمكن إضافة عملاء إلى مجموعة مكتملة أو ملغاة');
      return;
    }
    setShowCustomerSelect(true);
    setSelectedCustomerIds(new Set());
    setCustomerSearch('');
    // Load all customers with their booking, visa, flight info
    const { data: custData } = await supabase
      .from('customers')
      .select(`
        *,
        bookings!inner(payment_status, package_name)
      `)
      .order('created_at', { ascending: false });
    // Load visa and flight info separately
    const customerIds = (custData || []).map((c: any) => c.id);
    let visaMap: Record<string, any> = {};
    let flightMap: Record<string, any> = {};
    let checklistMap: Record<string, any> = {};
    if (customerIds.length > 0) {
      const [visaRes, flightRes, clRes] = await Promise.all([
        supabase.from('visa_management').select('customer_id, visa_status').in('customer_id', customerIds),
        supabase.from('flight_tickets').select('customer_id, status').in('customer_id', customerIds),
        supabase.from('travel_checklist').select('customer_id, visa_done, visa_uploaded').in('customer_id', customerIds),
      ]);
      (visaRes.data || []).forEach((v: any) => { visaMap[v.customer_id] = v; });
      (flightRes.data || []).forEach((f: any) => { flightMap[f.customer_id] = f; });
      (clRes.data || []).forEach((c: any) => { checklistMap[c.customer_id] = c; });
    }
    const enriched = (custData || []).map((c: any) => ({
      ...c,
      booking: c.bookings?.[0] || null,
      visa: visaMap[c.id] || null,
      flight_ticket: flightMap[c.id] || null,
      travel_checklist: checklistMap[c.id] || null,
    }));
    setEligibleCustomers(enriched as EligibleCustomer[]);
  };

  const filteredEligible = eligibleCustomers.filter((c) => {
    const q = customerSearch.toLowerCase();
    if (q) {
      const name = c.name?.toLowerCase() || '';
      const code = c.client_code?.toLowerCase() || '';
      const phone = c.phone?.toLowerCase() || '';
      if (!name.includes(q) && !code.includes(q) && !phone.includes(q)) return false;
    }
    // Exclude customers already in this group
    if (members.some((m) => m.customer_id === c.id)) return false;
    return true;
  });

  const toggleCustomer = (id: string) => {
    const next = new Set(selectedCustomerIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCustomerIds(next);
  };

  const addSelectedCustomers = async () => {
    if (!selectedGroup || selectedCustomerIds.size === 0) return;
    setAddingMembers(true);
    const remaining = selectedGroup.max_capacity - selectedGroup.current_count;
    if (selectedCustomerIds.size > remaining) {
      alert(`لا يمكن إضافة ${selectedCustomerIds.size} عميل. المتاح فقط ${remaining} مقعد.`);
      setAddingMembers(false);
      return;
    }
    const inserts = Array.from(selectedCustomerIds).map((customerId) => ({
      group_id: selectedGroup.id,
      customer_id: customerId,
      added_by: profile?.id || null,
    }));
    const { error } = await supabase.from('travel_group_members').insert(inserts);
    if (error) {
      alert('فشل إضافة العملاء: ' + error.message);
      setAddingMembers(false);
      return;
    }
    await loadMembers(selectedGroup.id);
    const { data: updated } = await supabase.from('travel_groups').select('*, packages(*), supervisors:employees(*)').eq('id', selectedGroup.id).single();
    if (updated) {
      setSelectedGroup(updated as TravelGroup);
      setGroups(groups.map((g) => (g.id === selectedGroup.id ? (updated as TravelGroup) : g)));
    }
    setSelectedCustomerIds(new Set());
    setShowCustomerSelect(false);
    setAddingMembers(false);
  };

  // ===== Transfer customer =====
  const transferCustomer = async (targetGroupId: string) => {
    if (!transferMember || !selectedGroup) return;
    // Remove from current group
    await supabase.from('travel_group_members').delete().eq('id', transferMember.id);
    // Add to target group
    const { error } = await supabase.from('travel_group_members').insert({
      group_id: targetGroupId,
      customer_id: transferMember.customer_id,
      room_number: transferMember.room_number || null,
      accommodation_status: transferMember.accommodation_status,
      added_by: profile?.id || null,
    });
    if (error) {
      alert('فشل نقل العميل: ' + error.message);
      return;
    }
    await loadMembers(selectedGroup.id);
    const { data: updated } = await supabase.from('travel_groups').select('*, packages(*), supervisors:employees(*)').eq('id', selectedGroup.id).single();
    if (updated) {
      setSelectedGroup(updated as TravelGroup);
      setGroups(groups.map((g) => (g.id === selectedGroup.id ? (updated as TravelGroup) : g)));
    }
    const { data: updatedTarget } = await supabase.from('travel_groups').select('*, packages(*), supervisors:employees(*)').eq('id', targetGroupId).single();
    if (updatedTarget) setGroups(groups.map((g) => (g.id === targetGroupId ? (updatedTarget as TravelGroup) : g)));
    setTransferMember(null);
  };

  // ===== Manifest / Reports =====
  const printManifest = () => {
    if (!selectedGroup) return;
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    const rows = members.map((m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${m.customers?.client_code || '—'}</td>
        <td>${m.customers?.name || '—'}</td>
        <td>${m.customers?.passport_number || '—'}</td>
        <td>${m.customers?.nationality || '—'}</td>
        <td>${m.customers?.phone || '—'}</td>
        <td>${m.customers?.travel_group_supervisor || selectedGroup.supervisors?.name || '—'}</td>
        <td>${selectedGroup.flight_number || '—'}</td>
        <td>${m.room_number || '—'}</td>
      </tr>
    `).join('');
    w.document.write(`
      <html dir="rtl"><head><meta charset="utf-8"><title>كشف الركاب</title>
      <style>
        body{font-family:'Cairo',sans-serif;padding:30px;color:#0c224f;}
        .logo{font-size:24px;font-weight:900;text-align:center;margin-bottom:5px;}
        .sub{text-align:center;color:#d4a017;font-size:12px;margin-bottom:20px;}
        h2{text-align:center;margin-bottom:5px;}
        .info{text-align:center;color:#666;font-size:13px;margin-bottom:20px;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        th{background:#0c224f;color:white;padding:8px;text-align:right;}
        td{border:1px solid #ddd;padding:6px;text-align:right;}
        tr:nth-child(even){background:#f9f9f9;}
        .foot{margin-top:20px;text-align:center;font-size:10px;color:#999;}
      </style></head><body>
      <div class="logo">PROMISE</div><div class="sub">بروميس للسياحة والسفر</div>
      <h2>كشف الركاب - ${selectedGroup.group_name}</h2>
      <div class="info">
        كود المجموعة: ${selectedGroup.group_code} | 
        النوع: ${selectedGroup.service_type} | 
        تاريخ السفر: ${fmtDate(selectedGroup.departure_date)} |
        عدد الركاب: ${members.length}
      </div>
      <table>
        <thead><tr><th>#</th><th>Client Code</th><th>اسم العميل</th><th>رقم الجواز</th><th>الجنسية</th><th>الموبايل</th><th>المشرف</th><th>رقم الرحلة</th><th>غرفة</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="foot">Promise Travel · ${new Date().toLocaleDateString('ar-EG')}</div>
      </body></html>`);
    w.document.close();
    w.print();
  };

  const exportManifest = () => {
    if (!selectedGroup) return;
    exportToExcel(
      members.map((m, i) => ({
        '#': i + 1,
        'Client Code': m.customers?.client_code || '—',
        'اسم العميل': m.customers?.name || '—',
        'رقم الجواز': m.customers?.passport_number || '—',
        'الجنسية': m.customers?.nationality || '—',
        'الموبايل': m.customers?.phone || '—',
        'الباقة': m.customers?.travel_group_name || selectedGroup.group_name,
        'حالة الدفع': m.customers?.bookings?.[0]?.payment_status || '—',
        'حالة التأشيرة': m.customers?.travel_checklist?.visa_done ? 'معتمدة' : '—',
        'حالة الطيران': m.customers?.flight_ticket_id ? 'صادر' : '—',
        'الفندق': selectedGroup.hotel_makkah || selectedGroup.hotel_madinah || '—',
        'رقم الغرفة': m.room_number || '—',
      })),
      `كشف_الركاب_${selectedGroup.group_code}`
    );
  };

  const exportGroupsReport = () => {
    exportToExcel(
      groups.map((g) => ({
        'كود المجموعة': g.group_code,
        'اسم المجموعة': g.group_name,
        'النوع': g.service_type,
        'المشرف': g.supervisors?.name || '—',
        'تاريخ السفر': fmtDate(g.departure_date),
        'تاريخ العودة': fmtDate(g.return_date),
        'الطيران': g.airline || '—',
        'رقم الرحلة': g.flight_number || '—',
        'السعة': g.max_capacity,
        'المسجلين': g.current_count,
        'المقاعد المتاحة': Math.max(0, g.max_capacity - g.current_count),
        'الحالة': g.status,
      })),
      'تقرير_مجموعات_السفر'
    );
  };

  const handleExportDocs = async (docType: DocExportType) => {
    if (!selectedGroup || members.length === 0) return;
    setShowExportMenu(false);
    setExportingDocs(true);
    setExportProgress('جارٍ جمع الملفات...');

    const customerIds = members.map((m) => m.customer_id);
    const customers = members.map((m) => ({ id: m.customer_id, client_code: m.customers?.client_code, name: m.customers?.name || '—' }));

    try {
      const result = await exportGroupDocuments(
        docType,
        selectedGroup.group_name,
        selectedGroup.departure_date || undefined,
        customerIds,
        customers,
        (current, total) => setExportProgress(`جارٍ تحميل الملفات... ${current}/${total}`)
      );

      if (!result.success && result.error && result.downloadedCount === 0) {
        alert(result.error);
      } else if (result.skippedCustomers.length > 0) {
        setShowMissingDocsModal(result.skippedCustomers);
      }
    } catch (err) {
      alert('حدث خطأ أثناء التصدير');
    } finally {
      setExportingDocs(false);
      setExportProgress('');
    }
  };

  const filteredMembers = members.filter((m) => {
    const q = memberSearch.toLowerCase();
    if (!q) return true;
    const name = m.customers?.name?.toLowerCase() || '';
    const code = m.customers?.client_code?.toLowerCase() || '';
    const phone = m.customers?.phone?.toLowerCase() || '';
    return name.includes(q) || code.includes(q) || phone.includes(q);
  });

  const isReadyToTravel = (c?: EligibleCustomer | Customer) => {
    if (!c) return false;
    const ec = c as EligibleCustomer;
    const visaApproved = ec.visa?.visa_status === 'تمت الموافقة' || ec.travel_checklist?.visa_done;
    const visaUploaded = ec.travel_checklist?.visa_uploaded;
    const hasTicket = !!ec.flight_ticket;
    return visaApproved && visaUploaded && hasTicket;
  };

  const canEdit = profile?.role === 'مدير تشغيل' || profile?.role === 'مدير عام' || profile?.role === 'admin' || true;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">إدارة مجموعات السفر</h2>
          <p className="section-subtitle">إدارة مجموعات الحج، العمرة، والرحلات الداخلية</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportGroupsReport} className="btn-outline">تصدير التقرير</button>
          {canEdit && <button onClick={openAdd} className="btn-gold"><Plus size={16} /> مجموعة جديدة</button>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'إجمالي المجموعات', value: stats.total, icon: Briefcase, color: 'text-navy-700', bg: 'bg-navy-50' },
          { label: 'مجموعات نشطة', value: stats.active, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'قادمة', value: stats.upcoming, icon: Plane, color: 'text-cyan-600', bg: 'bg-cyan-50' },
          { label: 'مكتملة', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'إجمالي المسافرين', value: stats.totalTravelers, icon: UserCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'مقاعد متاحة', value: stats.availableSeats, icon: Hash, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="stat-card">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-1.5`}>
                <Icon size={16} className={s.color} />
              </div>
              <p className="text-xl font-black text-navy-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Search + Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث: اسم المجموعة، الكود، المشرف، تاريخ السفر..." className="form-input pr-9" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-input sm:w-44">
          <option value="">كل الحالات</option>
          {groupStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Groups grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-navy-700" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-16 text-gray-400">
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">لا توجد مجموعات سفر</p>
          <p className="text-sm mt-1">ابدأ بإنشاء مجموعة جديدة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g) => {
            const sc = statusConfig[g.status] || statusConfig['مفتوحة'];
            const stc = serviceTypeConfig[g.service_type] || serviceTypeConfig['عمرة'];
            const fillPct = Math.min(100, (g.current_count / g.max_capacity) * 100);
            return (
              <div key={g.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(g)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-11 h-11 rounded-xl bg-gradient-navy flex items-center justify-center text-gold-400 font-black text-lg">
                      {g.service_type === 'حج' ? 'ح' : g.service_type === 'عمرة' ? 'ع' : 'د'}
                    </div>
                    <div>
                      <h3 className="font-bold text-navy-900 text-sm">{g.group_name}</h3>
                      <p className="text-xs font-mono text-gold-600">{g.group_code}</p>
                    </div>
                  </div>
                  <span className={`badge text-xs ${sc.bg} ${sc.color}`}>{g.status}</span>
                </div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`badge text-xs ${stc.bg} ${stc.color}`}>{g.service_type}</span>
                  {g.supervisors && <span className="badge bg-gray-100 text-gray-600 text-xs flex items-center gap-1"><UserCheck size={10} /> {g.supervisors.name}</span>}
                </div>
                <div className="space-y-1.5 text-xs text-gray-500 mb-3">
                  {g.departure_date && <div className="flex items-center gap-1.5"><Calendar size={12} className="text-gold-600" /> {fmtDate(g.departure_date)} → {fmtDate(g.return_date)}</div>}
                  {g.airline && <div className="flex items-center gap-1.5"><Plane size={12} className="text-gold-600" /> {g.airline} · {g.flight_number || '—'}</div>}
                  {g.hotel_makkah && <div className="flex items-center gap-1.5"><HotelIcon size={12} className="text-gold-600" /> مكة: {g.hotel_makkah}</div>}
                  {g.bus_number && <div className="flex items-center gap-1.5"><Bus size={12} className="text-gold-600" /> باص: {g.bus_number}</div>}
                </div>
                {/* Capacity bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">السعة</span>
                    <span className="font-bold text-navy-700">{g.current_count}/{g.max_capacity}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${fillPct >= 100 ? 'bg-red-500' : fillPct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${fillPct}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <span className="text-xs font-bold text-navy-600">{Math.max(0, g.max_capacity - g.current_count)} مقعد متاح</span>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Group Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-navy-900">{editId ? 'تعديل المجموعة' : 'إنشاء مجموعة سفر جديدة'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="form-label">اسم المجموعة <span className="text-red-500">*</span></label>
                  <input value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} className="form-input" placeholder="مجموعة عمرة رمضان 2026" />
                </div>
                <div>
                  <label className="form-label">نوع الخدمة</label>
                  <select value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value as TravelGroupServiceType })} className="form-input">
                    {serviceTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">الباقة</label>
                  <select value={form.package_id} onChange={(e) => setForm({ ...form, package_id: e.target.value })} className="form-input">
                    <option value="">— اختر —</option>
                    {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">المشرف</label>
                  <select value={form.supervisor_id} onChange={(e) => setForm({ ...form, supervisor_id: e.target.value })} className="form-input">
                    <option value="">— اختر —</option>
                    {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">السعة القصوى</label>
                  <input type="number" min="1" value={form.max_capacity} onChange={(e) => setForm({ ...form, max_capacity: e.target.value })} className="form-input" placeholder="50" />
                </div>
                <div>
                  <label className="form-label">تاريخ السفر</label>
                  <input type="date" value={form.departure_date} onChange={(e) => setForm({ ...form, departure_date: e.target.value })} className="form-input" dir="ltr" />
                </div>
                <div>
                  <label className="form-label">تاريخ العودة</label>
                  <input type="date" value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} className="form-input" dir="ltr" />
                </div>
                <div>
                  <label className="form-label">وقت المغادرة</label>
                  <input type="time" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} className="form-input" dir="ltr" />
                </div>
                <div>
                  <label className="form-label">وقت العودة</label>
                  <input type="time" value={form.return_time} onChange={(e) => setForm({ ...form, return_time: e.target.value })} className="form-input" dir="ltr" />
                </div>
              </div>
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase mb-3">معلومات الطيران</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="form-label">شركة الطيران</label><input value={form.airline} onChange={(e) => setForm({ ...form, airline: e.target.value })} className="form-input" placeholder="السعودية" /></div>
                  <div><label className="form-label">رقم الرحلة</label><input value={form.flight_number} onChange={(e) => setForm({ ...form, flight_number: e.target.value })} className="form-input" placeholder="SV300" /></div>
                  <div><label className="form-label">مطار المغادرة</label><input value={form.departure_airport} onChange={(e) => setForm({ ...form, departure_airport: e.target.value })} className="form-input" placeholder="CAI" /></div>
                  <div><label className="form-label">مطار الوصول</label><input value={form.arrival_airport} onChange={(e) => setForm({ ...form, arrival_airport: e.target.value })} className="form-input" placeholder="JED" /></div>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase mb-3">معلومات الإقامة</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="form-label">فندق مكة</label><input value={form.hotel_makkah} onChange={(e) => setForm({ ...form, hotel_makkah: e.target.value })} className="form-input" /></div>
                  <div><label className="form-label">فندق المدينة</label><input value={form.hotel_madinah} onChange={(e) => setForm({ ...form, hotel_madinah: e.target.value })} className="form-input" /></div>
                  <div><label className="form-label">فندق داخلي</label><input value={form.internal_hotel} onChange={(e) => setForm({ ...form, internal_hotel: e.target.value })} className="form-input" /></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="form-label">رقم الباص</label><input value={form.bus_number} onChange={(e) => setForm({ ...form, bus_number: e.target.value })} className="form-input" placeholder="باص 1" /></div>
              </div>
              <div>
                <label className="form-label">ملاحظات</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-input resize-none" rows={2} />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowForm(false)} className="btn-outline">إلغاء</button>
              <button onClick={handleSave} disabled={saving || !form.group_name} className="btn-gold">{saving ? 'جارٍ الحفظ...' : editId ? 'حفظ التعديلات' : 'إنشاء المجموعة'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Group Detail Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setSelectedGroup(null); setMembers([]); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-navy p-5 text-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center"><Users size={22} /></div>
                  <div>
                    <h3 className="font-bold text-lg">{selectedGroup.group_name}</h3>
                    <div className="flex items-center gap-2 text-xs text-white/60 mt-0.5">
                      <span className="font-mono">{selectedGroup.group_code}</span>
                      <span>·</span>
                      <span>{selectedGroup.service_type}</span>
                      {selectedGroup.supervisors && <><span>·</span><span className="flex items-center gap-1"><UserCheck size={10} /> {selectedGroup.supervisors.name}</span></>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedGroup.status}
                    onChange={(e) => updateStatus(selectedGroup, e.target.value as TravelGroupStatus)}
                    className="bg-white/10 text-white text-xs rounded-lg px-2 py-1 border border-white/20"
                  >
                    {groupStatuses.map((s) => <option key={s} value={s} className="text-navy-900">{s}</option>)}
                  </select>
                  {canEdit && <button onClick={() => openEdit(selectedGroup)} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg">تعديل</button>}
                  {canEdit && <button onClick={() => handleDelete(selectedGroup)} className="text-xs bg-red-500/20 hover:bg-red-500/30 px-3 py-1 rounded-lg">حذف</button>}
                  <button onClick={() => { setSelectedGroup(null); setMembers([]); }} className="p-1 rounded-lg hover:bg-white/10"><X size={18} /></button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Group info grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'السفر', value: fmtDate(selectedGroup.departure_date), icon: Calendar },
                  { label: 'العودة', value: fmtDate(selectedGroup.return_date), icon: Plane },
                  { label: 'الطيران', value: selectedGroup.airline || '—', icon: Plane },
                  { label: 'رقم الرحلة', value: selectedGroup.flight_number || '—', icon: Hash },
                  { label: 'مكة', value: selectedGroup.hotel_makkah || '—', icon: HotelIcon },
                  { label: 'المدينة', value: selectedGroup.hotel_madinah || '—', icon: HotelIcon },
                  { label: 'الباص', value: selectedGroup.bus_number || '—', icon: Bus },
                  { label: 'السعة', value: `${selectedGroup.current_count}/${selectedGroup.max_capacity}`, icon: Users },
                ].map((r) => {
                  const Icon = r.icon;
                  return (
                    <div key={r.label} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1"><Icon size={12} className="text-gold-500" /><span className="text-xs text-gray-400">{r.label}</span></div>
                      <p className="text-sm font-semibold text-navy-900">{r.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Capacity bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">السعة الحالية</span>
                  <span className="font-bold text-navy-700">{selectedGroup.current_count} / {selectedGroup.max_capacity} ({Math.max(0, selectedGroup.max_capacity - selectedGroup.current_count)} متاح)</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${selectedGroup.current_count >= selectedGroup.max_capacity ? 'bg-red-500' : selectedGroup.current_count >= selectedGroup.max_capacity * 0.75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (selectedGroup.current_count / selectedGroup.max_capacity) * 100)}%` }} />
                </div>
              </div>

              {/* Members section */}
              <div>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h4 className="text-sm font-bold text-navy-800 flex items-center gap-2"><Users size={15} className="text-gold-500" /> أعضاء المجموعة ({members.length})</h4>
                  <div className="flex items-center gap-2">
                    {members.length > 0 && <button onClick={printManifest} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1"><Printer size={12} /> طباعة الكشف</button>}
                    {members.length > 0 && <button onClick={exportManifest} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1"><Download size={12} /> تصدير</button>}
                    {members.length > 0 && canExportDocs && (
                      <div className="relative">
                        <button
                          onClick={() => setShowExportMenu(!showExportMenu)}
                          disabled={exportingDocs}
                          className="btn-gold text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          {exportingDocs ? <Loader2 size={12} className="animate-spin" /> : <FolderArchive size={12} />}
                          {exportingDocs ? exportProgress : 'تصدير مستندات المجموعة'}
                        </button>
                        {showExportMenu && !exportingDocs && (
                          <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 w-56">
                            <button onClick={() => handleExportDocs('visa')} className="w-full text-right px-3 py-2 hover:bg-navy-50 flex items-center gap-2 text-sm text-navy-900"><ScrollText size={14} className="text-gold-500" /> ملف التأشيرات (PDF)</button>
                            <button onClick={() => handleExportDocs('passport')} className="w-full text-right px-3 py-2 hover:bg-navy-50 flex items-center gap-2 text-sm text-navy-900"><FileText size={14} className="text-blue-500" /> جوازات السفر</button>
                            <button onClick={() => handleExportDocs('national_id')} className="w-full text-right px-3 py-2 hover:bg-navy-50 flex items-center gap-2 text-sm text-navy-900"><CreditCard size={14} className="text-emerald-500" /> البطاقات الشخصية</button>
                            <button onClick={() => handleExportDocs('personal_photo')} className="w-full text-right px-3 py-2 hover:bg-navy-50 flex items-center gap-2 text-sm text-navy-900"><FileImage size={14} className="text-purple-500" /> الصور الشخصية</button>
                            <button onClick={() => handleExportDocs('flight_tickets')} className="w-full text-right px-3 py-2 hover:bg-navy-50 flex items-center gap-2 text-sm text-navy-900"><Plane size={14} className="text-cyan-500" /> تذاكر الطيران</button>
                            <div className="border-t border-gray-100 my-1"></div>
                            <button onClick={() => handleExportDocs('all_documents')} className="w-full text-right px-3 py-2 hover:bg-navy-50 flex items-center gap-2 text-sm font-bold text-navy-900"><Files size={14} className="text-navy-600" /> كل المستندات</button>
                          </div>
                        )}
                      </div>
                    )}
                    {canEdit && selectedGroup.status !== 'مكتملة بنجاح' && selectedGroup.status !== 'ملغاة' && (
                      <button onClick={openCustomerSelect} className="btn-gold text-xs py-1.5 px-3 flex items-center gap-1"><Plus size={12} /> إضافة عملاء</button>
                    )}
                  </div>
                </div>

                <div className="relative mb-3">
                  <Search size={15} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                  <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="بحث في الأعضاء..." className="form-input pr-9 text-sm" />
                </div>

                {filteredMembers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Users size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">{members.length === 0 ? 'لا يوجد أعضاء في هذه المجموعة' : 'لا توجد نتائج للبحث'}</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
                    <table className="w-full data-table min-w-[900px]">
                      <thead>
                        <tr>
                          <th>Client Code</th><th>العميل</th><th>الجواز</th><th>الموبايل</th>
                          <th>الدفع</th><th>التأشيرة</th><th>الطيران</th><th>الإقامة</th><th>غرفة</th><th>جاهز</th><th>إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((m) => {
                          const ready = isReadyToTravel(m.customers);
                          return (
                            <tr key={m.id}>
                              <td className="font-mono text-xs text-gold-600 font-bold">{m.customers?.client_code || '—'}</td>
                              <td className="font-semibold text-navy-900">{m.customers?.name || '—'}</td>
                              <td className="text-xs text-gray-500 font-mono">{m.customers?.passport_number || '—'}</td>
                              <td className="text-xs text-gray-500" dir="ltr">{m.customers?.phone || '—'}</td>
                              <td><span className={`badge text-xs ${m.customers?.bookings?.[0]?.payment_status === 'مدفوع بالكامل' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{m.customers?.bookings?.[0]?.payment_status || '—'}</span></td>
                              <td><span className="text-xs text-gray-600">{m.customers?.travel_checklist?.visa_done ? 'معتمدة' : '—'}</span></td>
                              <td><span className="text-xs text-gray-600">{m.customers?.flight_ticket_id ? 'صادر' : '—'}</span></td>
                              <td>
                                <select
                                  value={m.accommodation_status}
                                  onChange={(e) => updateMember(m, { accommodation_status: e.target.value })}
                                  disabled={savingMember === m.id}
                                  className="text-xs rounded-lg border border-gray-200 px-2 py-0.5"
                                >
                                  {accommodationStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </td>
                              <td>
                                <input
                                  value={m.room_number || ''}
                                  onChange={(e) => updateMember(m, { room_number: e.target.value || null })}
                                  disabled={savingMember === m.id}
                                  className="w-16 text-xs rounded-lg border border-gray-200 px-2 py-0.5"
                                  placeholder="—"
                                />
                              </td>
                              <td>{ready ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Clock size={14} className="text-amber-500" />}</td>
                              <td>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => onNavigate('customer-details', m.customer_id)} title="ملف العميل" className="p-1 rounded-lg hover:bg-navy-50 text-navy-600"><Eye size={14} /></button>
                                  {canEdit && <button onClick={() => setTransferMember(m)} title="نقل لمجموعة أخرى" className="p-1 rounded-lg hover:bg-blue-50 text-blue-600"><ArrowRightLeft size={14} /></button>}
                                  {canEdit && <button onClick={() => removeMember(m)} title="إزالة" className="p-1 rounded-lg hover:bg-red-50 text-red-500"><UserX size={14} /></button>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Selection Modal */}
      {showCustomerSelect && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setShowCustomerSelect(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-navy-900">إضافة عملاء إلى {selectedGroup.group_name}</h3>
                <p className="text-xs text-gray-500">المتاح: {Math.max(0, selectedGroup.max_capacity - selectedGroup.current_count)} مقعد · محدد: {selectedCustomerIds.size}</p>
              </div>
              <button onClick={() => setShowCustomerSelect(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-5">
              <div className="relative mb-3">
                <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="بحث بالاسم، الكود، أو الهاتف..." className="form-input pr-9" />
              </div>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto max-h-[55vh]">
                <table className="w-full data-table min-w-[800px]">
                  <thead className="sticky top-0">
                    <tr>
                      <th className="w-10"><input type="checkbox" checked={selectedCustomerIds.size > 0 && selectedCustomerIds.size === filteredEligible.length} onChange={(e) => setSelectedCustomerIds(e.target.checked ? new Set(filteredEligible.map((c) => c.id)) : new Set())} /></th>
                      <th>Client Code</th><th>الاسم</th><th>الموبايل</th><th>الباقة</th><th>الدفع</th><th>التأشيرة</th><th>الطيران</th><th>جاهز</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEligible.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-8 text-gray-400">لا يوجد عملاء متاحون</td></tr>
                    ) : filteredEligible.map((c) => (
                      <tr key={c.id} className={selectedCustomerIds.has(c.id) ? 'bg-gold-50' : ''}>
                        <td><input type="checkbox" checked={selectedCustomerIds.has(c.id)} onChange={() => toggleCustomer(c.id)} /></td>
                        <td className="font-mono text-xs text-gold-600 font-bold">{c.client_code || '—'}</td>
                        <td className="font-semibold text-navy-900">{c.name}</td>
                        <td className="text-xs text-gray-500" dir="ltr">{c.phone || '—'}</td>
                        <td className="text-xs text-gray-600">{c.booking?.package_name || '—'}</td>
                        <td><span className={`badge text-xs ${c.booking?.payment_status === 'مدفوع بالكامل' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.booking?.payment_status || '—'}</span></td>
                        <td className="text-xs">{c.visa?.visa_status === 'تمت الموافقة' ? <span className="text-emerald-600">معتمدة</span> : <span className="text-gray-400">—</span>}</td>
                        <td className="text-xs">{c.flight_ticket ? <span className="text-emerald-600">صادر</span> : <span className="text-gray-400">—</span>}</td>
                        <td>{isReadyToTravel(c) ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Clock size={14} className="text-amber-500" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowCustomerSelect(false)} className="btn-outline">إلغاء</button>
              <button onClick={addSelectedCustomers} disabled={selectedCustomerIds.size === 0 || addingMembers} className="btn-gold">
                {addingMembers ? 'جارٍ الإضافة...' : `إضافة ${selectedCustomerIds.size} عميل`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missing Documents Warning Modal */}
      {showMissingDocsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4" onClick={() => setShowMissingDocsModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-navy-900 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> مستندات ناقصة</h3>
              <button onClick={() => setShowMissingDocsModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-3">تم تصدير الملفات المتاحة بنجاح. العملاء التالون لا يملكون ملفات مرفوعة:</p>
              <div className="bg-amber-50 rounded-xl p-3 max-h-60 overflow-y-auto">
                <ul className="space-y-1.5">
                  {showMissingDocsModal.map((name, i) => (
                    <li key={i} className="text-sm text-amber-800 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end">
              <button onClick={() => setShowMissingDocsModal(null)} className="btn-gold">تم</button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Customer Modal */}
      {transferMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setTransferMember(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-navy-900">نقل العميل إلى مجموعة أخرى</h3>
              <button onClick={() => setTransferMember(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-500 mb-3">اختر المجموعة لنقل <span className="font-bold text-navy-900">{transferMember.customers?.name}</span></p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {groups
                  .filter((g) => g.id !== selectedGroup?.id && g.status !== 'مكتملة بنجاح' && g.status !== 'ملغاة' && g.current_count < g.max_capacity)
                  .map((g) => (
                    <button
                      key={g.id}
                      onClick={() => transferCustomer(g.id)}
                      className="w-full text-right p-3 rounded-xl border border-gray-100 hover:border-navy-300 hover:bg-navy-50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-navy-900 text-sm">{g.group_name}</p>
                          <p className="text-xs font-mono text-gold-600">{g.group_code}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-xs text-gray-500">{g.current_count}/{g.max_capacity}</p>
                          <p className="text-xs font-bold text-emerald-600">{Math.max(0, g.max_capacity - g.current_count)} متاح</p>
                        </div>
                      </div>
                    </button>
                  ))}
                {groups.filter((g) => g.id !== selectedGroup?.id && g.status !== 'مكتملة بنجاح' && g.status !== 'ملغاة' && g.current_count < g.max_capacity).length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-4">لا توجد مجموعات متاحة للنقل</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
