import { useEffect, useState } from 'react';
import {
  Plus, Search, X, Loader2, Users, CalendarDays, Plane,
  Printer, Edit2, Trash2, UserPlus, UserMinus, CheckCircle2,
  AlertCircle, Building2, User, Download,
  Package2, ArrowLeft, RefreshCw, Layers,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { TravelGroup, TravelGroupMember, TravelGroupStatus, Package, Customer, Page } from '../types';

// ─── constants ──────────────────────────────────────────────────────────────

const STATUSES: TravelGroupStatus[] = ['تجميع', 'مؤكد', 'سافر', 'عاد', 'ملغي'];

const STATUS_CFG: Record<TravelGroupStatus, { color: string; icon: React.ElementType }> = {
  تجميع:  { color: 'bg-blue-100 text-blue-700 border-blue-200',      icon: Users },
  مؤكد:   { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  سافر:   { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Plane },
  عاد:    { color: 'bg-gray-100 text-gray-600 border-gray-200',        icon: ArrowLeft },
  ملغي:   { color: 'bg-red-100 text-red-700 border-red-200',           icon: AlertCircle },
};

const EMPTY_FORM = {
  name: '', code: '', package_id: '', internal_trip_id: '',
  travel_date: '', return_date: '',
  airline: '', flight_number: '',
  hotel_mecca: '', hotel_medina: '',
  supervisor: '', max_capacity: 45,
  status: 'تجميع' as TravelGroupStatus, notes: '',
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const cap = (filled: number, max: number) => Math.min(Math.round((filled / max) * 100), 100);

// ─── component ───────────────────────────────────────────────────────────────

interface Props { onNavigate: (page: Page, id?: string) => void; }

export default function InternalGroups({}: Props) {
  // ── data state ──
  const [groups, setGroups] = useState<TravelGroup[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [internalTrips, setInternalTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── filter / search ──
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ── create / edit modal ──
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<TravelGroup | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [groupType, setGroupType] = useState<'internal'>('internal');
  const [saving, setSaving] = useState(false);

  // ── group detail panel ──
  const [detailGroup, setDetailGroup] = useState<TravelGroup | null>(null);
  const [members, setMembers] = useState<TravelGroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // ── add members modal ──
  const [showAddModal, setShowAddModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);

  // ═══════════════════════ load ═══════════════════════════════════════════════

  useEffect(() => {
    loadGroups();
    supabase.from('packages').select('id, name, type').then(({ data }) => {
      if (data) setPackages(data as Package[]);
    });
    supabase.from('internal_trips').select('id, name').then(({ data }) => {
      if (data) setInternalTrips(data || []);
    });
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('travel_groups')
      .select('*, packages(name), internal_trips:internal_trip_id(name), travel_group_members(id)')
      .not('internal_trip_id', 'is', null)
      .order('created_at', { ascending: false });
    const processed = ((data || []) as TravelGroup[]).map(g => ({
      ...g,
      member_count: (g.travel_group_members || []).length,
    }));
    setGroups(processed);
    setLoading(false);
  };

  const loadMembers = async (groupId: string) => {
    setLoadingMembers(true);
    const { data } = await supabase
      .from('travel_group_members')
      .select('*, customers(id, name, phone, client_code, national_id, passport_number, service_type, email)')
      .eq('group_id', groupId)
      .order('added_at', { ascending: true });
    setMembers((data || []) as TravelGroupMember[]);
    setLoadingMembers(false);
  };

  const loadAvailableCustomers = async (_groupId?: string) => {
    const currentIds = members.map(m => m.customer_id);
    
    // Load main CRM customers
    const { data: cData } = await supabase
      .from('customers')
      .select('id, name, phone, client_code, national_id, passport_number, service_type')
      .order('name');
    
    let candidates = (cData || []) as (Customer & { isInternalCustomer?: boolean; originalInternalId?: string })[];

    // If it's an internal trip group, also fetch internal customers
    if (detailGroup?.internal_trip_id) {
      const { data: icData } = await supabase
        .from('internal_customers')
        .select('id, name, phone');
      
      if (icData) {
        icData.forEach(ic => {
          // Check if phone number is not already in candidates list
          const exists = candidates.some(c => c.phone === ic.phone);
          if (!exists) {
            candidates.push({
              id: ic.id,
              name: ic.name,
              phone: ic.phone || '',
              client_code: 'طلب داخلي',
              national_id: null,
              passport_number: null,
              service_type: 'سياحة داخلية',
              isInternalCustomer: true,
              originalInternalId: ic.id
            } as any);
          }
        });
      }
    }

    const filtered = candidates.filter(c => !currentIds.includes(c.id));
    setCustomers(filtered);
  };

  // ═══════════════════════ CRUD ════════════════════════════════════════════════

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setGroupType('internal');
    setShowForm(true);
  };

  const openEdit = (g: TravelGroup) => {
    setEditTarget(g);
    setForm({
      name: g.name, code: g.code, package_id: g.package_id || '', internal_trip_id: g.internal_trip_id || '',
      travel_date: g.travel_date || '', return_date: g.return_date || '',
      airline: g.airline || '', flight_number: g.flight_number || '',
      hotel_mecca: g.hotel_mecca || '', hotel_medina: g.hotel_medina || '',
      supervisor: g.supervisor || '', max_capacity: g.max_capacity,
      status: g.status, notes: g.notes || '',
    });
    setGroupType('internal');
    setShowForm(true);
  };

  const saveGroup = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    if (groupType === 'package' && !form.package_id) return;
    if (groupType === 'internal' && !form.internal_trip_id) return;

    setSaving(true);
    const payload = {
      name: form.name,
      code: form.code.toUpperCase(),
      package_id: groupType === 'package' ? form.package_id || null : null,
      internal_trip_id: groupType === 'internal' ? form.internal_trip_id || null : null,
      travel_date: form.travel_date || null,
      return_date: form.return_date || null,
      airline: form.airline || null,
      flight_number: form.flight_number || null,
      hotel_mecca: form.hotel_mecca || null,
      hotel_medina: form.hotel_medina || null,
      supervisor: form.supervisor || null,
      max_capacity: Number(form.max_capacity),
      status: form.status,
      notes: form.notes || null,
    };
    if (editTarget) {
      const { data } = await supabase.from('travel_groups').update(payload).eq('id', editTarget.id).select('*, packages(name), internal_trips:internal_trip_id(name), travel_group_members(id)').single();
      if (data) {
        const updated = { ...(data as TravelGroup), member_count: (data as TravelGroup).travel_group_members?.length || 0 };
        setGroups(prev => prev.map(g => g.id === editTarget.id ? updated : g));
        if (detailGroup?.id === editTarget.id) setDetailGroup(updated);
      }
    } else {
      const { data } = await supabase.from('travel_groups').insert(payload).select('*, packages(name), internal_trips:internal_trip_id(name), travel_group_members(id)').single();
      if (data) {
        const created = { ...(data as TravelGroup), member_count: 0 };
        setGroups(prev => [created, ...prev]);
      }
    }
    setShowForm(false);
    setSaving(false);
  };

  const deleteGroup = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الفوج؟ سيتم حذف جميع أعضائه.')) return;
    await supabase.from('travel_groups').delete().eq('id', id);
    setGroups(prev => prev.filter(g => g.id !== id));
    if (detailGroup?.id === id) setDetailGroup(null);
  };

  // ═══════════════════════ members ═════════════════════════════════════════════

  const openDetail = async (g: TravelGroup) => {
    setDetailGroup(g);
    setMemberSearch('');
    await loadMembers(g.id);
  };

  const removeMember = async (memberId: string, customerId: string) => {
    if (!confirm('إزالة هذا العميل من الفوج؟')) return;
    await supabase.from('travel_group_members').delete().eq('id', memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
    // update count in groups list
    setGroups(prev => prev.map(g =>
      g.id === detailGroup?.id ? { ...g, member_count: (g.member_count || 1) - 1 } : g
    ));
    void customerId;
  };

  const openAddModal = async () => {
    setSelected([]);
    setCustomerSearch('');
    await loadAvailableCustomers(detailGroup!.id);
    setShowAddModal(true);
  };

  const toggleCustomer = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const addMembers = async () => {
    if (!detailGroup || selected.length === 0) return;
    setAddingMembers(true);

    const rows: { group_id: string; customer_id: string }[] = [];

    for (const cid of selected) {
      const cand = customers.find(c => c.id === cid);
      if (cand && (cand as any).isInternalCustomer) {
        // Find if they exist in customers table by phone
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', cand.phone)
          .maybeSingle();

        if (existing) {
          rows.push({ group_id: detailGroup.id, customer_id: existing.id });
        } else {
          // Insert new customer into main customers table
          const { data: newCust, error } = await supabase
            .from('customers')
            .insert({
              name: cand.name,
              phone: cand.phone,
              service_type: 'سياحة داخلية',
              status: 'جديد',
              sales_agent_submitted: true,
            })
            .select('id')
            .single();
          
          if (newCust) {
            rows.push({ group_id: detailGroup.id, customer_id: newCust.id });
          } else {
            console.error('Error auto-creating customer for internal group:', error);
          }
        }
      } else {
        rows.push({ group_id: detailGroup.id, customer_id: cid });
      }
    }

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('travel_group_members').insert(rows);
      if (insErr) {
        alert('فشل إضافة الأعضاء للفوج: ' + insErr.message);
      }
    }
    
    await loadMembers(detailGroup.id);
    setGroups(prev => prev.map(g =>
      g.id === detailGroup.id ? { ...g, member_count: (g.member_count || 0) + rows.length } : g
    ));
    setShowAddModal(false);
    setSelected([]);
    setAddingMembers(false);
  };

  // ═══════════════════════ export ═══════════════════════════════════════════════

  const printManifest = () => {
    if (!detailGroup) return;
    const g = detailGroup;
    const rows = members.map((m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${m.customers.name}</td>
        <td>${m.customers.client_code}</td>
        <td>${m.customers.phone || '—'}</td>
        <td>${m.customers.national_id || '—'}</td>
        <td>${m.customers.passport_number || '—'}</td>
        <td>${m.customers.service_type || '—'}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>كشف مسافري فوج ${g.name}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
  h1 { font-size: 18px; text-align: center; margin-bottom: 4px; }
  .sub { text-align: center; color: #555; margin-bottom: 16px; font-size: 11px; }
  .info { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 16px; border: 1px solid #ddd; padding: 10px; border-radius: 6px; }
  .info div { font-size: 11px; } .info span { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e3a5f; color: white; padding: 7px 5px; text-align: right; font-size: 11px; }
  td { padding: 6px 5px; border-bottom: 1px solid #eee; font-size: 11px; }
  tr:nth-child(even) td { background: #f8f9fa; }
  .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #888; }
  @media print { body { margin: 10px; } }
</style>
</head>
<body>
<h1>كشف مسافري الفوج — Passenger Manifest</h1>
<p class="sub">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
<div class="info">
  <div><span>اسم الفوج:</span> ${g.name}</div>
  <div><span>كود الفوج:</span> ${g.code}</div>
  <div><span>الباقة:</span> ${g.packages?.name || '—'}</div>
  <div><span>تاريخ السفر:</span> ${fmt(g.travel_date)}</div>
  <div><span>تاريخ العودة:</span> ${fmt(g.return_date)}</div>
  <div><span>شركة الطيران:</span> ${g.airline || '—'}</div>
  <div><span>رقم الرحلة:</span> ${g.flight_number || '—'}</div>
  <div><span>فندق مكة:</span> ${g.hotel_mecca || '—'}</div>
  <div><span>فندق المدينة:</span> ${g.hotel_medina || '—'}</div>
  <div><span>المشرف:</span> ${g.supervisor || '—'}</div>
  <div><span>عدد المسافرين:</span> ${members.length} / ${g.max_capacity}</div>
  <div><span>الحالة:</span> ${g.status}</div>
</div>
<table>
  <thead>
    <tr>
      <th>#</th><th>الاسم</th><th>كود العميل</th><th>الهاتف</th>
      <th>الهوية الوطنية</th><th>رقم الجواز</th><th>نوع الخدمة</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<p class="footer">Promise Travel System — إجمالي المسافرين: ${members.length}</p>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const exportCSV = () => {
    if (!detailGroup) return;
    const header = ['#', 'الاسم', 'كود العميل', 'الهاتف', 'الهوية', 'الجواز', 'نوع الخدمة'];
    const rows = members.map((m, i) => [
      i + 1, m.customers.name, m.customers.client_code,
      m.customers.phone || '', m.customers.national_id || '',
      m.customers.passport_number || '', m.customers.service_type || '',
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `manifest_${detailGroup.code}_${Date.now()}.csv`;
    a.click();
  };

  // ═══════════════════════ derived ══════════════════════════════════════════════

  const filtered = groups.filter(g => {
    if (filterStatus && g.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!g.name.toLowerCase().includes(q) && !g.code.toLowerCase().includes(q) &&
          !(g.supervisor || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: groups.length,
    travelers: groups.reduce((s, g) => s + (g.member_count || 0), 0),
    upcoming: groups.filter(g => g.travel_date && new Date(g.travel_date) > new Date() && g.status !== 'ملغي').length,
    traveling: groups.filter(g => g.status === 'سافر').length,
  };

  const filteredMembers = members.filter(m =>
    !memberSearch || m.customers.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.customers.client_code.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const filteredCustomers = customers.filter(c =>
    !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.client_code || '').toLowerCase().includes(customerSearch.toLowerCase())
  );

  // ═══════════════════════ UI ═══════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Layers size={22} className="text-gold-500" />
            المجموعات (الرحلات الداخلية)
          </h2>
          <p className="section-subtitle">تنظيم وإدارة أفواج ومجموعات الرحلات الداخلية</p>
        </div>
        <button onClick={openCreate} className="btn-gold flex items-center gap-2 text-sm py-2.5 px-5">
          <Plus size={16} /> إنشاء فوج جديد
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الأفواج', val: stats.total, icon: Layers, color: 'text-navy-700 bg-navy-50' },
          { label: 'إجمالي المسافرين', val: stats.travelers, icon: Users, color: 'text-blue-700 bg-blue-50' },
          { label: 'أفواج قادمة', val: stats.upcoming, icon: CalendarDays, color: 'text-gold-700 bg-gold-50' },
          { label: 'أفواج في السفر', val: stats.traveling, icon: Plane, color: 'text-purple-700 bg-purple-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-900">{s.val}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الكود أو المشرف..."
            className="form-input text-sm pr-9 py-2"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white">
          <option value="">جميع الحالات</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={loadGroups} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Groups list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-navy-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Layers size={52} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 font-medium">لا توجد أفواج مطابقة</p>
          <button onClick={openCreate} className="mt-4 btn-gold text-sm py-2 px-5">
            <Plus size={14} className="inline ml-1" /> إنشاء أول فوج
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(g => {
            const cfg = STATUS_CFG[g.status];
            const StatusIcon = cfg.icon;
            const fill = g.member_count || 0;
            const pct = cap(fill, g.max_capacity);
            const isFull = fill >= g.max_capacity;
            return (
              <div key={g.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                {/* Card top bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-gold-400 to-navy-700" />
                <div className="p-5">
                  {/* Title row */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-navy-900 text-base leading-tight">{g.name}</h3>
                      <span className="text-xs text-gray-400 font-mono">{g.code}</span>
                    </div>
                    <span className={`badge text-[11px] border ${cfg.color} flex items-center gap-1 px-2.5 py-1`}>
                      <StatusIcon size={11} />{g.status}
                    </span>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600 mb-3">

                    {(g as any).internal_trips?.name && (
                      <span className="flex items-center gap-1 col-span-2 text-emerald-700 font-semibold">
                        <Package2 size={11} />{(g as any).internal_trips.name} (رحلة داخلية)
                      </span>
                    )}
                    {(g.travel_date || g.return_date) && (
                      <span className="flex items-center gap-1 col-span-2">
                        <CalendarDays size={11} className="text-blue-500" />
                        {fmt(g.travel_date)} ← {fmt(g.return_date)}
                      </span>
                    )}
                    {g.airline && (
                      <span className="flex items-center gap-1">
                        <Plane size={11} className="text-purple-500" />
                        {g.airline} {g.flight_number && `· ${g.flight_number}`}
                      </span>
                    )}
                    {g.supervisor && (
                      <span className="flex items-center gap-1">
                        <User size={11} className="text-green-500" />
                        {g.supervisor}
                      </span>
                    )}
                    {g.hotel_mecca && (
                      <span className="flex items-center gap-1">
                        <Building2 size={11} className="text-amber-500" />
                        {g.hotel_mecca}
                      </span>
                    )}
                    {g.hotel_medina && (
                      <span className="flex items-center gap-1">
                        <Building2 size={11} className="text-rose-500" />
                        {g.hotel_medina}
                      </span>
                    )}
                  </div>

                  {/* Capacity bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500 flex items-center gap-1"><Users size={11} />المسافرون</span>
                      <span className={`font-bold ${isFull ? 'text-red-600' : 'text-navy-700'}`}>
                        {fill} / {g.max_capacity}
                        {isFull && ' · اكتمل'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isFull ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                    <button
                      onClick={() => openDetail(g)}
                      className="flex-1 btn-outline text-xs py-1.5 flex items-center justify-center gap-1"
                    >
                      <Users size={13} /> عرض الأعضاء ({fill})
                    </button>
                    <button onClick={() => openEdit(g)} className="p-2 rounded-lg hover:bg-navy-50 text-navy-600" title="تعديل">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => deleteGroup(g.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="حذف">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════ Create / Edit Modal ══════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
              <h3 className="font-bold text-navy-900 text-lg">
                {editTarget ? 'تعديل الفوج' : 'إنشاء فوج جديد'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="form-label">اسم الفوج *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="form-input" placeholder="مثال: فوج عمرة رجب 1448" />
                </div>
                <div>
                  <label className="form-label">كود الفوج *</label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    className="form-input font-mono" placeholder="UG-001" dir="ltr" />
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">الرحلة الداخلية المرتبطة *</label>
                  <select value={form.internal_trip_id} onChange={e => setForm(f => ({ ...f, internal_trip_id: e.target.value }))}
                    className="form-input">
                    <option value="">اختر الرحلة الداخلية</option>
                    {internalTrips.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">تاريخ السفر (اختياري)</label>
                  <input type="date" value={form.travel_date} onChange={e => setForm(f => ({ ...f, travel_date: e.target.value }))}
                    className="form-input" dir="ltr" />
                </div>
                <div>
                  <label className="form-label">تاريخ العودة (اختياري)</label>
                  <input type="date" value={form.return_date} onChange={e => setForm(f => ({ ...f, return_date: e.target.value }))}
                    className="form-input" dir="ltr" />
                </div>
              </div>

              {/* Airline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">شركة الطيران</label>
                  <input value={form.airline} onChange={e => setForm(f => ({ ...f, airline: e.target.value }))}
                    className="form-input" placeholder="Saudia / flynas ..." />
                </div>
                <div>
                  <label className="form-label">رقم الرحلة</label>
                  <input value={form.flight_number} onChange={e => setForm(f => ({ ...f, flight_number: e.target.value }))}
                    className="form-input font-mono" placeholder="SV123" dir="ltr" />
                </div>
              </div>

              {/* Hotels */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">الفندق في مكة المكرمة</label>
                  <input value={form.hotel_mecca} onChange={e => setForm(f => ({ ...f, hotel_mecca: e.target.value }))}
                    className="form-input" placeholder="اسم الفندق" />
                </div>
                <div>
                  <label className="form-label">الفندق في المدينة المنورة</label>
                  <input value={form.hotel_medina} onChange={e => setForm(f => ({ ...f, hotel_medina: e.target.value }))}
                    className="form-input" placeholder="اسم الفندق" />
                </div>
              </div>

              {/* Supervisor + Capacity + Status */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label">المشرف</label>
                  <input value={form.supervisor} onChange={e => setForm(f => ({ ...f, supervisor: e.target.value }))}
                    className="form-input" placeholder="اسم المشرف" />
                </div>
                <div>
                  <label className="form-label">الحد الأقصى للمسافرين *</label>
                  <input type="number" min={1} max={500} value={form.max_capacity}
                    onChange={e => setForm(f => ({ ...f, max_capacity: Number(e.target.value) }))}
                    className="form-input" dir="ltr" />
                </div>
                <div>
                  <label className="form-label">الحالة</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TravelGroupStatus }))}
                    className="form-input">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="form-label">ملاحظات</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="form-input resize-none" placeholder="أي ملاحظات إضافية..." />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="btn-outline py-2 px-5 text-sm">إلغاء</button>
                <button
                  onClick={saveGroup}
                  disabled={
                    !form.name.trim() ||
                    !form.code.trim() ||
                    !form.internal_trip_id ||
                    saving
                  }
                  className="btn-gold py-2 px-6 text-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 size={15} className="animate-spin inline ml-1" /> : null}
                  {editTarget ? 'حفظ التعديلات' : 'إنشاء الفوج'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ Group Detail / Members Modal ══════════ */}
      {detailGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl bg-navy-900 text-white">
              <div>
                <h3 className="font-bold text-lg leading-tight">{detailGroup.name}</h3>
                <p className="text-navy-300 text-xs font-mono">
                  {detailGroup.code} · {detailGroup.packages?.name || (detailGroup as any).internal_trips?.name || 'بدون برنامج'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={exportCSV} title="تصدير Excel/CSV"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white">
                  <Download size={16} />
                </button>
                <button onClick={printManifest} title="طباعة الكشف"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white">
                  <Printer size={16} />
                </button>
                <button onClick={() => setDetailGroup(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Group info strip */}
            <div className="px-6 py-3 bg-navy-50 flex flex-wrap gap-4 text-xs text-navy-800 border-b border-navy-100">
              {detailGroup.travel_date && (
                <span className="flex items-center gap-1"><CalendarDays size={12} className="text-gold-500" />
                  السفر: {fmt(detailGroup.travel_date)}
                </span>
              )}
              {detailGroup.return_date && (
                <span className="flex items-center gap-1"><CalendarDays size={12} className="text-blue-500" />
                  العودة: {fmt(detailGroup.return_date)}
                </span>
              )}
              {detailGroup.airline && (
                <span className="flex items-center gap-1"><Plane size={12} className="text-purple-500" />
                  {detailGroup.airline} {detailGroup.flight_number && `(${detailGroup.flight_number})`}
                </span>
              )}
              {detailGroup.supervisor && (
                <span className="flex items-center gap-1"><User size={12} className="text-green-600" />
                  {detailGroup.supervisor}
                </span>
              )}
              <span className="flex items-center gap-1 font-bold text-navy-900 mr-auto">
                <Users size={12} />{members.length} / {detailGroup.max_capacity} مسافر
              </span>
            </div>

            {/* Toolbar: search + add */}
            <div className="px-6 py-3 flex items-center gap-3 border-b border-gray-100">
              <div className="relative flex-1">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                  placeholder="بحث بالاسم أو الكود..."
                  className="form-input text-xs pr-8 py-1.5" />
              </div>
              <button onClick={openAddModal}
                className="btn-gold text-xs py-1.5 px-4 flex items-center gap-1.5">
                <UserPlus size={14} /> إضافة عملاء
              </button>
            </div>

            {/* Members table */}
            <div className="flex-1 overflow-y-auto">
              {loadingMembers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={22} className="animate-spin text-navy-600" />
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Users size={40} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">لا يوجد أعضاء في هذا الفوج بعد</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {['#', 'الاسم', 'الكود', 'الهاتف', 'الهوية / الجواز', 'الخدمة', ''].map(h => (
                        <th key={h} className="text-right px-4 py-2.5 font-semibold text-gray-600 border-b border-gray-100">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredMembers.map((m, i) => (
                      <tr key={m.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2.5 font-semibold text-navy-900">{m.customers.name}</td>
                        <td className="px-4 py-2.5 font-mono text-gold-600">{m.customers.client_code}</td>
                        <td className="px-4 py-2.5 text-gray-600" dir="ltr">{m.customers.phone || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {m.customers.passport_number || m.customers.national_id || '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          {m.customers.service_type && (
                            <span className="badge bg-blue-50 text-blue-700 text-[10px]">{m.customers.service_type}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => removeMember(m.id, m.customer_id)}
                            className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600">
                            <UserMinus size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
              <span>إجمالي الظاهرين: {filteredMembers.length}</span>
              <span>المتبقي في الفوج: {detailGroup.max_capacity - members.length} مقعد</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ Add Members Modal ══════════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-3xl">
              <div>
                <h4 className="font-bold text-navy-900">إضافة عملاء للفوج</h4>
                <p className="text-xs text-gray-500 mt-0.5">تم تحديد {selected.length} عميل</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="بحث بالاسم أو كود العميل..."
                  className="form-input text-xs pr-8 py-1.5" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">لا يوجد عملاء متاحون للإضافة</div>
              ) : filteredCustomers.map(c => {
                const isSelected = selected.includes(c.id);
                return (
                  <button key={c.id} onClick={() => toggleCustomer(c.id)}
                    className={`w-full text-right px-5 py-3 flex items-center gap-3 transition-colors ${isSelected ? 'bg-navy-50' : 'hover:bg-gray-50'}`}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-navy-700 border-navy-700' : 'border-gray-300'}`}>
                      {isSelected && <CheckCircle2 size={13} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{c.client_code} · {c.phone || 'بدون هاتف'}</p>
                    </div>
                    {c.service_type && (
                      <span className="badge bg-blue-50 text-blue-600 text-[10px] flex-shrink-0">{c.service_type}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="btn-outline text-sm py-2 px-4">إلغاء</button>
              <button onClick={addMembers} disabled={selected.length === 0 || addingMembers}
                className="btn-gold text-sm py-2 px-5 flex items-center gap-2 disabled:opacity-50">
                {addingMembers ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                إضافة ({selected.length}) عميل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
