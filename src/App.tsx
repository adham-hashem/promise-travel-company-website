import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import AddCustomer from './pages/AddCustomer';
import CustomerDetails from './pages/CustomerDetails';
import Bookings from './pages/Bookings';
import Packages from './pages/Packages';
import Offers from './pages/Offers';
import Employees from './pages/Employees';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import InternalTrips from './pages/InternalTrips';
import InternalTripBookings from './pages/InternalTripBookings';
import InternalCustomers from './pages/InternalCustomers';
import InternalReports from './pages/InternalReports';
import Revenue from './pages/Revenue';
import Payments from './pages/Payments';
import Installments from './pages/Installments';
import Expenses from './pages/Expenses';
import Commissions from './pages/Commissions';
import OperationsDashboard from './pages/OperationsDashboard';
import Hotels from './pages/Hotels';
import Invoices from './pages/Invoices';
import Inquiries from './pages/Inquiries';
import ClientSearch from './pages/ClientSearch';
import Tasks from './pages/Tasks';
import CalendarPage from './pages/CalendarPage';
import ProfitAnalysis from './pages/ProfitAnalysis';
import Suppliers from './pages/Suppliers';
import VisaManagement from './pages/VisaManagement';
import FlightTickets from './pages/FlightTickets';
import TravelGroups from './pages/TravelGroups';
import Accommodation from './pages/Accommodation';
import VIPTrips from './pages/VIPTrips';
import VIPDetails from './pages/VIPDetails';
import SuperAdminPanel from './pages/SuperAdminPanel';
import SalesAgentPortal from './pages/SalesAgentPortal';
import InternalGroups from './pages/InternalGroups';
import QuotationForm from './pages/QuotationForm';
import Layout from './components/Layout';
import WebsiteRouter from './components/public/WebsiteRouter';
import type { Page } from './types';
import type { Permissions } from './lib/permissions';

// Maps each page to the permission required to view it
const PAGE_PERMISSIONS: Partial<Record<Page, keyof Permissions>> = {
  customers: 'customers_view',
  'customer-add': 'customers_add',
  'customer-details': 'customers_view',
  bookings: 'bookings_view',
  packages: 'packages_view',
  offers: 'offers_view',
  employees: 'employees_view',
  reports: 'reports_view',
  settings: 'settings_access',
  'internal-trips': 'reports_view',
  'internal-bookings': 'reports_view',
  'internal-customers': 'reports_view',
  'internal-reports': 'reports_view',
  revenue: 'accounting_revenue',
  payments: 'accounting_payments',
  installments: 'accounting_installments',
  expenses: 'accounting_expenses',
  commissions: 'accounting_commissions',
  operations: 'operations_access',
  hotels: 'hotels_view',
  invoices: 'invoices_view',
  inquiries: 'inquiries_view',
  tasks: 'reports_view',
  calendar: 'reports_view',
  profit: 'reports_view',
  suppliers: 'reports_view',
  visa: 'bookings_view',
  'flight-tickets': 'bookings_view',
  'travel-groups': 'operations_access',
  'accommodation': 'operations_access',
};

