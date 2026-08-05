import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Building2, User, Plus, Trash2, Edit2, CheckCircle2, AlertCircle } from 'lucide-react';
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
    family_id: '',
    room_id: '',
    gender: 'ذكر'
  });

  useEffect(() => {
    loadData();
  }, [groupId]);

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
    if (!newFamilyName.trim()) return;
    const { data, error } = await supabase.from('group_families').insert({
      group_id: groupId,
      family_name: newFamilyName
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
      rooming_type: member.rooming_type || 'منفرد',
      family_id: member.family_id || '',
      room_id: member.room_id || '',
      gender: member.gender || 'ذكر'
    });
  };

  const saveAssign = async () => {
    if (!assigningMember) return;
    await supabase.from('travel_group_members').update({
      rooming_type: assignForm.rooming_type,
      family_id: assignForm.rooming_type === 'عائلة' ? (assignForm.family_id || null) : null,
      room_id: assignForm.room_id || null,
      gender: assignForm.gender
    }).eq('id', assigningMember.id);
    
    setAssigningMember(null);
    onUpdate(); // bubble up to refresh member list
  };

  const printRoomingList = () => {
    // Group members by room, family, and single
    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>شيت التسكين</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
  h1 { font-size: 18px; text-align: center; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #1e3a5f; color: white; padding: 7px 5px; text-align: right; }
  td { padding: 6px 5px; border-bottom: 1px solid #ddd; }
  .room-family { background: #f3e8ff; /* purple-50 */ }
  .room-male { background: #eff6ff; /* blue-50 */ }
  .room-female { background: #fdf2f8; /* pink-50 */ }
  .unassigned { background: #fff1f2; color: #e11d48; }
  @media print { body { margin: 10px; } }
</style>
</head>
<body>
<h1>شيت التسكين (Rooming List)</h1>
<table>
  <thead>
    <tr>
      <th>الاسم</th>
      <th>الكود</th>
      <th>العائلة</th>
      <th>الغرفة</th>
      <th>نوع التسكين</th>
    </tr>
  </thead>
  <tbody>
    ${members.map(m => {
      const fam = families.find(f => f.id === m.family_id);
      const room = rooms.find(r => r.id === m.room_id);
      let rowClass = 'unassigned';
      if (room) {
        if (room.is_family) rowClass = 'room-family';
        else if (room.gender === 'رجال') rowClass = 'room-male';
        else rowClass = 'room-female';
      }
      return `<tr class="${rowClass}">
        <td>${m.customers.name}</td>
        <td>${m.customers.client_code}</td>
        <td>${fam ? fam.family_name : '—'}</td>
        <td>${room ? (room.room_number ? room.room_number + ' - ' : '') + room.room_type : '—'}</td>
        <td>${m.rooming_type || '—'}</td>
      </tr>`;
    }).join('')}
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
              placeholder="اسم العائلة (مثال: عائلة أحمد)" 
              className="form-input flex-1 text-sm"
            />
            <button onClick={createFamily} disabled={!newFamilyName} className="btn-gold px-4 py-2 text-sm flex items-center gap-1 whitespace-nowrap">
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
          <h4 className="text-sm font-bold text-navy-800 mb-4 flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2"><Building2 size={16} className="text-gold-500" /> إدارة الغرف</div>
            <button onClick={() => setShowRoomForm(!showRoomForm)} className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1">
              <Plus size={14} /> إضافة غرفة
            </button>
          </h4>
          
          {showRoomForm && (
            <div className="bg-gray-50 p-4 rounded-xl space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label text-[10px]">رقم الغرفة (اختياري)</label>
                  <input value={roomForm.room_number} onChange={e => setRoomForm({...roomForm, room_number: e.target.value})} className="form-input text-sm" placeholder="مثال: 101" />
                </div>
                <div>
                  <label className="form-label text-[10px]">نوع الغرفة</label>
                  <select value={roomForm.room_type} onChange={e => setRoomForm({...roomForm, room_type: e.target.value})} className="form-input text-sm">
                    <option>ثنائي</option>
                    <option>ثلاثي</option>
                    <option>رباعي</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={roomForm.is_family} onChange={e => setRoomForm({...roomForm, is_family: e.target.checked, gender: e.target.checked ? 'عائلة' : 'رجال'})} className="rounded text-gold-500 focus:ring-gold-500" />
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
                    <option>رجال</option>
                    <option>نساء</option>
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
                    <span className={`badge ${m.rooming_type === 'عائلة' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {m.rooming_type || 'غير محدد'}
                    </span>
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
                <div>
                  <label className="form-label text-xs">العائلة</label>
                  <select value={assignForm.family_id} onChange={e => setAssignForm({...assignForm, family_id: e.target.value})} className="form-input text-sm">
                    <option value="">-- اختر العائلة --</option>
                    {families.map(f => <option key={f.id} value={f.id}>{f.family_name}</option>)}
                  </select>
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
                  <option value="">-- غير مسكن --</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.room_number ? `${r.room_number} - ` : ''}{r.room_type} ({r.is_family ? 'عائلية' : r.gender})
                    </option>
                  ))}
                </select>
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
