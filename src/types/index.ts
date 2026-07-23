export type CustomerStatus = 'جديد' | 'مهتم' | 'متابعة' | 'حجز' | 'مغلق' | 'تم الحجز' | 'مكتمل' | 'ملغي';
export type ServiceType = 'حج' | 'عمرة' | 'سياحة داخلية' | 'حجز فندق';
export type BookingStatus = 'معلق' | 'مؤكد' | 'ملغي';
export type PaymentStatus = 'غير مدفوع' | 'مدفوع جزئياً' | 'مدفوع بالكامل';
export type VisaStatus = 'لم يبدأ' | 'قيد التقديم' | 'قيد المراجعة' | 'تمت الموافقة' | 'مرفوضة' | 'منتهية';
export type VisaType = 'عمرة' | 'حج' | 'سياحة' | 'عمل' | 'علاج' | 'أخرى';
export type VisaDocType = 'جواز السفر' | 'صورة شخصية' | 'تأمين' | 'حجز طيران' | 'حجز فندق' | 'مستندات إضافية';

export interface Visa {
  id: string;
  visa_id?: string;
  client_code?: string;
  booking_id?: string;
  customer_id?: string;
  full_name: string;
  service_type: string;
  visa_type: VisaType;
  country: string;
  application_date?: string;
  issue_date?: string;
  expiry_date?: string;
  visa_fee: number;
  visa_status: VisaStatus;
  visa_number?: string;
  visa_file_path?: string;
  visa_file_name?: string;
  visa_upload_status?: 'Not Uploaded' | 'Uploaded';
  visa_file_uploaded_at?: string;
  visa_file_uploaded_by?: string;
  assigned_employee_id?: string;
  notes?: string;
  created_at: string;
  employees?: Employee;
  customers?: Customer;
}

export interface VisaDocument {
  id: string;
  visa_id: string;
  doc_type: VisaDocType;
  file_path: string;
  file_name: string;
  file_size: number;
  status: 'مرفوع' | 'تمت المراجعة' | 'مرفوض';
  uploaded_by?: string;
  created_at: string;
}

export interface TravelChecklist {
  id: string;
  customer_id: string;
  passport_done: boolean;
  visa_done: boolean;
  visa_uploaded: boolean;
  ticket_done: boolean;
  hotel_done: boolean;
  invoice_done: boolean;
  payment_done: boolean;
  updated_at: string;
}
export type CommType = 'مكالمة' | 'واتساب' | 'زيارة' | 'بريد إلكتروني';
export type PackageType = 'حج' | 'عمرة';

export interface Employee {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  clients_count: number;
  bookings_count: number;
  target_percentage: number;
  is_active: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  employee_id?: string;
  priority: TaskPriority;
  status: TaskStatus;
  start_date: string;
  due_date: string;
  completed_at?: string;
  created_at: string;
  department?: string;
  client_code?: string;
  booking_id?: string;
  related_section?: string;
  auto_generated?: boolean;
  employees?: Employee;
}

export type TaskPriority = 'منخفضة' | 'متوسطة' | 'عالية' | 'عاجل';
export type TaskStatus = 'جديدة' | 'قيد التنفيذ' | 'مكتملة' | 'متأخرة' | 'Pending' | 'In Progress' | 'Completed';

export type NotificationType =
  | 'new_lead' | 'task_assigned' | 'follow_up' | 'overdue_task'
  | 'new_customer' | 'new_booking' | 'new_payment' | 'new_invoice'
  | 'missing_document' | 'travel_soon' | 'website_booking';

export interface AppNotification {
  id: string;
  employee_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  is_read: boolean;
  created_at: string;
}

export interface Package {
  id: string;
  name: string;
  type: PackageType;
  hotel?: string;
  airline?: string;
  duration_days?: number;
  price: number;
  cost_price?: number;
  is_active: boolean;
  image_url?: string;
  description?: string;
  featured?: boolean;
  created_at: string;
}

export type OfferType = 'حج' | 'عمرة' | 'داخلي';

export interface Offer {
  id: string;
  name: string;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  type?: OfferType;
  image_url?: string;
  description?: string;
  package_id?: string;
  original_price?: number;
  discounted_price?: number;
  created_at: string;
  packages?: Package;
}

export interface Customer {
  id: string;
  client_code?: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  governorate?: string;
  national_id?: string;
  service_type?: ServiceType;
  requested_package_id?: string;
  source?: string;
  notes?: string;
  status: CustomerStatus;
  assigned_employee_id?: string;
  last_follow_up?: string;
  next_follow_up?: string;
  passport_number?: string;
  passport_issue_date?: string;
  passport_expiry_date?: string;
  nationality?: string;
  birth_date?: string;
  gender?: string;
  city?: string;
  country?: string;
  documents_status?: 'مكتمل' | 'ناقص مستندات';
  visa_requirement?: VisaRequirement;
  created_at: string;
  packages?: Package;
  employees?: Employee;
}

