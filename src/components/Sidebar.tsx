import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, CalendarCheck, Package,
  Tag, UserCog, BarChart3, Settings, LogOut,
  Plane, ClipboardList, FileBarChart, Bus,
  TrendingUp, Wallet, CalendarClock, Receipt, Calculator,
  FileCheck, Building2, FileText, MessageSquare, Zap,
  ChevronDown, ShoppingBag, DollarSign, MapPin,
  ListChecks, Calendar as CalIcon, Truck, Ticket as TicketIcon, ShieldAlert, Layers, Crown, Printer, X,
} from 'lucide-react';
import type { Page } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Permissions } from '../lib/permissions';

interface NavItem {
  id: Page;
  label: string;
  icon: React.ElementType;
  permissionKey?: keyof Permissions;
  alwaysVisible?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  anyPermission?: Array<keyof Permissions>;
  alwaysVisible?: boolean;
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'home',
    label: 'الرئيسية',
    icon: LayoutDashboard,
    alwaysVisible: true,
    items: [
      { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, alwaysVisible: true },
      { id: 'client-search', label: 'البحث الذكي', icon: Zap, alwaysVisible: true },
      { id: 'tasks', label: 'إدارة المهام', icon: ListChecks, alwaysVisible: true },
      { id: 'calendar', label: 'التقويم', icon: CalIcon, alwaysVisible: true },
    ],
  },
  {
    id: 'workflow',
    label: 'مسار العميل بالترتيب',
    icon: ShoppingBag,
    alwaysVisible: true,
    items: [
      { id: 'inquiries', label: '1. الاستعلامات', icon: MessageSquare, permissionKey: 'inquiries_view' },
      { id: 'sales-portal', label: 'بوابة المندوب', icon: Users },
      { id: 'customers', label: '2. العملاء CRM', icon: Users, permissionKey: 'customers_view' },
      { id: 'revenue', label: '3. الحسابات الإيرادات', icon: TrendingUp, permissionKey: 'accounting_revenue' },
      { id: 'payments', label: '3. الحسابات المدفوعات', icon: Wallet, permissionKey: 'accounting_payments' },
      { id: 'operations', label: '4. قسم التشغيل', icon: FileCheck, permissionKey: 'operations_access' },
      { id: 'flight-tickets', label: '5. قسم الطيران', icon: TicketIcon, permissionKey: 'bookings_view' },
      { id: 'travel-groups', label: 'الأفواج (Travel Groups)', icon: Layers, alwaysVisible: true },
    ],
  },
  {
    id: 'vip',
    label: 'قسم عملاء VIP',
    icon: Crown,
    anyPermission: ['vip_management_access'],
    items: [
      { id: 'vip-dashboard', label: 'لوحة عملاء VIP', icon: Crown, permissionKey: 'vip_management_access' },
    ],
  },
  {
    id: 'accounting_more',
    label: 'الحسابات والتكاليف',
    icon: DollarSign,
    anyPermission: ['accounting_installments', 'accounting_expenses', 'accounting_commissions', 'invoices_view'],
    items: [
      { id: 'installments', label: 'الأقساط', icon: CalendarClock, permissionKey: 'accounting_installments' },
      { id: 'expenses', label: 'المصروفات والتكاليف', icon: Receipt, permissionKey: 'accounting_expenses' },
      { id: 'commissions', label: 'العمولات', icon: Calculator, permissionKey: 'accounting_commissions' },
      { id: 'invoices', label: 'الفواتير', icon: FileText, permissionKey: 'invoices_view' },
      { id: 'profit', label: 'تحليل الأرباح', icon: TrendingUp, permissionKey: 'reports_view' },
    ],
  },
  {
    id: 'sales_more',
    label: 'إدارة المبيعات والباقات',
    icon: Package,
    anyPermission: ['bookings_view', 'packages_view', 'offers_view', 'hotels_view'],
    items: [
      { id: 'bookings', label: 'الحجوزات', icon: CalendarCheck, permissionKey: 'bookings_view' },
      { id: 'visa', label: 'إدارة التأشيرات', icon: Plane, permissionKey: 'bookings_view' },
      { id: 'packages', label: 'الباقات', icon: Package, permissionKey: 'packages_view' },
      { id: 'offers', label: 'العروض', icon: Tag, permissionKey: 'offers_view' },
      { id: 'hotels', label: 'إدارة الفنادق', icon: Building2, permissionKey: 'hotels_view' },
    ],
  },
  {
    id: 'internal',
    label: 'السياحة الداخلية',
    icon: MapPin,
    anyPermission: ['reports_view'],
    items: [
      { id: 'internal-trips', label: 'الرحلات', icon: Bus, permissionKey: 'reports_view' },
      { id: 'internal-groups', label: 'المجموعات الداخلية', icon: Layers, alwaysVisible: true },
      { id: 'internal-bookings', label: 'الحجوزات الداخلية', icon: ClipboardList, permissionKey: 'reports_view' },
      { id: 'internal-customers', label: 'عملاء الرحلات', icon: Users, permissionKey: 'reports_view' },
      { id: 'internal-reports', label: 'تقارير الرحلات', icon: FileBarChart, permissionKey: 'reports_view' },
    ],
  },
  {
    id: 'print_orders',
    label: 'أوامر الطباعة',
    icon: Printer,
    anyPermission: ['offers_view', 'inquiries_view'],
    items: [
      { id: 'quotation-form', label: 'طلب عرض سعر', icon: FileText, permissionKey: 'inquiries_view' },
    ],
  },
  {
    id: 'hr_admin',
    label: 'إدارة النظام والموظفين',
    icon: UserCog,
    anyPermission: ['employees_view', 'settings_access', 'reports_view'],
    items: [
      { id: 'super-admin', label: 'لوحة التحكم Super Admin', icon: ShieldAlert, permissionKey: 'settings_access' },
      { id: 'employees', label: 'الموظفون والصلاحيات', icon: UserCog, permissionKey: 'employees_view' },
      { id: 'suppliers', label: 'إدارة الموردين', icon: Truck, permissionKey: 'reports_view' },
      { id: 'reports', label: 'التقارير الشاملة', icon: BarChart3, permissionKey: 'reports_view' },
      { id: 'settings', label: 'الإعدادات', icon: Settings, permissionKey: 'settings_access' },
    ],
  },
];

