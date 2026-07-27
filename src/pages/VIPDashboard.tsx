import { useEffect, useState } from 'react';
import {
  Users, Search, Filter, Plus,
  ChevronRight, Calendar, User, MapPin, Hash,
  Loader2, Crown, RefreshCw, Clock, Wallet,
  Briefcase, FileCheck, Shield, Plane, Hotel
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Page, Employee } from '../types';

interface VIPClient {
  id: string;
  name: string;
  phone: string;
  client_code: string | null;
  status: string;
  created_at: string;
  vip_requests: {
    id: string;
    travel_city: string | null;
    departure_date: string | null;
    return_date: string | null;
    travelers_count: number;
    current_stage: string;
    assigned_vip_manager: string | null;
  } | null;
  assigned_manager_profile?: {
    id: string;
    name: string;
  } | null;
}

const stagesConfig = [
  { key: 'accounts', label: 'الحسابات', color: 'border-blue-500 text-blue-600 bg-blue-50/50', icon: Wallet },
  { key: 'operations', label: 'التشغيل', color: 'border-purple-500 text-purple-600 bg-purple-50/50', icon: Briefcase },
  { key: 'bookings', label: 'الحجوزات', color: 'border-pink-500 text-pink-600 bg-pink-50/50', icon: FileCheck },
  { key: 'flights', label: 'الطيران', color: 'border-cyan-500 text-cyan-600 bg-cyan-50/50', icon: Plane },
  { key: 'hotels', label: 'الفنادق', color: 'border-orange-500 text-orange-600 bg-orange-50/50', icon: Hotel },
  { key: 'housing', label: 'التسكين', color: 'border-indigo-500 text-indigo-600 bg-indigo-50/50', icon: Users },
  { key: 'visas', label: 'التأشيرات', color: 'border-amber-500 text-amber-600 bg-amber-50/50', icon: Shield },
  { key: 'ready', label: 'جاهز للسفر', color: 'border-emerald-500 text-emerald-600 bg-emerald-50/50', icon: Crown },
];

interface Props {
  onNavigate: (page: Page, id?: string) => void;
}

