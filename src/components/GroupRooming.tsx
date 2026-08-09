import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Building2, User, Plus, Trash2, Edit2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import type { TravelGroupMember, GroupFamily, GroupRoom } from '../types';

interface Props {
  groupId: string;
  members: TravelGroupMember[];
  onUpdate: () => void;
}

export default function GroupRooming({ groupId, members, onUpdate }: Props) {
  const [families, setFamilies] = useState<GroupFamily[]>([]);
  const [rooms, setRooms] = useState<GroupRoom[]>([]);
  const [loading, setLoading] = useState(true);

  // Global default family capacity state
  const [maxFamilyCapacity, setMaxFamilyCapacity] = useState<number>(() => {
    const saved = localStorage.getItem('max_family_capacity');
    return saved ? parseInt(saved) || 5 : 5;
  });

  useEffect(() => {
    localStorage.setItem('max_family_capacity', String(maxFamilyCapacity));
  }, [maxFamilyCapacity]);

  // Form states
  const [newFamilyName, setNewFamilyName] = useState('');
  
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    room_type: 'ثنائي',
    is_family: false,
    family_id: '',
    gender: 'عائلة',
  });

  // Assign member states
  const [assigningMember, setAssigningMember] = useState<TravelGroupMember | null>(null);
  const [assignForm, setAssignForm] = useState({
    rooming_type: 'منفرد',
    is_head: false,
    family_id: '',
    room_id: '',
    gender: 'ذكر'
  });

  useEffect(() => {
    loadData();
  }, [groupId]);

  // Auto-allocate member to the first available room when family_id, gender, or rooming_type changes
  useEffect(() => {
    if (!assigningMember) return;
    
    if (assignForm.rooming_type === 'عائلة') {
      if (!assignForm.family_id) {
        setAssignForm(prev => ({ ...prev, room_id: '' }));
        return;
      }
      
      const familyRooms = rooms.filter(r => r.is_family && r.family_id === assignForm.family_id);
      const recommendedRoom = familyRooms.find(r => {
        const occupants = members.filter(m => m.room_id === r.id && m.id !== assigningMember.id);
        let capacity = maxFamilyCapacity;
        const typeStr = r.room_type || '';
        if (typeStr.includes('مفتوح') || typeStr === 'عائلة') {
          capacity = Infinity;
        } else {
          const match = typeStr.match(/\d+/);
          capacity = match ? parseInt(match[0]) : maxFamilyCapacity;
        }
        return occupants.length < capacity;
      });
      
      setAssignForm(prev => ({ ...prev, room_id: recommendedRoom?.id || '' }));
    } else {
      // Find first available room for this gender
      const genderRooms = rooms.filter(r => !r.is_family && r.gender === (assignForm.gender === 'ذكر' ? 'رجال' : 'نساء'));
      const recommendedRoom = genderRooms.find(r => {
        const occupants = members.filter(m => m.room_id === r.id && m.id !== assigningMember.id);
        let capacity = 2; // default
        if (r.room_type === 'ثنائي') capacity = 2;
        else if (r.room_type === 'ثلاثي') capacity = 3;
        else if (r.room_type === 'رباعي') capacity = 4;
        return occupants.length < capacity;
      });
      
      setAssignForm(prev => ({ ...prev, room_id: recommendedRoom?.id || '' }));
    }
  }, [assignForm.rooming_type, assignForm.family_id, assignForm.gender, assigningMember?.id, rooms, members]);

  const loadData = async () => {
    setLoading(true);
    const [famRes, roomRes] = await Promise.all([
      supabase.from('group_families').select('*').eq('group_id', groupId).order('created_at'),
      supabase.from('group_rooms').select('*').eq('group_id', groupId).order('created_at'),
    ]);
    setFamilies((famRes.data as GroupFamily[]) || []);
    setRooms((roomRes.data as GroupRoom[]) || []);
    setLoading(false);
  };

  const createFamily = async () => {
    const familyName = newFamilyName.trim() || `عائلة جديدة #${families.length + 1}`;
    const { data, error } = await supabase.from('group_families').insert({
      group_id: groupId,
      family_name: familyName
    }).select().single();
    if (data) {
      setFamilies([...families, data as GroupFamily]);
      setNewFamilyName('');
    }
  };

  const createRoom = async () => {
    const { data, error } = await supabase.from('group_rooms').insert({
      group_id: groupId,
      room_number: roomForm.room_number || null,
      room_type: roomForm.room_type,
      is_family: roomForm.is_family,
      family_id: roomForm.is_family && roomForm.family_id ? roomForm.family_id : null,
      gender: roomForm.gender,
    }).select().single();
    if (data) {
      setRooms([...rooms, data as GroupRoom]);
      setShowRoomForm(false);
      setRoomForm({ room_number: '', room_type: 'ثنائي', is_family: false, family_id: '', gender: 'عائلة' });
    }
  };

  const deleteRoom = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف الغرفة؟ سيتم تفريغ الأعضاء المرتبطين بها.')) return;
    await supabase.from('group_rooms').delete().eq('id', id);
    setRooms(rooms.filter(r => r.id !== id));
    onUpdate(); // refresh members
  };

  const deleteFamily = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف العائلة؟ سيتم تفريغ الأعضاء المرتبطين بها.')) return;
    await supabase.from('group_families').delete().eq('id', id);
    setFamilies(families.filter(f => f.id !== id));
    onUpdate(); // refresh members
  };

  const openAssignModal = (member: TravelGroupMember) => {
    setAssigningMember(member);
    setAssignForm({
      rooming_type: member.rooming_type?.startsWith('عائلة') ? 'عائلة' : (member.rooming_type || 'منفرد'),
      is_head: member.rooming_type === 'عائلة - رئيس',
      family_id: member.family_id || '',
      room_id: member.room_id || '',
      gender: member.gender || 'ذكر'
    });
  };

  const saveAssign = async () => {
    if (!assigningMember) return;

    // Check capacity limit if a room is selected
    if (assignForm.room_id) {
      const targetRoom = rooms.find(r => r.id === assignForm.room_id);
      if (targetRoom) {
        const occupants = members.filter(m => m.room_id === assignForm.room_id && m.id !== assigningMember.id);
        const currentCount = occupants.length;

        let capacity = Infinity;
        if (targetRoom.is_family) {
          const typeStr = targetRoom.room_type || '';
          if (typeStr.includes('مفتوح') || typeStr === 'عائلة') {
            capacity = Infinity;
          } else {
            const match = typeStr.match(/\d+/);
            capacity = match ? parseInt(match[0]) : Infinity;
          }
        } else {
          if (targetRoom.room_type === 'ثنائي') capacity = 2;
          else if (targetRoom.room_type === 'ثلاثي') capacity = 3;
          else if (targetRoom.room_type === 'رباعي') capacity = 4;
        }

        if (currentCount >= capacity) {
          alert(`⚠️ تنبيه: لا يمكن إضافة العضو إلى الغرفة لأنها ممتلئة بالكامل (الحد الأقصى: ${capacity === Infinity ? 'غير محدود' : `${capacity} أفراد`}).`);
          return;
        }
      }
    }

    const finalRoomingType = assignForm.rooming_type === 'عائلة'
      ? (assignForm.is_head ? 'عائلة - رئيس' : 'عائلة')
      : assignForm.rooming_type;

    // If this member is designated as the family head, clear the head status of other members of this family
    if (finalRoomingType === 'عائلة - رئيس' && assignForm.family_id) {
      const otherHeads = members.filter(m => m.family_id === assignForm.family_id && m.rooming_type === 'عائلة - رئيس' && m.id !== assigningMember.id);
      if (otherHeads.length > 0) {
        const otherHeadIds = otherHeads.map(h => h.id);
        await supabase.from('travel_group_members').update({ rooming_type: 'عائلة' }).in('id', otherHeadIds);
      }
    }

    await supabase.from('travel_group_members').update({
      rooming_type: finalRoomingType,
      family_id: assignForm.rooming_type === 'عائلة' ? (assignForm.family_id || null) : null,
      room_id: assignForm.room_id || null,
      gender: assignForm.gender
    }).eq('id', assigningMember.id);
    
    setAssigningMember(null);
    onUpdate(); // bubble up to refresh member list
  };

  const printRoomingList = () => {
    const colorsPalette = [
      { bg: '#eff6ff', text: '#1e40af' }, // Light Blue
      { bg: '#f0fdf4', text: '#166534' }, // Light Green
      { bg: '#f5f3ff', text: '#5b21b6' }, // Light Purple
      { bg: '#fefce8', text: '#854d0e' }, // Light Yellow
      { bg: '#fdf2f8', text: '#9d174d' }, // Light Pink
      { bg: '#e0e7ff', text: '#3730a3' }, // Light Indigo
      { bg: '#f0fdfa', text: '#0f766e' }, // Light Teal
      { bg: '#fff7ed', text: '#9a3412' }, // Light Orange
      { bg: '#ecfeff', text: '#0891b2' }, // Light Cyan
      { bg: '#ecfdf5', text: '#065f46' }, // Light Emerald
      { bg: '#fffbeb', text: '#92400e' }  // Light Amber
    ];

    const roomColorMap: Record<string, typeof colorsPalette[0]> = {};
    let colorIndex = 0;
    rooms.forEach((room) => {
      roomColorMap[room.id] = colorsPalette[colorIndex % colorsPalette.length];
      colorIndex++;
    });

    const rowsHtml: string[] = [];

    // 1. Render all rooms with their members and empty beds
    rooms.forEach(room => {
      const roomMembers = members.filter(m => m.room_id === room.id);
      
      let capacity = roomMembers.length;
      if (room.is_family) {
        const typeStr = room.room_type || '';
        if (typeStr.includes('مفتوح') || typeStr === 'عائلة') {
          capacity = roomMembers.length;
        } else {
          const match = typeStr.match(/\d+/);
          capacity = match ? parseInt(match[0]) : roomMembers.length;
        }
      } else {
        if (room.room_type === 'ثنائي') capacity = 2;
        else if (room.room_type === 'ثلاثي') capacity = 3;
        else if (room.room_type === 'رباعي') capacity = 4;
      }

      // Ensure capacity is at least the number of assigned members
      capacity = Math.max(capacity, roomMembers.length);

      const color = roomColorMap[room.id] || { bg: '#ffffff', text: '#000000' };
      const styleAttr = `style="background-color: ${color.bg} !important; color: ${color.text} !important; font-weight: bold;"`;

      const fam = room.is_family && room.family_id ? families.find(f => f.id === room.family_id) : null;
      const familyName = fam ? fam.family_name : '—';
      const roomLabel = room.room_number ? `غرفة ${room.room_number} (${room.room_type})` : `غرفة ${room.room_type}`;

      // Print assigned members
      roomMembers.forEach(m => {
        rowsHtml.push(`
          <tr ${styleAttr}>
            <td>${m.customers.name}</td>
            <td dir="ltr" style="text-align: right;">${m.customers.phone || '—'}</td>
            <td>${m.customers.client_code}</td>
            <td>${familyName}</td>
            <td>${roomLabel}</td>
            <td>${m.rooming_type || '—'}</td>
          </tr>
        `);
      });

      // Print empty beds
      const emptyCount = capacity - roomMembers.length;
      for (let i = 0; i < emptyCount; i++) {
        rowsHtml.push(`
          <tr ${styleAttr}>
            <td style="border-style: dashed; color: rgba(0,0,0,0.4); font-style: italic;">(سرير شاغر)</td>
            <td style="border-style: dashed;">—</td>
            <td style="border-style: dashed;">—</td>
            <td style="border-style: dashed;">${familyName}</td>
            <td style="border-style: dashed;">${roomLabel}</td>
            <td style="border-style: dashed; color: rgba(0,0,0,0.4); font-style: italic;">شاغر</td>
          </tr>
        `);
      }
    });

    // 2. Render unassigned members at the end
    const unassignedMembers = members.filter(m => !m.room_id);
    if (unassignedMembers.length > 0) {
      unassignedMembers.forEach(m => {
        const fam = families.find(f => f.id === m.family_id);
        rowsHtml.push(`
          <tr class="unassigned">
            <td style="color: #9ca3af; font-style: italic;">${m.customers.name}</td>
            <td dir="ltr" style="text-align: right;">${m.customers.phone || '—'}</td>
            <td>${m.customers.client_code}</td>
            <td>${fam ? fam.family_name : '—'}</td>
            <td>— (غير مسكن)</td>
            <td>${m.rooming_type || '—'}</td>
          </tr>
        `);
      });
    }

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>شيت التسكين الملون</title>
<style>
  * {
    -webkit-print-color-adjust: exact !important; 
    print-color-adjust: exact !important; 
  }
  body { font-family: Arial, sans-serif; font-size: 13px; margin: 20px; color: #333; }
  h1 { font-size: 22px; text-align: center; margin-bottom: 5px; color: #0c224f; font-weight: 900; }
  .subtitle { text-align: center; color: #666; margin-bottom: 25px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  th { background: #0c224f; color: white; padding: 12px 10px; text-align: right; font-weight: bold; font-size: 13px; }
  td { padding: 11px 10px; border: 1px solid #e5e7eb; font-size: 13px; }
  .unassigned { background: #fafafa; color: #9ca3af; }
  @media print { 
    body { margin: 10px; } 
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
  }
</style>
</head>
<body>
<h1>شيت التسكين (Rooming List)</h1>
<div class="subtitle">شركة بروميس للسياحة والسفر</div>
<table>
  <thead>
    <tr>
      <th>الاسم</th>
      <th>رقم الهاتف</th>
      <th>كود العميل</th>
      <th>العائلة</th>
      <th>الغرفة</th>
      <th>نوع التسكين</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml.join('')}
  </tbody>
</table>
</body>
</html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  if (loading) return <div className="p-10 text-center text-gray-500">جاري تحميل بيانات التسكين...</div>;

  const incompleteRooms = rooms.map(r => {
    const occupantsCount = members.filter(m => m.room_id === r.id).length;
    let capacity = Infinity;
    if (r.is_family) {
      const typeStr = r.room_type || '';
      if (typeStr.includes('مفتوح') || typeStr === 'عائلة') {
        capacity = Infinity;
      } else {
        const match = typeStr.match(/\d+/);
        capacity = match ? parseInt(match[0]) : Infinity;
      }
    } else {
      if (r.room_type === 'ثنائي') capacity = 2;
      else if (r.room_type === 'ثلاثي') capacity = 3;
      else if (r.room_type === 'رباعي') capacity = 4;
    }

    return {
      room: r,
      occupantsCount,
      capacity,
      missing: capacity - occupantsCount
    };
  }).filter(item => item.capacity !== Infinity && item.missing > 0);

  return (
    <div className="p-6 space-y-8 h-full overflow-y-auto bg-gray-50/50">
      
      {/* Top controls: Create Family & Create Room */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Create Family */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h4 className="text-sm font-bold text-navy-800 mb-4 flex items-center gap-2">
            <Users size={16} className="text-gold-500" /> إدارة العائلات
          </h4>
          <div className="flex gap-2">
            <input 
              value={newFamilyName} 
              onChange={e => setNewFamilyName(e.target.value)}
              placeholder="اسم العائلة (اختياري - سيتم التوليد تلقائياً إن تركت فارغة)" 
              className="form-input flex-1 text-sm"
            />
            <button onClick={createFamily} className="btn-gold px-4 py-2 text-sm flex items-center gap-1 whitespace-nowrap">
              <Plus size={14} /> إضافة عائلة
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {families.map(f => (
              <span key={f.id} className="badge bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 flex items-center gap-2">
                <Users size={12} /> {f.family_name}
                <button onClick={() => deleteFamily(f.id)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
              </span>
            ))}
            {families.length === 0 && <span className="text-xs text-gray-400">لا توجد عائلات مسجلة.</span>}
          </div>
        </div>

        {/* Create Room */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-navy-800 font-bold text-sm">
              <Building2 size={16} className="text-gold-500" /> إدارة الغرف
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 font-medium">سعة العائلة الافتراضية:</span>
              <input 
                type="number" 
                min={1}
                value={maxFamilyCapacity} 
                onChange={e => setMaxFamilyCapacity(Math.max(1, parseInt(e.target.value) || 5))} 
                className="w-12 text-center border border-gray-200 rounded px-1.5 py-0.5 text-xs font-bold text-gold-600 focus:outline-none focus:border-gold-500"
              />
            </div>
            <button onClick={() => setShowRoomForm(!showRoomForm)} className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1">
              <Plus size={14} /> إضافة غرفة
            </button>
          </div>
          
          {showRoomForm && (
            <div className="bg-gray-50 p-4 rounded-xl space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label text-[10px]">رقم الغرفة (اختياري)</label>
                  <input value={roomForm.room_number} onChange={e => setRoomForm({...roomForm, room_number: e.target.value})} className="form-input text-sm" placeholder="مثال: 101" />
                </div>
                <div>
                  <label className="form-label text-[10px]">{roomForm.is_family ? 'سعة الغرفة العائلية' : 'نوع الغرفة'}</label>
                  {!roomForm.is_family ? (
                    <select value={roomForm.room_type} onChange={e => setRoomForm({...roomForm, room_type: e.target.value})} className="form-input text-sm">
                      <option value="ثنائي">ثنائي</option>
                      <option value="ثلاثي">ثلاثي</option>
                      <option value="رباعي">رباعي</option>
                    </select>
                  ) : (
                    <select value={roomForm.room_type} onChange={e => setRoomForm({...roomForm, room_type: e.target.value})} className="form-input text-sm">
                      <option value="عائلة - مفتوح">قبول أي عدد عادي</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, maxFamilyCapacity].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map(num => (
                        <option key={num} value={`عائلة - ${num}`}>
                          {num} {num === 1 ? 'شخص واحد' : num === 2 ? 'شخصين' : `${num} أشخاص`} {num === maxFamilyCapacity ? '(السعة الافتراضية)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={roomForm.is_family} onChange={e => setRoomForm({...roomForm, is_family: e.target.checked, gender: e.target.checked ? 'عائلة' : 'رجال', room_type: e.target.checked ? `عائلة - ${maxFamilyCapacity}` : 'ثنائي'})} className="rounded text-gold-500 focus:ring-gold-500" />
                  غرفة عائلية؟
                </label>
              </div>
              {roomForm.is_family ? (
                <div>
                  <label className="form-label text-[10px]">اختر العائلة</label>
                  <select value={roomForm.family_id} onChange={e => setRoomForm({...roomForm, family_id: e.target.value})} className="form-input text-sm">
                    <option value="">-- اختر العائلة --</option>
                    {families.map(f => <option key={f.id} value={f.id}>{f.family_name}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="form-label text-[10px]">الجنس</label>
                  <select value={roomForm.gender} onChange={e => setRoomForm({...roomForm, gender: e.target.value})} className="form-input text-sm">
                    <option value="رجال">رجال</option>
                    <option value="نساء">نساء</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowRoomForm(false)} className="text-xs text-gray-500 hover:text-gray-700">إلغاء</button>
                <button onClick={createRoom} className="btn-gold text-xs px-3 py-1.5">حفظ الغرفة</button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {rooms.map(r => (
              <span key={r.id} className={`badge border px-3 py-1.5 flex items-center gap-2 ${r.is_family ? 'bg-purple-50 text-purple-700 border-purple-200' : (r.gender === 'رجال' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-pink-50 text-pink-700 border-pink-200')}`}>
                <Building2 size={12} /> {r.room_number ? `${r.room_number} - ` : ''}{r.room_type} ({r.is_family ? 'عائلية' : r.gender})
                <button onClick={() => deleteRoom(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
              </span>
            ))}
            {rooms.length === 0 && !showRoomForm && <span className="text-xs text-gray-400">لا توجد غرف مسجلة.</span>}
          </div>
        </div>
      </div>

      {/* Alert Panel for Incomplete Rooms */}
      {incompleteRooms.length > 0 && (
        <div className="bg-amber-50 border border-amber-250 rounded-2xl p-5 shadow-sm space-y-3">
          <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600 animate-bounce" />
            الغرف غير المكتملة ({incompleteRooms.length} غرف تحتاج إلى استكمال التسكين)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {incompleteRooms.map(({ room, occupantsCount, capacity, missing }) => {
              const fam = room.is_family && room.family_id ? families.find(f => f.id === room.family_id) : null;
              return (
                <div key={room.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-amber-100 flex flex-col justify-between text-xs space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy-950 flex items-center gap-1">
                      <Building2 size={12} className="text-gold-500" />
                      {room.room_number ? `غرفة ${room.room_number}` : 'غرفة بدون رقم'}
                    </span>
                    <span className={`badge ${room.is_family ? 'bg-purple-100 text-purple-700' : (room.gender === 'رجال' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700')}`}>
                      {room.is_family ? 'عائلية' : room.gender}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    <p>النوع: <span className="font-semibold">{room.room_type}</span></p>
                    {fam && <p>العائلة: <span className="font-semibold text-purple-700">{fam.family_name}</span></p>}
                    <p>المسكنون: <span className="font-semibold text-navy-900">{occupantsCount}</span> من <span className="font-semibold text-navy-900">{capacity}</span></p>
                  </div>
                  <div className="pt-1.5 border-t border-amber-50 flex items-center justify-between text-amber-800 font-bold">
                    <span>ينقصها:</span>
                    <span className="badge bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                      {missing === 1 ? 'شخص واحد' : missing === 2 ? 'شخصين' : `${missing} أشخاص`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unassigned Members & Member List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-navy-50 flex items-center justify-between">
          <h4 className="text-sm font-bold text-navy-900 flex items-center gap-2">
            <User size={16} className="text-gold-500" /> قائمة تسكين الأعضاء
          </h4>
          <div className="flex items-center gap-3">
            <button onClick={printRoomingList} className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1">
              طباعة شيت التسكين الملون
            </button>
            <span className="badge bg-white text-navy-700 border border-gray-200">الإجمالي: {members.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-5 py-3">الاسم</th>
                <th className="px-5 py-3">نوع التسكين</th>
                <th className="px-5 py-3">العائلة</th>
                <th className="px-5 py-3">الغرفة</th>
                <th className="px-5 py-3">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.map(m => {
                const fam = families.find(f => f.id === m.family_id);
                const room = rooms.find(r => r.id === m.room_id);
                return (
                  <tr key={m.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-semibold text-navy-900">{m.customers.name}</td>
                    <td className="px-5 py-3">
                      {m.rooming_type === 'عائلة - رئيس' ? (
                        <span className="badge bg-amber-100 text-amber-800 border border-amber-200 font-bold flex items-center gap-1 w-fit">
                          👑 رئيس العائلة
                        </span>
                      ) : (
                        <span className={`badge ${m.rooming_type === 'عائلة' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {m.rooming_type || 'غير محدد'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{fam ? fam.family_name : '—'}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {room ? (
                        <span className="flex items-center gap-1 font-semibold">
                          <Building2 size={12} className="text-navy-400" />
                          {room.room_number ? `${room.room_number} - ` : ''}{room.room_type}
                        </span>
                      ) : (
                        <span className="text-red-500 flex items-center gap-1"><AlertCircle size={12}/> غير مسكن</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => openAssignModal(m)} className="btn-outline text-[10px] px-2 py-1 flex items-center gap-1">
                        <Edit2 size={12} /> تعيين
                      </button>
                    </td>
                  </tr>
                )
              })}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">لا يوجد أعضاء في هذا الفوج</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Modal */}
      {assigningMember && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-navy-900 text-white flex items-center justify-between">
              <h4 className="font-bold">تسكين العضو</h4>
            </div>
            <div className="p-5 space-y-4 bg-gray-50">
              <p className="text-sm font-semibold text-navy-900 mb-2">{assigningMember.customers.name}</p>
              
              <div>
                <label className="form-label text-xs">نوع التسكين</label>
                <select value={assignForm.rooming_type} onChange={e => setAssignForm({...assignForm, rooming_type: e.target.value})} className="form-input text-sm">
                  <option value="منفرد">منفرد</option>
                  <option value="عائلة">عائلة</option>
                </select>
              </div>

              {assignForm.rooming_type === 'عائلة' ? (
                <div className="space-y-3">
                  <div>
                    <label className="form-label text-xs">العائلة</label>
                    <select value={assignForm.family_id} onChange={e => setAssignForm({...assignForm, family_id: e.target.value})} className="form-input text-sm">
                      <option value="">-- اختر العائلة --</option>
                      {families.map(f => <option key={f.id} value={f.id}>{f.family_name}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-navy-800 cursor-pointer pt-1">
                    <input 
                      type="checkbox" 
                      checked={assignForm.is_head} 
                      onChange={e => setAssignForm({...assignForm, is_head: e.target.checked})} 
                      className="rounded text-gold-500 focus:ring-gold-500 w-4 h-4" 
                    />
                    <span className="font-semibold">👑 تعيين كأب / رئيس للعائلة</span>
                  </label>
                </div>
              ) : (
                <div>
                  <label className="form-label text-xs">الجنس</label>
                  <select value={assignForm.gender} onChange={e => setAssignForm({...assignForm, gender: e.target.value})} className="form-input text-sm">
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>
              )}

              <div>
                <label className="form-label text-xs">الغرفة (اختياري)</label>
                <select value={assignForm.room_id} onChange={e => setAssignForm({...assignForm, room_id: e.target.value})} className="form-input text-sm">
                  <option value="">-- غير مسكن (تسكين تلقائي) --</option>
                  {rooms.filter(r => {
                    if (assignForm.rooming_type === 'عائلة') {
                      return r.is_family && r.family_id === assignForm.family_id;
                    }
                    return !r.is_family && (r.gender === (assignForm.gender === 'ذكر' ? 'رجال' : 'نساء'));
                  }).map(r => (
                    <option key={r.id} value={r.id}>
                      {r.room_number ? `${r.room_number} - ` : ''}{r.room_type} ({r.is_family ? 'عائلية' : r.gender})
                    </option>
                  ))}
                </select>
                {assignForm.rooming_type === 'عائلة' && !assignForm.family_id && (
                  <p className="text-[10px] text-gray-400 mt-1">💡 يرجى اختيار العائلة أولاً لرؤية غرفها.</p>
                )}
                {assignForm.rooming_type === 'عائلة' && assignForm.family_id && rooms.filter(r => r.is_family && r.family_id === assignForm.family_id).length === 0 && (
                  <p className="text-[10px] text-red-500 mt-1">⚠️ لا توجد غرف لهذه العائلة. يرجى إنشاء غرفة عائلية وربطها بهذه العائلة.</p>
                )}
              </div>

            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2 bg-white">
              <button onClick={() => setAssigningMember(null)} className="btn-outline text-xs px-4 py-2">إلغاء</button>
              <button onClick={saveAssign} className="btn-gold text-xs px-4 py-2 flex items-center gap-1"><CheckCircle2 size={14} /> حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
