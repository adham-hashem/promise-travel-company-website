import { useEffect, useState, useCallback } from 'react';
import {
  BedDouble, Plus, X, Loader2, Search, Users, UserCheck, AlertTriangle,
  CheckCircle2, Download, Printer, Eye, Trash2, Home, Building, MapPin,
  Lock, Unlock, ArrowRight, User as UserIcon, Heart, FamilyIcon, ChevronRight,
  Plane, Calendar, FileText, Archive, RotateCcw, Filter,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { exportToExcel, exportToPDF } from '../lib/export';
import type { TravelGroup, Room, RoomAssignment, Family, Customer, RoomType, RoomStatus, Page } from '../types';

const roomTypeLabels: Record<RoomType, string> = {
  double: 'دوبل (2)',
  triple: 'تربل (3)',
  quad: 'كواد (4)',
  connected: 'غرف متصلة',
};

const roomTypeCapacity: Record<RoomType, number> = {
  double: 2,
  triple: 3,
  quad: 4,
  connected: 10,
};

const roomStatusLabels: Record<RoomStatus, string> = {
  waiting: 'بانتظار الإكمال',
  complete: 'مكتملة',
  checked_in: 'تم تسجيل الدخول',
  checked_out: 'تم تسجيل الخروج',
};

const roomStatusConfig: Record<RoomStatus, { color: string; bg: string }> = {
  waiting: { color: 'text-amber-700', bg: 'bg-amber-100' },
  complete: { color: 'text-emerald-700', bg: 'bg-emerald-100' },
  checked_in: { color: 'text-blue-700', bg: 'bg-blue-100' },
  checked_out: { color: 'text-gray-700', bg: 'bg-gray-200' },
};

const roomColors = [
  { bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500', text: 'text-blue-700' },
  { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', text: 'text-amber-700' },
  { bg: 'bg-purple-50', border: 'border-purple-200', dot: 'bg-purple-500', text: 'text-purple-700' },
  { bg: 'bg-pink-50', border: 'border-pink-200', dot: 'bg-pink-500', text: 'text-pink-700' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', dot: 'bg-cyan-500', text: 'text-cyan-700' },
  { bg: 'bg-indigo-50', border: 'border-indigo-200', dot: 'bg-indigo-500', text: 'text-indigo-700' },
  { bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-500', text: 'text-rose-700' },
];

interface Props {
  onNavigate: (page: Page, id?: string) => void;
}

interface MemberWithCustomer extends RoomAssignment {
  customers?: Customer;
}

interface UnassignedMember {
  id: string;
  customer_id: string;
  customer: Customer;
  rooming_type: 'individual' | 'family';
  room_type_preference?: RoomType;
  family_id?: string;
}

export default function Accommodation({ onNavigate }: Props) {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<TravelGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<TravelGroup | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [assignments, setAssignments] = useState<RoomAssignment[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedMember[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAssignModal, setShowAssignModal] = useState<UnassignedMember | null>(null);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');

  // Family modal state
  const [familyName, setFamilyName] = useState('');
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  // Stats
  const [incompleteRooms, setIncompleteRooms] = useState(0);
  const [availableBeds, setAvailableBeds] = useState(0);
  const [completedRooms, setCompletedRooms] = useState(0);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('travel_groups')
      .select('*, packages(*), supervisors:employees(*)')
      .order('created_at', { ascending: false });
    setGroups((data as TravelGroup[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const loadGroupData = async (group: TravelGroup) => {
    setSelectedGroup(group);
    await loadRoomsAndMembers(group.id);
  };

  const loadRoomsAndMembers = async (groupId: string) => {
    const [roomsRes, assignRes, famRes, membersRes] = await Promise.all([
      supabase.from('rooms').select('*, families(*)').eq('group_id', groupId).order('created_at'),
      supabase.from('room_assignments').select('*, customers(*)').eq('group_id', groupId).order('assigned_at'),
      supabase.from('families').select('*, rooms!families_room_id_fkey(*)').eq('group_id', groupId),
      supabase.from('travel_group_members').select('customer_id').eq('group_id', groupId),
    ]);

    const roomList = (roomsRes.data as Room[]) || [];
    const assignList = (assignRes.data as RoomAssignment[]) || [];
    const famList = (famRes.data as Family[]) || [];
    setRooms(roomList);
    setAssignments(assignList);
    setFamilies(famList);

    // Stats
    setIncompleteRooms(roomList.filter((r) => r.status === 'waiting' && r.current_occupancy < r.capacity).length);
    setAvailableBeds(roomList.reduce((sum, r) => sum + Math.max(0, r.capacity - r.current_occupancy), 0));
    setCompletedRooms(roomList.filter((r) => r.status === 'complete' || r.status === 'checked_in' || r.status === 'checked_out').length);

    // Find unassigned members
    const assignedCustomerIds = new Set(assignList.map((a) => a.customer_id));
    const memberCustomerIds = ((membersRes.data as { customer_id: string }[]) || []).map((m) => m.customer_id);

    if (memberCustomerIds.length > 0) {
      const { data: custData } = await supabase
        .from('customers')
        .select('*')
        .in('id', memberCustomerIds);
      const unassignedList = ((custData as Customer[]) || [])
        .filter((c) => !assignedCustomerIds.has(c.id))
        .map((c) => ({
          id: c.id,
          customer_id: c.id,
          customer: c,
          rooming_type: (c.rooming_type as 'individual' | 'family') || 'individual',
          room_type_preference: c.room_type_preference as RoomType | undefined,
          family_id: c.family_id,
        }));
      setUnassigned(unassignedList);
    } else {
      setUnassigned([]);
    }
  };

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('ar-EG') : '—');

  // ===== Individual room assignment =====
  const assignToRoom = async (member: UnassignedMember, roomType: RoomType) => {
    if (!selectedGroup) return;
    setSaving(true);
    const capacity = roomTypeCapacity[roomType];
    const gender = (member.customer.gender as 'male' | 'female') || 'male';

    // Find an existing waiting room of same type + gender with space
    let targetRoom = rooms.find(
      (r) => r.room_type === roomType && r.gender === gender && !r.is_locked && r.current_occupancy < r.capacity && !r.family_id
    );

    if (!targetRoom) {
      // Create new room
      const colorTag = rooms.length % roomColors.length;
      const { data: newRoom, error } = await supabase
        .from('rooms')
        .insert({
          group_id: selectedGroup.id,
          room_type: roomType,
          capacity,
          gender,
          color_tag: colorTag,
          hotel: selectedGroup.hotel_makkah || selectedGroup.hotel_madinah || selectedGroup.internal_hotel || null,
          city: selectedGroup.service_type === 'رحلة داخلية' ? 'داخلي' : 'مكة',
        })
        .select('*')
        .single();
      if (error) {
        alert('فشل إنشاء الغرفة: ' + error.message);
        setSaving(false);
        return;
      }
      targetRoom = newRoom as Room;
    }

    // Assign customer to room
    const { error: assignErr } = await supabase.from('room_assignments').insert({
      room_id: targetRoom.id,
      group_id: selectedGroup.id,
      customer_id: member.customer_id,
      assigned_by: profile?.id || null,
    });

    if (assignErr) {
      alert('فشل إ assignment العميل: ' + assignErr.message);
      setSaving(false);
      return;
    }

    // Update customer rooming info
    await supabase.from('customers').update({
      rooming_type: 'individual',
      room_type_preference: roomType,
    }).eq('id', member.customer_id);

    await loadRoomsAndMembers(selectedGroup.id);
    setShowAssignModal(null);
    setSaving(false);
  };

  // ===== Family creation =====
  const openFamilyModal = async () => {
    if (!selectedGroup) return;
    setShowFamilyModal(true);
    setFamilyName('');
    setFamilyMembers([]);
    setCustomerSearch('');
    // Load all group members
    const { data: memberData } = await supabase
      .from('travel_group_members')
      .select('customer_id')
      .eq('group_id', selectedGroup.id);
    const customerIds = ((memberData as { customer_id: string }[]) || []).map((m) => m.customer_id);
    if (customerIds.length > 0) {
      const { data: custData } = await supabase.from('customers').select('*').in('id', customerIds);
      // Exclude already assigned
      const assignedIds = new Set(assignments.map((a) => a.customer_id));
      setAvailableCustomers(((custData as Customer[]) || []).filter((c) => !assignedIds.has(c.id)));
    }
  };

  const toggleFamilyMember = (id: string) => {
    setFamilyMembers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const createFamily = async () => {
    if (!selectedGroup || familyMembers.length < 2 || !familyName.trim()) return;
    setSaving(true);
    const memberCount = familyMembers.length;
    const roomType: RoomType = memberCount <= 2 ? 'double' : memberCount === 3 ? 'triple' : memberCount === 4 ? 'quad' : 'connected';
    const capacity = roomTypeCapacity[roomType] === 10 ? memberCount : roomTypeCapacity[roomType];

    // Create family
    const { data: famData, error: famErr } = await supabase
      .from('families')
      .insert({
        group_id: selectedGroup.id,
        family_name: familyName,
        family_head_customer_id: familyMembers[0],
        member_count: memberCount,
        created_by: profile?.id || null,
      })
      .select('*')
      .single();
    if (famErr) {
      alert('فشل إنشاء العائلة: ' + famErr.message);
      setSaving(false);
      return;
    }
    const family = famData as Family;

    // Create room for family
    const colorTag = rooms.length % roomColors.length;
    const { data: roomData, error: roomErr } = await supabase
      .from('rooms')
      .insert({
        group_id: selectedGroup.id,
        room_type: roomType,
        capacity,
        gender: 'mixed',
        family_id: family.id,
        color_tag: colorTag,
        hotel: selectedGroup.hotel_makkah || selectedGroup.hotel_madinah || selectedGroup.internal_hotel || null,
        city: selectedGroup.service_type === 'رحلة داخلية' ? 'داخلي' : 'مكة',
        is_locked: true, // family rooms are locked immediately
        status: memberCount >= capacity ? 'complete' : 'waiting',
      })
      .select('*')
      .single();
    if (roomErr) {
      alert('فشل إنشاء غرفة العائلة: ' + roomErr.message);
      setSaving(false);
      return;
    }
    const room = roomData as Room;

    // Update family with room_id
    await supabase.from('families').update({ room_id: room.id }).eq('id', family.id);

    // Assign all family members to the room
    const inserts = familyMembers.map((customerId) => ({
      room_id: room.id,
      group_id: selectedGroup.id,
      customer_id: customerId,
      family_id: family.id,
      assigned_by: profile?.id || null,
    }));
    const { error: assignErr } = await supabase.from('room_assignments').insert(inserts);
    if (assignErr) {
      alert('فشل إ assignment أفراد العائلة: ' + assignErr.message);
      setSaving(false);
      return;
    }

    // Update customers
    await supabase.from('customers').update({
      rooming_type: 'family',
      family_id: family.id,
    }).in('id', familyMembers);

    await loadRoomsAndMembers(selectedGroup.id);
    setShowFamilyModal(false);
    setSaving(false);
  };

  // ===== Remove from room =====
  const removeFromRoom = async (assignment: RoomAssignment) => {
    if (!confirm('هل أنت متأكد من إزالة هذا العميل من الغرفة؟')) return;
    await supabase.from('room_assignments').delete().eq('id', assignment.id);
    if (selectedGroup) await loadRoomsAndMembers(selectedGroup.id);
  };

  // ===== Update room status =====
  const updateRoomStatus = async (room: Room, status: RoomStatus) => {
    await supabase.from('rooms').update({ status }).eq('id', room.id);
    if (selectedGroup) await loadRoomsAndMembers(selectedGroup.id);
  };

  // ===== Update room hotel/floor =====
  const updateRoomField = async (room: Room, field: string, value: string) => {
    await supabase.from('rooms').update({ [field]: value || null }).eq('id', room.id);
    if (selectedGroup) await loadRoomsAndMembers(selectedGroup.id);
  };

  // ===== Travel ready checklist toggle =====
  const toggleChecklistItem = async (customer: Customer, field: string) => {
    const updates = { [field]: !(customer as any)[field] };
    await supabase.from('customers').update(updates).eq('id', customer.id);
    if (selectedGroup) await loadRoomsAndMembers(selectedGroup.id);
  };

  // ===== Group return =====
  const returnGroup = async () => {
    if (!selectedGroup) return;
    setSaving(true);
    // Mark group as completed
    await supabase.from('travel_groups').update({
      status: 'مكتملة بنجاح',
      returned_at: new Date().toISOString(),
    }).eq('id', selectedGroup.id);

    // Archive all customers in the group
    const memberCustomerIds = assignments.map((a) => a.customer_id);
    if (memberCustomerIds.length > 0) {
      await supabase.from('customers').update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        status: 'مكتمل',
      }).in('id', memberCustomerIds);
    }

    // Close all open tasks for these customers
    if (memberCustomerIds.length > 0) {
      await supabase.from('tasks').update({ status: 'مكتملة' }).in('customer_id', memberCustomerIds).neq('status', 'مكتملة');
    }

    await loadGroups();
    setShowReturnModal(false);
    setSelectedGroup(null);
    setSaving(false);
  };

  // ===== Rooming list export =====
  const printRoomingList = () => {
    if (!selectedGroup) return;
    const w = window.open('', '_blank', 'width=900,height=900');
    if (!w) return;
    const roomHTML = rooms.map((room) => {
      const color = roomColors[room.color_tag % roomColors.length];
      const roomAssigns = assignments.filter((a) => a.room_id === room.id);
      const rows = roomAssigns.map((a) => `
        <tr>
          <td><span class="dot ${color.dot.replace('bg-', 'bg-')}"></span> ${a.customers?.client_code || '—'}</td>
          <td>${a.customers?.name || '—'}</td>
          <td dir="ltr">${a.customers?.phone || '—'}</td>
          <td>${a.customers?.passport_number || '—'}</td>
          <td>${room.hotel || '—'}</td>
          <td>${room.room_number || '—'}</td>
          <td>${roomTypeLabels[room.room_type]}</td>
        </tr>
      `).join('');
      const famName = room.families?.family_name;
      return `
        <div class="room-block ${color.bg} ${color.border}">
          <div class="room-header">
            <span class="room-title">غرفة ${room.room_number || '—'} · ${roomTypeLabels[room.room_type]} · ${roomStatusLabels[room.status]}</span>
            ${famName ? `<span class="fam-tag">عائلة: ${famName}</span>` : `<span class="gender-tag">${room.gender === 'male' ? 'رجال' : room.gender === 'female' ? 'سيدات' : 'عائلة'}</span>`}
          </div>
          <table><tbody>${rows}</tbody></table>
        </div>
      `;
    }).join('');
    w.document.write(`
      <html dir="rtl"><head><meta charset="utf-8"><title>Rooming List</title>
      <style>
        body{font-family:'Cairo',sans-serif;padding:30px;color:#0c224f;}
        .logo{font-size:24px;font-weight:900;text-align:center;margin-bottom:5px;}
        .sub{text-align:center;color:#d4a017;font-size:12px;margin-bottom:20px;}
        h2{text-align:center;margin-bottom:5px;}
        .info{text-align:center;color:#666;font-size:13px;margin-bottom:25px;}
        .room-block{border:2px solid;border-radius:12px;padding:12px;margin-bottom:16px;}
        .room-header{display:flex;justify-content:space-between;margin-bottom:8px;}
        .room-title{font-weight:700;font-size:14px;}
        .fam-tag,.gender-tag{font-size:11px;padding:2px 10px;border-radius:20px;background:rgba(0,0,0,0.06);}
        table{width:100%;border-collapse:collapse;font-size:11px;}
        td{padding:5px 8px;border-bottom:1px solid rgba(0,0,0,0.06);text-align:right;}
        .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-left:4px;}
        .foot{margin-top:20px;text-align:center;font-size:10px;color:#999;}
      </style></head><body>
      <div class="logo">PROMISE</div><div class="sub">بروميس للسياحة والسفر</div>
      <h2>قائمة توزيع الغرف - ${selectedGroup.group_name}</h2>
      <div class="info">كود: ${selectedGroup.group_code} | تاريخ السفر: ${fmtDate(selectedGroup.departure_date)} | غرف: ${rooms.length} | مسافرين: ${assignments.length}</div>
      ${roomHTML}
      <div class="foot">Promise Travel · ${new Date().toLocaleDateString('ar-EG')}</div>
      </body></html>`);
    w.document.close();
    w.print();
  };

  const exportRoomingList = () => {
    if (!selectedGroup) return;
    const rows: Record<string, string | number | null | undefined>[] = [];
    rooms.forEach((room) => {
      const roomAssigns = assignments.filter((a) => a.room_id === room.id);
      roomAssigns.forEach((a) => {
        rows.push({
          'Client Code': a.customers?.client_code || '—',
          'اسم العميل': a.customers?.name || '—',
          'الموبايل': a.customers?.phone || '—',
          'رقم الجواز': a.customers?.passport_number || '—',
          'الفندق': room.hotel || '—',
          'رقم الغرفة': room.room_number || '—',
          'نوع الغرفة': roomTypeLabels[room.room_type],
          'الجنس': room.gender === 'male' ? 'رجال' : room.gender === 'female' ? 'سيدات' : 'عائلة',
          'العائلة': room.families?.family_name || '—',
          'الدور': room.floor || '—',
          'الحالة': roomStatusLabels[room.status],
        });
      });
    });
    exportToExcel(rows, `rooming_list_${selectedGroup.group_code}`);
  };

  const exportRoomingPDF = () => {
    if (!selectedGroup) return;
    const rows = rooms.map((room) => {
      const roomAssigns = assignments.filter((a) => a.room_id === room.id);
      const cells = roomAssigns.map((a) => `
        <tr>
          <td>${a.customers?.client_code || '—'}</td>
          <td>${a.customers?.name || '—'}</td>
          <td dir="ltr">${a.customers?.phone || '—'}</td>
          <td>${a.customers?.passport_number || '—'}</td>
          <td>${room.hotel || '—'}</td>
          <td>${room.room_number || '—'}</td>
          <td>${roomTypeLabels[room.room_type]}</td>
        </tr>
      `).join('');
      return `
        <tr><td colspan="7" style="background:#0c224f;color:#fff;padding:6px;font-weight:700;">
          غرفة ${room.room_number || '—'} · ${roomTypeLabels[room.room_type]} · ${roomStatusLabels[room.status]}
          ${room.families?.family_name ? ' · عائلة: ' + room.families.family_name : ''}
        </td></tr>
        ${cells}
      `;
    }).join('');
    exportToPDF(
      `قائمة توزيع الغرف - ${selectedGroup.group_name}`,
      `<table><thead><tr><th>Client Code</th><th>الاسم</th><th>الموبايل</th><th>الجواز</th><th>الفندق</th><th>غرفة</th><th>النوع</th></tr></thead><tbody>${rows}</tbody></table>`
    );
  };

  // ===== Filtered groups =====
  const filteredGroups = groups.filter((g) => {
    const q = groupSearch.toLowerCase();
    if (q) {
      const name = g.group_name.toLowerCase();
      const code = g.group_code.toLowerCase();
      if (!name.includes(q) && !code.includes(q)) return false;
    }
    return true;
  });

  const canEdit = profile?.role === 'مدير تشغيل' || profile?.role === 'مدير عام' || profile?.role === 'admin' || true;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="section-title">إدارة الإقامة وتوزيع الغرف</h2>
          <p className="section-subtitle">توزيع العملاء على الغرف، إدارة العائلات، وقوائم الإقامة</p>
        </div>
        {selectedGroup && (
          <div className="flex gap-2">
            <button onClick={printRoomingList} className="btn-outline flex items-center gap-1.5"><Printer size={15} /> طباعة</button>
            <button onClick={exportRoomingList} className="btn-outline flex items-center gap-1.5"><Download size={15} /> Excel</button>
            <button onClick={exportRoomingPDF} className="btn-outline flex items-center gap-1.5"><FileText size={15} /> PDF</button>
            {canEdit && selectedGroup.status !== 'مكتملة بنجاح' && selectedGroup.status !== 'ملغاة' && (
              <button onClick={() => setShowReturnModal(true)} className="btn-gold flex items-center gap-1.5"><RotateCcw size={15} /> إرجاع المجموعة</button>
            )}
          </div>
        )}
      </div>

      {!selectedGroup ? (
        <>
          {/* Group selector */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="relative mb-3">
              <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
              <input value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} placeholder="ابحث عن مجموعة..." className="form-input pr-9" />
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-navy-700" /></div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا توجد مجموعات سفر</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredGroups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => loadGroupData(g)}
                    className="text-right p-4 rounded-xl border border-gray-100 hover:border-navy-300 hover:bg-navy-50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-navy-900 text-sm">{g.group_name}</h3>
                      <span className="text-xs font-mono text-gold-600">{g.group_code}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{g.service_type}</span>
                      <span>·</span>
                      <span>{g.current_count} مسافر</span>
                      {g.departure_date && <><span>·</span><span>{fmtDate(g.departure_date)}</span></>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Back button + group info */}
          <button onClick={() => setSelectedGroup(null)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy-700">
            <ArrowRight size={14} /> العودة لقائمة المجموعات
          </button>

          <div className="bg-gradient-navy rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center"><Home size={20} /></div>
                <div>
                  <h3 className="font-bold text-lg">{selectedGroup.group_name}</h3>
                  <div className="flex items-center gap-2 text-xs text-white/60 mt-0.5">
                    <span className="font-mono">{selectedGroup.group_code}</span>
                    <span>·</span><span>{selectedGroup.service_type}</span>
                    {selectedGroup.departure_date && <><span>·</span><span>{fmtDate(selectedGroup.departure_date)}</span></>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedGroup.hotel_makkah && <span className="text-xs bg-white/10 px-3 py-1 rounded-lg flex items-center gap-1"><Building size={12} /> مكة: {selectedGroup.hotel_makkah}</span>}
                {selectedGroup.hotel_madinah && <span className="text-xs bg-white/10 px-3 py-1 rounded-lg flex items-center gap-1"><Building size={12} /> المدينة: {selectedGroup.hotel_madinah}</span>}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="stat-card">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-1.5"><AlertTriangle size={16} className="text-amber-600" /></div>
              <p className="text-xl font-black text-navy-900">{incompleteRooms}</p>
              <p className="text-xs text-gray-500">غرف غير مكتملة</p>
            </div>
            <div className="stat-card">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-1.5"><CheckCircle2 size={16} className="text-emerald-600" /></div>
              <p className="text-xl font-black text-navy-900">{completedRooms}</p>
              <p className="text-xs text-gray-500">غرف مكتملة</p>
            </div>
            <div className="stat-card">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-1.5"><BedDouble size={16} className="text-blue-600" /></div>
              <p className="text-xl font-black text-navy-900">{availableBeds}</p>
              <p className="text-xs text-gray-500">أسرة متاحة</p>
            </div>
            <div className="stat-card">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center mb-1.5"><Users size={16} className="text-purple-600" /></div>
              <p className="text-xl font-black text-navy-900">{unassigned.length}</p>
              <p className="text-xs text-gray-500">عملاء غير مخصصين</p>
            </div>
          </div>

          {/* Incomplete rooms alerts */}
          {rooms.filter((r) => r.status === 'waiting' && r.current_occupancy < r.capacity && !r.family_id).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <h4 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2"><AlertTriangle size={15} /> تنبيهات الغرف غير المكتملة</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {rooms.filter((r) => r.status === 'waiting' && r.current_occupancy < r.capacity && !r.family_id).map((r) => {
                  const color = roomColors[r.color_tag % roomColors.length];
                  return (
                    <div key={r.id} className={`rounded-xl p-3 ${color.bg} ${color.border} border`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-navy-900">غرفة {r.room_number || '—'}</span>
                        <span className="text-xs font-bold text-amber-700">{roomTypeLabels[r.room_type]}</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        الإشغال: <span className="font-bold">{r.current_occupancy} / {r.capacity}</span>
                      </div>
                      <div className="text-xs text-amber-700 mt-0.5">
                        بانتظار: {r.capacity - r.current_occupancy} ضيف
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unassigned customers */}
          {unassigned.length > 0 && canEdit && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-navy-800 flex items-center gap-2"><UserCheck size={15} className="text-gold-500" /> عملاء بانتظار التوزيع ({unassigned.length})</h4>
                <button onClick={openFamilyModal} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1"><Heart size={12} /> إنشاء عائلة</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {unassigned.map((m) => (
                  <div key={m.id} className="rounded-xl border border-gray-100 p-3 hover:border-navy-200 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-navy-900">{m.customer.name}</span>
                      <span className="text-xs font-mono text-gold-600">{m.customer.client_code}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <span>{m.customer.gender === 'male' ? 'ذكر' : m.customer.gender === 'female' ? 'أنثى' : '—'}</span>
                      <span>·</span>
                      <span dir="ltr">{m.customer.phone || '—'}</span>
                    </div>
                    <button
                      onClick={() => setShowAssignModal(m)}
                      className="w-full btn-gold text-xs py-1.5 flex items-center justify-center gap-1"
                    >
                      <BedDouble size={12} /> توزيع على غرفة
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rooming list (color-coded) */}
          <div>
            <h4 className="text-sm font-bold text-navy-800 mb-3 flex items-center gap-2"><Home size={15} className="text-gold-500" /> قائمة الغرف ({rooms.length})</h4>
            {rooms.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-12 text-gray-400">
                <BedDouble size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">لا توجد غرف مخصصة بعد</p>
                <p className="text-xs mt-1">ابدأ بتوزيع العملاء على الغرف</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rooms.map((room) => {
                  const color = roomColors[room.color_tag % roomColors.length];
                  const roomAssigns = assignments.filter((a) => a.room_id === room.id);
                  const sc = roomStatusConfig[room.status];
                  return (
                    <div key={room.id} className={`rounded-2xl border-2 ${color.border} ${color.bg} p-4`}>
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${color.dot} flex items-center justify-center text-white font-black`}>
                            {room.room_number || '—'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-navy-900 text-sm">غرفة {room.room_number || '—'}</h5>
                              {room.is_locked && <Lock size={12} className="text-gray-500" />}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                              <span>{roomTypeLabels[room.room_type]}</span>
                              <span>·</span>
                              <span>{room.gender === 'male' ? 'رجال' : room.gender === 'female' ? 'سيدات' : 'عائلة'}</span>
                              {room.families?.family_name && <><span>·</span><span className="font-semibold text-purple-700">عائلة {room.families.family_name}</span></>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`badge text-xs ${sc.bg} ${sc.color}`}>{roomStatusLabels[room.status]}</span>
                          <span className="text-xs font-bold text-navy-700">{room.current_occupancy}/{room.capacity}</span>
                          <select
                            value={room.status}
                            onChange={(e) => updateRoomStatus(room, e.target.value as RoomStatus)}
                            className="text-xs rounded-lg border border-gray-200 px-2 py-0.5 bg-white"
                          >
                            {(Object.keys(roomStatusLabels) as RoomStatus[]).map((s) => <option key={s} value={s}>{roomStatusLabels[s]}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Room hotel/floor info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                        <input
                          value={room.hotel || ''}
                          onChange={(e) => updateRoomField(room, 'hotel', e.target.value)}
                          placeholder="الفندق"
                          className="text-xs rounded-lg border border-gray-200 px-2 py-1 bg-white/70"
                        />
                        <input
                          value={room.hotel_branch || ''}
                          onChange={(e) => updateRoomField(room, 'hotel_branch', e.target.value)}
                          placeholder="الفرع"
                          className="text-xs rounded-lg border border-gray-200 px-2 py-1 bg-white/70"
                        />
                        <input
                          value={room.city || ''}
                          onChange={(e) => updateRoomField(room, 'city', e.target.value)}
                          placeholder="المدينة"
                          className="text-xs rounded-lg border border-gray-200 px-2 py-1 bg-white/70"
                        />
                        <input
                          value={room.floor || ''}
                          onChange={(e) => updateRoomField(room, 'floor', e.target.value)}
                          placeholder="الدور"
                          className="text-xs rounded-lg border border-gray-200 px-2 py-1 bg-white/70"
                        />
                      </div>

                      {/* Customer list */}
                      <div className="bg-white/60 rounded-xl p-2">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400 text-[10px]">
                              <th className="text-right pb-1">Client Code</th>
                              <th className="text-right pb-1">الاسم</th>
                              <th className="text-right pb-1">الموبايل</th>
                              <th className="text-right pb-1">الجواز</th>
                              <th className="text-right pb-1">جاهز</th>
                              <th className="text-right pb-1">إجراءات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {roomAssigns.map((a) => (
                              <tr key={a.id} className="border-t border-white">
                                <td className="py-1.5 font-mono text-gold-600 font-bold">{a.customers?.client_code || '—'}</td>
                                <td className="py-1.5 font-semibold text-navy-900">{a.customers?.name}</td>
                                <td className="py-1.5 text-gray-600" dir="ltr">{a.customers?.phone || '—'}</td>
                                <td className="py-1.5 text-gray-600 font-mono">{a.customers?.passport_number || '—'}</td>
                                <td className="py-1.5">
                                  {a.customers?.travel_ready ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Clock size={14} className="text-amber-500" />}
                                </td>
                                <td className="py-1.5">
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => onNavigate('customer-details', a.customer_id)} className="p-1 rounded-lg hover:bg-navy-100 text-navy-600"><Eye size={12} /></button>
                                    {canEdit && !room.is_locked && <button onClick={() => removeFromRoom(a)} className="p-1 rounded-lg hover:bg-red-100 text-red-500"><Trash2 size={12} /></button>}
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {roomAssigns.length === 0 && <tr><td colSpan={6} className="text-center py-2 text-gray-400">لا يوجد عملاء</td></tr>}
                          </tbody>
                        </table>
                      </div>

                      {/* Capacity bar */}
                      <div className="mt-2">
                        <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${room.current_occupancy >= room.capacity ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${(room.current_occupancy / room.capacity) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Travel ready checklist for all assigned customers */}
          {assignments.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h4 className="text-sm font-bold text-navy-800 mb-3 flex items-center gap-2"><CheckCircle2 size={15} className="text-gold-500" /> قائمة الجاهزية للسفر</h4>
              <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
                <table className="w-full data-table min-w-[800px]">
                  <thead>
                    <tr>
                      <th>Client Code</th><th>العميل</th><th>الدفع</th><th>التأشيرة</th><th>الطيران</th>
                      <th>الفندق</th><th>الغرفة</th><th>النقل</th><th>المشرف</th><th>جاهز</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => {
                      const c = a.customers;
                      if (!c) return null;
                      const ChecklistCell = ({ field, label }: { field: string; label: string }) => (
                        <td>
                          <button
                            onClick={() => toggleChecklistItem(c, field)}
                            className={`p-1 rounded-lg transition-all ${(c as any)[field] ? 'text-emerald-600 bg-emerald-50' : 'text-gray-300 hover:bg-gray-50'}`}
                            title={label}
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        </td>
                      );
                      return (
                        <tr key={a.id}>
                          <td className="font-mono text-xs text-gold-600 font-bold">{c.client_code}</td>
                          <td className="font-semibold text-navy-900">{c.name}</td>
                          <ChecklistCell field="hotel_confirmed" label="الفندق" />
                          <ChecklistCell field="room_assigned" label="الغرفة" />
                          <ChecklistCell field="transportation_confirmed" label="النقل" />
                          <ChecklistCell field="supervisor_assigned" label="المشرف" />
                          <td className="text-xs text-gray-500">{c.bookings?.[0]?.payment_status === 'مدفوع بالكامل' ? '✓' : '—'}</td>
                          <td className="text-xs text-gray-500">{c.travel_checklist?.visa_done ? '✓' : '—'}</td>
                          <td className="text-xs text-gray-500">{c.flight_ticket_id ? '✓' : '—'}</td>
                          <td>{c.travel_ready ? <span className="badge bg-emerald-100 text-emerald-700 text-xs">جاهز</span> : <span className="badge bg-amber-100 text-amber-700 text-xs">غير جاهز</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Assign Room Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAssignModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-navy-900">توزيع العميل على غرفة</h3>
              <button onClick={() => setShowAssignModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-5">
              <div className="bg-navy-50 rounded-xl p-3 mb-4">
                <p className="font-bold text-navy-900">{showAssignModal.customer.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {showAssignModal.customer.gender === 'male' ? 'ذكر' : 'أنثى'} ·
                  <span className="font-mono text-gold-600 mr-1"> {showAssignModal.customer.client_code}</span>
                </p>
              </div>
              <p className="text-sm text-gray-500 mb-3">اختر نوع الغرفة:</p>
              <div className="grid grid-cols-3 gap-2">
                {(['double', 'triple', 'quad'] as RoomType[]).map((rt) => (
                  <button
                    key={rt}
                    onClick={() => assignToRoom(showAssignModal, rt)}
                    disabled={saving}
                    className="p-3 rounded-xl border border-gray-200 hover:border-navy-300 hover:bg-navy-50 transition-all text-center"
                  >
                    <BedDouble size={20} className="mx-auto mb-1 text-navy-600" />
                    <p className="text-sm font-bold text-navy-900">{roomTypeLabels[rt]}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Family Modal */}
      {showFamilyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowFamilyModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-navy-900">إنشاء عائلة جديدة</h3>
              <button onClick={() => setShowFamilyModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="form-label">اسم العائلة <span className="text-red-500">*</span></label>
                <input value={familyName} onChange={(e) => setFamilyName(e.target.value)} className="form-input" placeholder="عائلة أحمد" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="form-label mb-0">اختر أفراد العائلة ({familyMembers.length})</label>
                  <span className="text-xs text-gray-500">
                    {familyMembers.length <= 2 ? 'دوبل' : familyMembers.length === 3 ? 'تربل' : familyMembers.length === 4 ? 'كواد' : familyMembers.length > 4 ? 'غرف متصلة' : 'اختر 2+'}
                  </span>
                </div>
                <div className="relative mb-2">
                  <Search size={15} className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                  <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="بحث..." className="form-input pr-9 text-sm" />
                </div>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-100">
                  {availableCustomers
                    .filter((c) => {
                      const q = customerSearch.toLowerCase();
                      return !q || c.name?.toLowerCase().includes(q) || c.client_code?.toLowerCase().includes(q);
                    })
                    .map((c) => (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 p-2.5 border-b border-gray-50 cursor-pointer hover:bg-navy-50 ${familyMembers.includes(c.id) ? 'bg-gold-50' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={familyMembers.includes(c.id)}
                          onChange={() => toggleFamilyMember(c.id)}
                        />
                        <span className="font-semibold text-sm text-navy-900 flex-1">{c.name}</span>
                        <span className="text-xs text-gray-500">{c.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                        <span className="text-xs font-mono text-gold-600">{c.client_code}</span>
                      </label>
                    ))}
                </div>
              </div>
              {familyMembers.length >= 2 && (
                <div className="bg-purple-50 rounded-xl p-3 text-sm text-purple-700">
                  سيتم إنشاء غرفة {familyMembers.length <= 2 ? 'دوبل (2)' : familyMembers.length === 3 ? 'تربل (3)' : familyMembers.length === 4 ? 'كواد (4)' : 'متصل (' + familyMembers.length + ')'} ومقفلة تلقائياً
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowFamilyModal(false)} className="btn-outline">إلغاء</button>
              <button
                onClick={createFamily}
                disabled={saving || familyMembers.length < 2 || !familyName.trim()}
                className="btn-gold"
              >
                {saving ? 'جارٍ الإنشاء...' : 'إنشاء العائلة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Group Modal */}
      {showReturnModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowReturnModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-navy-900">إرجاع المجموعة</h3>
              <button onClick={() => setShowReturnModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-5">
              <div className="bg-amber-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-800">
                  سيتم تنفيذ الإجراءات التالية بشكل تلقائي:
                </p>
                <ul className="text-xs text-amber-700 mt-2 space-y-1">
                  <li>• وضع علامة "مكتملة بنجاح" على المجموعة</li>
                  <li>• تغيير حالة جميع العملاء إلى "مكتمل"</li>
                  <li>• إغلاق جميع المهام التشغيلية</li>
                  <li>• أرشفة كل العملاء (يختفون من الصفحات اليومية)</li>
                  <li>• تبقى السجلات متاحة عبر البحث الذكي والتقارير</li>
                </ul>
              </div>
              <p className="text-sm text-gray-600">هل أنت متأكد من إرجاع مجموعة <span className="font-bold text-navy-900">{selectedGroup.group_name}</span>؟</p>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowReturnModal(false)} className="btn-outline">إلغاء</button>
              <button onClick={returnGroup} disabled={saving} className="btn-gold">{saving ? 'جارٍ المعالجة...' : 'تأكيد الإرجاع'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