export interface CommunicationLog {
  id: string;
  customer_id: string;
  employee_id?: string;
  type: CommType;
  result?: string;
  notes?: string;
  agreed_on?: string;
  next_follow_up?: string;
  created_at: string;
  employees?: Employee;
}

export interface Booking {
  id: string;
  customer_id: string;
  package_id?: string;
  offer_id?: string;
  employee_id?: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  total_amount?: number;
  paid_amount: number;
  booking_date: string;
  created_at: string;
  notes?: string;
  source?: string;
  travel_date?: string;
  num_travelers?: number;
  booking_number?: string;
  customers?: Customer;
  packages?: Package;
  employees?: Employee;
}

// ----- Internal Tourism -----
export type InternalTripStatus = 'متاحة' | 'ممتلئة' | 'مغلقة' | 'ملغاة';
export type InternalBookingStatus = 'جديدة' | 'مؤكدة' | 'ملغاة' | 'مكتملة';

export interface InternalTrip {
  id: string;
  name: string;
  destination: string;
  hotel?: string;
  duration?: string;
  start_date: string;
  end_date: string;
  price: number;
  total_seats: number;
  available_seats: number;
  status: InternalTripStatus;
  created_at: string;
}

export interface InternalTripBooking {
  id: string;
  customer_name: string;
  phone?: string;
  trip_id?: string;
  travelers_count: number;
  booking_status: InternalBookingStatus;
  payment_status: PaymentStatus;
  employee_id?: string;
  total_amount: number;
  paid_amount: number;
  created_at: string;
  internal_trips?: InternalTrip;
  employees?: Employee;
}

export interface InternalCustomer {
  id: string;
  name: string;
  phone?: string;
  interested_destination?: string;
  last_follow_up?: string;
  employee_id?: string;
  created_at: string;
  employees?: Employee;
}

// ===== Supplier types =====
export type SupplierType = 'فنادق' | 'طيران' | 'نقل' | 'مرشدين' | 'أخرى';

export interface Supplier {
  id: string;
  supplier_code?: string;
  name: string;
  type: SupplierType;
  phone?: string;
  email?: string;
  address?: string;
  contract_ref?: string;
  notes?: string;
  status: 'نشط' | 'غير نشط';
  created_at: string;
}

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes?: string;
  created_at: string;
}

// ===== Customer Timeline =====
export interface TimelineEvent {
  customer_id: string;
  client_code: string | null;
  customer_name: string;
  event: string;
  source: string;
  created_at: string;
}

export type Page =
  | 'login'
  | 'dashboard'
  | 'customers'
  | 'customer-add'
  | 'customer-details'
  | 'bookings'
  | 'packages'
  | 'offers'
  | 'employees'
  | 'reports'
  | 'settings'
  | 'internal-trips'
  | 'internal-bookings'
  | 'internal-customers'
  | 'internal-reports'
  | 'revenue'
  | 'payments'
  | 'installments'
  | 'expenses'
  | 'commissions'
  | 'operations'
  | 'hotels'
  | 'invoices'
  | 'inquiries'
  | 'client-search'
  | 'tasks'
  | 'calendar'
  | 'profit'
  | 'suppliers'
  | 'visa'
  | 'flight-tickets'
  | 'super-admin'
  | 'website';

// ===== Accounting types =====
export type PaymentMethod = 'كاش' | 'تحويل بنكي' | 'فودافون كاش' | 'أقساط';
export type ExpenseCategory = 'رواتب' | 'تسويق' | 'إيجار' | 'إعلانات' | 'تشغيل' | 'فنادق' | 'نقل' | 'أخرى';
export type CommissionStatus = 'معلق' | 'مدفوع';
export type InstallmentStatus = 'نشط' | 'متأخر' | 'مكتمل';

export interface Payment {
  id: string;
  booking_id?: string;
  customer_id?: string;
  employee_id?: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  status: PaymentStatus;
  notes?: string;
  transaction_number?: string;
  payment_type?: string;
  proof_file_path?: string;
  proof_file_name?: string;
  approved_by?: string;
  approved_at?: string;
  approval_status?: 'بانتظار الاعتماد' | 'معتمد' | 'مرفوض';
  rejection_reason?: string;
  approved_amount?: number;
  created_at: string;
  customers?: Customer;
  bookings?: Booking;
  user_profiles?: Employee;
}