export default function VIPDashboard({ onNavigate }: Props) {
  const [clients, setClients] = useState<VIPClient[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'kanban' | 'list'>('kanban');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: customersData }, { data: empData }] = await Promise.all([
        supabase
          .from('customers')
          .select(`
            id, name, phone, client_code, status, created_at,
            vip_requests!inner (
              id, travel_city, departure_date, return_date, travelers_count, current_stage, assigned_vip_manager
            )
          `)
          .eq('is_vip', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('employees')
          .select('*')
          .eq('is_active', true)
      ]);

      if (empData) setEmployees(empData as Employee[]);

      if (customersData) {
        // Fetch manager names
        const formatted: VIPClient[] = await Promise.all(
          (customersData as any[]).map(async (c) => {
            let managerProfile = null;
            const managerId = c.vip_requests?.assigned_vip_manager;
            if (managerId) {
              const { data: mData } = await supabase
                .from('user_profiles')
                .select('id, name')
                .eq('id', managerId)
                .maybeSingle();
              managerProfile = mData;
            }
            return {
              id: c.id,
              name: c.name,
              phone: c.phone,
              client_code: c.client_code,
              status: c.status,
              created_at: c.created_at,
              vip_requests: c.vip_requests,
              assigned_manager_profile: managerProfile,
            };
          })
        );
        setClients(formatted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter((c) => {
    const matchSearch =
      !search ||
      c.name.includes(search) ||
      c.phone.includes(search) ||
      (c.client_code && c.client_code.includes(search)) ||
      (c.vip_requests?.travel_city && c.vip_requests.travel_city.includes(search));

    const matchManager =
      !managerFilter || c.vip_requests?.assigned_vip_manager === managerFilter;

    return matchSearch && matchManager;
  });

  const getStats = () => {
    const total = filteredClients.length;
    const ready = filteredClients.filter(c => c.vip_requests?.current_stage === 'ready').length;
    const inProgress = total - ready;
    return { total, ready, inProgress };
  };

  const stats = getStats();

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <Crown size={24} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-navy-900 flex items-center gap-2">إدارة ومتابعة عملاء VIP</h2>
            <p className="text-gray-500 text-xs">مسار عمل مستقل بالكامل ومتابعة دقيقة لكل تفاصيل الرحلة المصممة خصيصاً</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('customer-add')}
            className="btn-gold shadow-md shadow-gold-500/10"
          >
            <Plus size={16} /> إضافة عميل VIP جديد
          </button>
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-navy-900 transition-all"
            title="تحديث البيانات"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Crown size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold">إجمالي عملاء VIP</p>
            <h3 className="text-xl font-bold text-navy-900 mt-1">{stats.total} عملاء</h3>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold">قيد التجهيز والتنفيذ</p>
            <h3 className="text-xl font-bold text-navy-900 mt-1">{stats.inProgress} طلبات</h3>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <FileCheck size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold">جاهزون للسفر</p>
            <h3 className="text-xl font-bold text-navy-900 mt-1">{stats.ready} عملاء</h3>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 min-w-[280px]">
          <div className="relative flex-1">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث باسم العميل، كود، مدينة السفر..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pr-9 w-full"
            />
          </div>

          <div className="relative w-48">
            <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="form-input pr-8 w-full"
            >
              <option value="">كل مشرفين الـ VIP</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'kanban' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500 hover:text-navy-800'
            }`}
          >
            عرض اللوحة (Kanban)
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'list' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500 hover:text-navy-800'
            }`}
          >
            عرض القائمة
          </button>
        </div>
      </div>

      {/* Dashboard View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={32} className="animate-spin text-gold-500" />
          <p className="text-gray-500 text-sm font-semibold">جارٍ تحميل لوحة عملاء VIP...</p>
        </div>
      ) : activeTab === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 overflow-x-auto pb-4">
          {stagesConfig.map((stage) => {
            const stageClients = filteredClients.filter(
              (c) => c.vip_requests?.current_stage === stage.key
            );
            const StageIcon = stage.icon;

            return (
              <div key={stage.key} className="flex flex-col min-w-[240px] bg-gray-50/50 rounded-2xl p-3 border border-gray-100 h-[600px]">
                {/* Column Header */}
                <div className={`flex items-center justify-between mb-3 pb-2 border-b border-gray-200/50`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stage.color}`}>
                      <StageIcon size={16} />
                    </div>
                    <span className="text-xs font-black text-navy-900">{stage.label}</span>
                  </div>
                  <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-black text-navy-800 border border-gray-200">
                    {stageClients.length}
                  </span>
                </div>

                {/* Column Items */}
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                  {stageClients.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <p className="text-[10px] text-gray-400 font-bold">لا يوجد عملاء هنا</p>
                    </div>
                  ) : (
                    stageClients.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => onNavigate('vip-details', client.client_code || client.id)}
                        className="bg-white border border-gray-100 hover:border-amber-300 rounded-xl p-3.5 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 group relative"
                      >
                        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight size={14} className="text-gold-500 rotate-180" />
                        </div>

                        <div className="flex items-center gap-1.5 mb-2">
                          <Crown size={12} className="text-amber-500" />
                          <h4 className="text-xs font-black text-navy-900 group-hover:text-gold-600 truncate max-w-[160px]">{client.name}</h4>
                        </div>

                        <div className="space-y-1.5 text-[10px] text-gray-500">
                          {client.client_code && (
                            <div className="flex items-center gap-1">
                              <Hash size={10} className="text-gray-400" />
                              <span className="font-mono font-bold text-navy-800">{client.client_code}</span>
                            </div>
                          )}
                          {client.vip_requests?.travel_city && (
                            <div className="flex items-center gap-1">
                              <MapPin size={10} className="text-gray-400" />
                              <span>الوجهة: {client.vip_requests.travel_city}</span>
                            </div>
                          )}
                          {(client.vip_requests?.departure_date || client.vip_requests?.return_date) && (
                            <div className="flex items-center gap-1">
                              <Calendar size={10} className="text-gray-400" />
                              <span>{client.vip_requests?.departure_date || '—'}</span>
                            </div>
                          )}
                          {client.assigned_manager_profile?.name && (
                            <div className="flex items-center gap-1 pt-1.5 border-t border-gray-100 mt-2">
                              <User size={10} className="text-gold-500" />
                              <span className="text-navy-800 font-semibold truncate max-w-[140px]">{client.assigned_manager_profile.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-navy-950 text-white text-xs">
                  <th className="py-4 px-6 font-bold">كود العميل</th>
                  <th className="py-4 px-6 font-bold">الاسم بالكامل</th>
                  <th className="py-4 px-6 font-bold">الهاتف</th>
                  <th className="py-4 px-6 font-bold">مدينة السفر</th>
                  <th className="py-4 px-6 font-bold">الرحلة</th>
                  <th className="py-4 px-6 font-bold">المشرف المسؤول</th>
                  <th className="py-4 px-6 font-bold">مرحلة التنفيذ الحالية</th>
                  <th className="py-4 px-6 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400 font-bold">
                      لا يوجد عملاء VIP يتطابقون مع خيارات البحث والفلترة.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => {
                    const currentStageObj = stagesConfig.find(s => s.key === client.vip_requests?.current_stage);
                    return (
                      <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-6 font-mono font-black text-navy-900">{client.client_code || '—'}</td>
                        <td className="py-4 px-6 font-bold text-navy-800">{client.name}</td>
                        <td className="py-4 px-6 text-gray-500 font-mono" dir="ltr">{client.phone}</td>
                        <td className="py-4 px-6 text-gray-700">{client.vip_requests?.travel_city || '—'}</td>
                        <td className="py-4 px-6 text-gray-500">
                          {client.vip_requests?.departure_date ? (
                            <span>{client.vip_requests.departure_date} إلى {client.vip_requests.return_date || '—'}</span>
                          ) : '—'}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-navy-950">{client.assigned_manager_profile?.name || 'غير معين'}</span>
                        </td>
                        <td className="py-4 px-6">
                          {currentStageObj ? (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold border ${currentStageObj.color}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {currentStageObj.label}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => onNavigate('vip-details', client.client_code || client.id)}
                            className="inline-flex items-center gap-1 text-gold-600 hover:text-gold-700 font-bold"
                          >
                            متابعة التنفيذ <ChevronRight size={14} className="rotate-180" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