const SECTION_ACTIVE_PAGES: Record<string, Page[]> = {
  home: ['dashboard', 'client-search', 'tasks', 'calendar'],
  workflow: ['inquiries', 'customers', 'customer-add', 'customer-details', 'revenue', 'payments', 'operations', 'flight-tickets', 'sales-portal'],
  vip: ['vip-dashboard', 'vip-details'],
  accounting_more: ['installments', 'expenses', 'commissions', 'invoices', 'profit'],
  sales_more: ['bookings', 'visa', 'packages', 'offers', 'hotels'],
  internal: ['internal-trips', 'internal-groups', 'internal-bookings', 'internal-customers', 'internal-reports'],
  print_orders: ['quotation-form'],
  hr_admin: ['employees', 'suppliers', 'reports', 'settings', 'super-admin'],
};

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ currentPage, onNavigate, onLogout, isOpen, onClose }: Props) {
  const { profile, can, canAccessPage } = useAuth();
  const isSuper = profile?.role === 'super_admin' || profile?.role === 'مالك النظام' || profile?.role === 'مدير النظام';

  const [hasNewTasksOrUpdates, setHasNewTasksOrUpdates] = useState(false);

  useEffect(() => {
    if (!profile) return;
    
    const checkTasks = async () => {
      try {
        const isManager = profile.role === 'super_admin' || profile.role === 'مالك النظام' || profile.role === 'مدير النظام';
        let query = supabase.from('tasks').select('id, status, created_at');
        if (!isManager) {
          query = query.eq('employee_id', profile.id);
        }
        const { data: tasksData } = await query;
        if (!tasksData) return;
        
        // Load seen tasks from local storage
        let seenTasks: string[] = [];
        try {
          const savedSeen = localStorage.getItem('seen_tasks');
          if (savedSeen) seenTasks = JSON.parse(savedSeen);
        } catch {}

        // 1. Check if there are any new tasks (status === 'جديدة' and NOT seen)
        const hasNewTask = tasksData.some(t => t.status === 'جديدة' && !seenTasks.includes(t.id));
        if (hasNewTask) {
          setHasNewTasksOrUpdates(true);
          return;
        }

        // 2. Check if there are any unread task updates/comments
        const taskIds = tasksData.map(t => t.id);
        if (taskIds.length > 0) {
          const { data: updatesData } = await supabase
            .from('task_updates')
            .select('task_id, created_at, employee_id')
            .in('task_id', taskIds);
          
          if (updatesData) {
            // Load last viewed timestamps from local storage
            let lastViewed: Record<string, string> = {};
            try {
              const saved = localStorage.getItem('last_viewed_task_updates');
              if (saved) lastViewed = JSON.parse(saved);
            } catch {}
            
            const hasUnreadUpdate = updatesData.some(u => {
              if (u.employee_id === profile.id) return false;
              const lastTime = lastViewed[u.task_id];
              return !lastTime || new Date(u.created_at) > new Date(lastTime);
            });
            
            if (hasUnreadUpdate) {
              setHasNewTasksOrUpdates(true);
              return;
            }
          }
        }
        
        setHasNewTasksOrUpdates(false);
      } catch (err) {
        console.error('Error checking new tasks:', err);
      }
    };

    checkTasks();
    const interval = setInterval(checkTasks, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  const defaultOpen: Record<string, boolean> = {};
  NAV_SECTIONS.forEach(s => {
    defaultOpen[s.id] = (SECTION_ACTIVE_PAGES[s.id] ?? []).includes(currentPage);
  });
  defaultOpen['home'] = true;
  defaultOpen['workflow'] = true;
  defaultOpen['vip'] = true;

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(defaultOpen);

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isItemVisible = (item: NavItem): boolean => {
    if (isSuper) return true;
    if (!canAccessPage(item.id)) return false;
    if (item.alwaysVisible) return true;
    if (!item.permissionKey) return true;
    return can(item.permissionKey);
  };

  const isSectionVisible = (section: NavSection): boolean => {
    if (isSuper) return true;
    return section.items.some(item => isItemVisible(item));
  };

  const isSectionActive = (sectionId: string): boolean => {
    return (SECTION_ACTIVE_PAGES[sectionId] ?? []).includes(currentPage);
  };

  return (
    <aside className={`w-64 bg-gradient-to-b from-navy-950 to-navy-900 flex flex-col h-screen fixed right-0 top-0 z-30 shadow-2xl transition-transform duration-300 ${
      isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
    }`}>
      {/* Logo */}
      <div className="flex flex-col items-center justify-center py-5 px-4 border-b border-white/10 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/10 text-white md:hidden transition-colors"
            title="إغلاق"
          >
            <X size={18} />
          </button>
        )}
        <img
          src="/WhatsApp_Image_2026-06-20_at_4.57.54_PM.jpeg"
          alt="Promise Logo"
          className="h-14 w-14 rounded-2xl object-contain bg-white p-1 shadow-lg"
        />
        <div className="mt-2.5 text-center">
          <span className="text-white font-bold text-base tracking-wider">PROMISE</span>
          <p className="text-gold-400 text-[10px] font-medium mt-0.5">نظام إدارة الحج والعمرة</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {NAV_SECTIONS.map(section => {
          if (!isSectionVisible(section)) return null;

          const visibleItems = section.items.filter(isItemVisible);
          if (visibleItems.length === 0) return null;

          const SectionIcon = section.icon;
          const isOpen = openSections[section.id] ?? false;
          const sectionActive = isSectionActive(section.id);

          return (
            <div key={section.id}>
              <button
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-right transition-all ${
                  sectionActive && !isOpen
                    ? 'bg-white/10 text-white'
                    : isOpen
                    ? 'bg-white/5 text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <SectionIcon size={16} className={sectionActive || isOpen ? 'text-gold-400' : 'text-gold-400/60'} />
                <span className="flex-1 text-xs font-semibold text-right">{section.label}</span>
                {section.id === 'home' && hasNewTasksOrUpdates && !isOpen && (
                  <span className="relative flex h-2 w-2 ml-1 flex-shrink-0 animate-pulse">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
                {sectionActive && !isOpen && (!hasNewTasksOrUpdates || section.id !== 'home') && (
                  <div className="w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" />
                )}
                <ChevronDown
                  size={13}
                  className={`flex-shrink-0 transition-transform duration-200 text-white/40 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="mr-3 pr-3 border-r border-white/10 mt-0.5 mb-1 space-y-0.5">
                  {visibleItems.map(item => {
                    const ItemIcon = item.icon;
                    const isActive = currentPage === item.id ||
                      (item.id === 'customers' && (currentPage === 'customer-add' || currentPage === 'customer-details'));
                    return (
                      <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-right text-xs transition-all ${
                          isActive
                            ? 'bg-gold-500 text-navy-900 font-bold shadow-sm'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <ItemIcon size={14} className={isActive ? 'text-navy-900' : 'text-gold-400/70'} />
                        <span className="flex-1 text-right">{item.label}</span>
                        {item.id === 'tasks' && hasNewTasksOrUpdates && (
                          <span className="relative flex h-2 w-2 mr-auto flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User info + Logout */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3 space-y-2">
        {profile && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
            <div className="w-8 h-8 rounded-lg bg-gold-500 flex items-center justify-center text-navy-900 font-bold text-sm flex-shrink-0">
              {profile.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{profile.name}</p>
              <p className="text-gold-400 text-[10px] truncate">{profile.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className="sidebar-item w-full text-right text-red-300 hover:bg-red-500/20 hover:text-red-200"
        >
          <LogOut size={18} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