export interface PaymentProof {
  id: string;
  payment_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  status: 'مرفوع' | 'معتمد' | 'مرفوض';
  uploaded_by?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface Installment {
  id: string;
  booking_id?: string;
  customer_id?: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  number_of_installments: number;
  paid_installments: number;
  next_due_date?: string;
  status: InstallmentStatus;
  created_at: string;
  customers?: Customer;
  bookings?: Booking;
}

export interface Expense {
  id: string;
  name: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  notes?: string;
  created_at: string;
}

export interface EmployeeCommission {
  id: string;
  employee_id?: string;
  bookings_count: number;
  total_sales: number;
  commission_rate: number;
  commission_amount: number;
  status: CommissionStatus;
  period?: string;
  created_at: string;
  user_profiles?: Employee;
}

// ===== Documents & Operations =====
export type DocType = 'جواز سفر' | 'بطاقة رقم قومي' | 'صورة شخصية' | 'مستند إضافي' | 'تأشيرة';
export type DocStatus = 'مرفوع' | 'قيد المراجعة' | 'مقبول' | 'مرفوض';

export interface DocumentRecord {
  id: string;
  customer_id?: string;
  booking_id?: string;
  uploaded_by?: string;
  doc_type: DocType;
  file_path: string;
  file_name?: string;
  file_size?: number;
  status: DocStatus;
  review_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  doc_number?: string;
  created_at: string;
  customers?: Customer;
  bookings?: Booking;
  user_profiles?: Employee;
  reviewer?: Employee;
}

// ===== Hotel types =====
export type HotelStatus = 'نشط' | 'غير نشط';
export type HotelCategory = '3 نجوم' | '4 نجوم' | '5 نجوم' | 'VIP';
export type HotelService = 'واي فاي' | 'إفطار' | 'غداء' | 'عشاء' | 'خدمة غرف' | 'نقل' | 'مسبح' | 'جيم';

export interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
  address?: string;
  stars: number;
  category: HotelCategory;
  price_per_night: number;
  images: string[];
  services: string[];
  status: HotelStatus;
  description?: string;
  created_at: string;
  updated_at: string;
}

// ===== Invoice types =====
export type InvoicePaymentStatus = 'غير مدفوع' | 'مدفوع جزئياً' | 'مدفوع بالكامل';
export type InvoiceServiceType = 'حج' | 'عمرة' | 'رحلة داخلية' | 'أخرى';

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id?: string;
  booking_id?: string;
  hotel_id?: string;
  service_type: InvoiceServiceType;
  package_name?: string;
  total_amount: number;
  paid_amount: number;
  payment_status: InvoicePaymentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  customers?: Customer;
  bookings?: Booking;
  hotels?: Hotel;
}

// ===== Inquiry types =====
export type InquiryStatus = 'جديد' | 'قيد المتابعة' | 'تم التحويل' | 'مغلق';
export type InquirySource = 'الموقع الإلكتروني' | 'واتساب' | 'مكالمة' | 'زيارة' | 'فيسبوك' | 'إنستجرام';
export type InquiryServiceType = 'حج' | 'عمرة' | 'رحلة داخلية' | 'فندق' | 'أخرى';
export type VisaRequirement = 'Requires Visa' | 'No Visa Required';

export interface Inquiry {
  id: string;
  inquiry_number: string;
  customer_name: string;
  phone: string;
  service_type: InquiryServiceType;
  source: InquirySource;
  status: InquiryStatus;
  assigned_employee_id?: string;
  visa_requirement?: VisaRequirement;
  notes?: string;
  converted_customer_id?: string;
  converted_booking_id?: string;
  created_at: string;
  updated_at: string;
  employees?: Employee;
}

// ===== Operations types =====
export type OperationFileStatus = 'جديد' | 'قيد التجهيز' | 'مستندات ناقصة' | 'جاهز للسفر' | 'مكتمل' | 'مغلق';

export interface OperationFile {
  id: string;
  op_number: string;
  booking_id?: string;
  customer_id?: string;
  employee_id?: string;
  file_status: OperationFileStatus;
  visa_status?: VisaStatus;
  travel_date?: string;
  return_date?: string;
  hotel_id?: string;
  internal_trip_id?: string;
  notes?: string;
  financially_approved: boolean;
  workflow_stage?: 'new' | 'accounts' | 'operations' | 'visa' | 'flight' | 'ready' | 'completed';
  created_at: string;
  updated_at: string;
  customers?: Customer;
  bookings?: Booking;
  employees?: Employee;
  hotels?: Hotel;
  internal_trips?: InternalTrip;
}

export interface FlightTicket {
  id: string;
  booking_id?: string;
  customer_id?: string;
  pnr?: string;
  airline?: string;
  flight_number?: string;
  departure_airport?: string;
  arrival_airport?: string;
  departure_datetime?: string;
  return_datetime?: string;
  e_ticket_number?: string;
  ticket_file_path?: string;
  ticket_file_name?: string;
  status: 'صادر' | 'ملغي' | 'مؤكد';
  issued_by?: string;
  created_at: string;
  customers?: Customer;
  bookings?: Booking;
  user_profiles?: Employee;
}

export interface WorkflowTimelineEvent {
  id: string;
  customer_id?: string;
  booking_id?: string;
  stage: string;
  stage_label: string;
  department?: string;
  employee_id?: string;
  employee_name?: string;
  status: string;
  notes?: string;
  created_at: string;
}
