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
import SuperAdminPanel from './pages/SuperAdminPanel';
import Layout from './components/Layout';
import WebsiteRouter from './components/public/WebsiteRouter';
import type { Page } from './types';
import type { Permissions } from './lib/permissions';

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
  'super-admin': 'settings_access',
};

function AppInner() {
  const { session, profile, loading, signOut, can, canAccessPage } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [adminRoute, setAdminRoute] = useState(() => {
    if (typeof window === 'undefined') return false;
    const h = window.location.hash.replace(/^#/, '').toLowerCase();
    return h === '/admin' || h === '/dashboard';
  });

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace(/^#/, '').toLowerCase();
      setAdminRoute(h === '/admin' || h === '/dashboard');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!profile) return;
    if (!canAccessPage(currentPage)) {
      const requiredPerm = PAGE_PERMISSIONS[currentPage];
      if (requiredPerm && !can(requiredPerm)) {
        setCurrentPage('dashboard');
      }
    }
  }, [profile, currentPage]);

  const navigate = (page: Page, id?: string) => {
    if (!canAccessPage(page)) {
      const requiredPerm = PAGE_PERMISSIONS[page];
      if (requiredPerm && !can(requiredPerm)) {
        return;
      }
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

  if (!adminRoute) {
    return <WebsiteRouter />;
  }

  if (!session || !profile) {
    return <Login />;
  }

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

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={navigate}
      onLogout={logout}
      searchValue={search}
      onSearchChange={setSearch}
    >
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'customers' && canAccessPage('customers') && <Customers onNavigate={navigate} searchValue={search} />}
      {currentPage === 'customer-add' && canAccessPage('customer-add') && <AddCustomer onNavigate={navigate} />}
      {currentPage === 'customer-details' && canAccessPage('customer-details') && <CustomerDetails customerId={selectedCustomerId} onNavigate={navigate} />}
      {currentPage === 'bookings' && canAccessPage('bookings') && <Bookings searchValue={search} />}
      {currentPage === 'packages' && canAccessPage('packages') && <Packages />}
      {currentPage === 'offers' && canAccessPage('offers') && <Offers />}
      {currentPage === 'employees' && canAccessPage('employees') && <Employees onNavigate={navigate} />}
      {currentPage === 'reports' && canAccessPage('reports') && <Reports />}
      {currentPage === 'settings' && canAccessPage('settings') && <Settings />}
      {currentPage === 'super-admin' && canAccessPage('super-admin') && <SuperAdminPanel />}
      {currentPage === 'internal-trips' && canAccessPage('internal-trips') && <InternalTrips />}
      {currentPage === 'internal-bookings' && canAccessPage('internal-bookings') && <InternalTripBookings />}
      {currentPage === 'internal-customers' && canAccessPage('internal-customers') && <InternalCustomers />}
      {currentPage === 'internal-reports' && canAccessPage('internal-reports') && <InternalReports />}
      {currentPage === 'revenue' && canAccessPage('revenue') && <Revenue />}
      {currentPage === 'payments' && canAccessPage('payments') && <Payments />}
      {currentPage === 'installments' && canAccessPage('installments') && <Installments />}
      {currentPage === 'expenses' && canAccessPage('expenses') && <Expenses />}
      {currentPage === 'commissions' && canAccessPage('commissions') && <Commissions />}
      {currentPage === 'operations' && canAccessPage('operations') && <OperationsDashboard />}
      {currentPage === 'hotels' && canAccessPage('hotels') && <Hotels />}
      {currentPage === 'invoices' && canAccessPage('invoices') && <Invoices />}
      {currentPage === 'inquiries' && canAccessPage('inquiries') && <Inquiries />}
      {currentPage === 'client-search' && <ClientSearch onNavigate={navigate} customerId={selectedId} />}
      {currentPage === 'tasks' && canAccessPage('tasks') && <Tasks onNavigate={navigate} />}
      {currentPage === 'calendar' && canAccessPage('calendar') && <CalendarPage />}
      {currentPage === 'profit' && canAccessPage('profit') && <ProfitAnalysis />}
      {currentPage === 'suppliers' && canAccessPage('suppliers') && <Suppliers />}
      {currentPage === 'visa' && canAccessPage('visa') && <VisaManagement onNavigate={navigate} />}
      {currentPage === 'flight-tickets' && canAccessPage('flight-tickets') && <FlightTickets onNavigate={navigate} />}
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