function AppInner() {
  const { session, profile, loading, signOut, can } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [adminRoute, setAdminRoute] = useState(() => {
    if (typeof window === 'undefined') return false;
    const h = window.location.hash.replace(/^#/, '').toLowerCase();
    return h === '/admin' || h === '/dashboard';
  });

  // Listen for hash changes so staff can navigate to /admin or /dashboard.
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace(/^#/, '').toLowerCase();
      setAdminRoute(h === '/admin' || h === '/dashboard');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // When the profile loads, if they were on a page they don't have access to, redirect
  useEffect(() => {
    if (!profile) return;
    const requiredPerm = PAGE_PERMISSIONS[currentPage];
    if (requiredPerm && !can(requiredPerm)) {
      setCurrentPage('dashboard');
    }
  }, [profile]);

  const navigate = (page: Page, id?: string) => {
    // Guard navigation
    const requiredPerm = PAGE_PERMISSIONS[page];
    if (requiredPerm && !can(requiredPerm)) {
      return; // silently block
    }
    setCurrentPage(page);
    if (id) setSelectedCustomerId(id);
    setSearch('');
  };

  const logout = async () => {
    await signOut();
    setCurrentPage('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-950 to-navy-800 flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <img src="/WhatsApp_Image_2026-06-20_at_4.57.54_PM.jpeg" alt="Promise" className="w-16 h-16 rounded-2xl object-contain bg-white p-1 shadow-lg" />
          <div className="w-8 h-8 border-4 border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />
          <p className="text-white/60 text-sm">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  // Dashboard is private — only reachable via /admin or /dashboard hash route.
  // Default (customers) view is the public website.
  if (!adminRoute) {
    return <WebsiteRouter />;
  }

  if (!session || !profile) {
    return <Login />;
  }

  // Block inactive users
  if (profile.status === 'غير نشط') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-950 to-navy-800 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <h2 className="text-white font-bold text-xl mb-2">الحساب معطل</h2>
          <p className="text-white/60 text-sm mb-6">تواصل مع مدير النظام لتفعيل حسابك</p>
          <button onClick={logout} className="btn-gold w-full justify-center">تسجيل الخروج</button>
        </div>
      </div>
    );
  }

  const showSearch = currentPage === 'customers' || currentPage === 'bookings';

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={navigate}
      onLogout={logout}
      searchValue={showSearch ? search : undefined}
      onSearchChange={showSearch ? setSearch : undefined}
    >
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'customers' && can('customers_view') && <Customers onNavigate={navigate} searchValue={search} />}
      {currentPage === 'customer-add' && can('customers_add') && <AddCustomer onNavigate={navigate} />}
      {currentPage === 'customer-details' && can('customers_view') && <CustomerDetails customerId={selectedCustomerId} onNavigate={navigate} />}
      {currentPage === 'bookings' && can('bookings_view') && <Bookings searchValue={search} />}
      {currentPage === 'packages' && can('packages_view') && <Packages />}
      {currentPage === 'offers' && can('offers_view') && <Offers />}
      {currentPage === 'employees' && can('employees_view') && <Employees onNavigate={navigate} />}
      {currentPage === 'reports' && can('reports_view') && <Reports />}
      {currentPage === 'settings' && can('settings_access') && <Settings />}
      {currentPage === 'internal-trips' && can('reports_view') && <InternalTrips />}
      {currentPage === 'internal-bookings' && can('reports_view') && <InternalTripBookings />}
      {currentPage === 'internal-customers' && can('reports_view') && <InternalCustomers />}
      {currentPage === 'internal-reports' && can('reports_view') && <InternalReports />}
      {currentPage === 'revenue' && can('accounting_revenue') && <Revenue />}
      {currentPage === 'payments' && can('accounting_payments') && <Payments />}
      {currentPage === 'installments' && can('accounting_installments') && <Installments />}
      {currentPage === 'expenses' && can('accounting_expenses') && <Expenses />}
      {currentPage === 'commissions' && can('accounting_commissions') && <Commissions />}
      {currentPage === 'operations' && can('operations_access') && <OperationsDashboard />}
      {currentPage === 'hotels' && can('hotels_view') && <Hotels />}
      {currentPage === 'invoices' && can('invoices_view') && <Invoices />}
      {currentPage === 'inquiries' && can('inquiries_view') && <Inquiries />}
      {currentPage === 'client-search' && <ClientSearch onNavigate={navigate} />}
      {currentPage === 'tasks' && can('reports_view') && <Tasks onNavigate={navigate} />}
      {currentPage === 'calendar' && can('reports_view') && <CalendarPage />}
      {currentPage === 'profit' && can('reports_view') && <ProfitAnalysis />}
      {currentPage === 'suppliers' && can('reports_view') && <Suppliers />}
      {currentPage === 'visa' && can('bookings_view') && <VisaManagement onNavigate={navigate} />}
      {currentPage === 'flight-tickets' && can('bookings_view') && <FlightTickets onNavigate={navigate} />}
      {currentPage === 'travel-groups' && can('operations_access') && <TravelGroups onNavigate={navigate} />}
      {currentPage === 'accommodation' && can('operations_access') && <Accommodation onNavigate={navigate} />}
      {currentPage === 'vip-trips' && can('vip_management_access') && <VIPTrips onNavigate={navigate} />}
      {currentPage === 'vip-details' && can('vip_management_access') && <VIPDetails tripId={selectedCustomerId} onNavigate={navigate} />}
      {currentPage === 'super-admin' && can('settings_access') && <SuperAdminPanel />}
      {currentPage === 'sales-portal' && can('inquiries_view') && <SalesAgentPortal />}
      {currentPage === 'internal-groups' && can('operations_access') && <InternalGroups onNavigate={navigate} />}
      {currentPage === 'quotation-form' && can('inquiries_view') && <QuotationForm />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}


