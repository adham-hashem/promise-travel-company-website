import { supabase } from './supabase';

interface EnsureVipAccountingOptions {
  customerId: string;
  customerName: string;
  assignedEmployeeId?: string | null;
  serviceType?: string | null;
  tripName?: string | null;
  destination?: string | null;
  departureDate?: string | null;
  returnDate?: string | null;
  travelersCount?: number | string | null;
  totalAmount?: number | string | null;
  notes?: string | null;
  notifyAssignedEmployee?: boolean;
}

const today = () => new Date().toISOString().split('T')[0];

const toPositiveNumber = (value: number | string | null | undefined, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export async function ensureVipAccountingArtifacts(options: EnsureVipAccountingOptions) {
  const assignedEmployeeId = options.assignedEmployeeId || null;
  const travelersCount = toPositiveNumber(options.travelersCount, 1);
  const totalAmount = toPositiveNumber(options.totalAmount, 0);
  const tripLabel = options.tripName || options.destination || 'رحلة VIP';
  const notes = [
    `طلب VIP: ${tripLabel}`,
    options.destination ? `الوجهة: ${options.destination}` : '',
    options.notes || '',
  ].filter(Boolean).join(' - ');

  const { data: existingBooking, error: bookingFetchError } = await supabase
    .from('bookings')
    .select('id, total_amount, employee_id, travel_date')
    .eq('customer_id', options.customerId)
    .eq('source', 'VIP')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bookingFetchError) throw bookingFetchError;

  let bookingId = existingBooking?.id as string | undefined;

  if (!bookingId) {
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: options.customerId,
        employee_id: assignedEmployeeId,
        status: 'معلق',
        payment_status: 'غير مدفوع',
        paid_amount: 0,
        total_amount: totalAmount,
        booking_date: today(),
        source: 'VIP',
        travel_date: options.departureDate || null,
        num_travelers: travelersCount,
        notes,
      })
      .select('id')
      .single();

    if (bookingError) throw bookingError;
    bookingId = booking.id;
  } else {
    const bookingUpdates: Record<string, unknown> = {};
    if (assignedEmployeeId && !existingBooking.employee_id) bookingUpdates.employee_id = assignedEmployeeId;
    if (totalAmount > 0 && Number(existingBooking.total_amount || 0) === 0) bookingUpdates.total_amount = totalAmount;
    if (options.departureDate && !existingBooking.travel_date) bookingUpdates.travel_date = options.departureDate;

    if (Object.keys(bookingUpdates).length > 0) {
      const { error: bookingUpdateError } = await supabase
        .from('bookings')
        .update(bookingUpdates)
        .eq('id', bookingId);
      if (bookingUpdateError) throw bookingUpdateError;
    }
  }

  const { data: existingOperationFile, error: operationFetchError } = await supabase
    .from('operation_files')
    .select('id')
    .eq('customer_id', options.customerId)
    .neq('workflow_stage', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (operationFetchError) throw operationFetchError;

  if (!existingOperationFile) {
    const { error: operationError } = await supabase
      .from('operation_files')
      .insert({
        booking_id: bookingId || null,
        customer_id: options.customerId,
        employee_id: assignedEmployeeId,
        assigned_to: assignedEmployeeId,
        file_status: 'جديد',
        workflow_stage: 'accounts',
        financially_approved: false,
        travel_date: options.departureDate || null,
        return_date: options.returnDate || null,
        pax_count: travelersCount,
        special_requests: options.notes || null,
        notes: 'تم إنشاء ملف حسابات تلقائياً لطلب VIP',
      });

    if (operationError) throw operationError;
  }

  const { data: existingTimeline, error: timelineFetchError } = await supabase
    .from('workflow_timeline')
    .select('id')
    .eq('customer_id', options.customerId)
    .eq('stage', 'vip_accounts_created')
    .limit(1)
    .maybeSingle();

  if (timelineFetchError) throw timelineFetchError;

  if (!existingTimeline) {
    const { error: timelineError } = await supabase
      .from('workflow_timeline')
      .insert({
        customer_id: options.customerId,
        booking_id: bookingId || null,
        stage: 'vip_accounts_created',
        stage_label: 'إنشاء ملف حسابات VIP',
        department: 'VIP / الحسابات',
        employee_id: assignedEmployeeId,
        status: 'مكتمل',
        notes: 'تم تسجيل عميل VIP وحجزه وفتح ملف الحسابات تلقائياً',
      });

    if (timelineError) throw timelineError;
  }

  if (assignedEmployeeId && options.notifyAssignedEmployee !== false) {
    const { data: existingNotification, error: notificationFetchError } = await supabase
      .from('notifications')
      .select('id')
      .eq('employee_id', assignedEmployeeId)
      .eq('type', 'task_assigned')
      .ilike('body', `%${options.customerId}%`)
      .limit(1)
      .maybeSingle();

    if (notificationFetchError) throw notificationFetchError;

    if (!existingNotification) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          employee_id: assignedEmployeeId,
          type: 'task_assigned',
          title: 'تم تكليفك بعميل VIP',
          body: `العميل: ${options.customerName} - الرحلة: ${tripLabel} - رقم العميل الداخلي: ${options.customerId}`,
        });

      if (notificationError) throw notificationError;
    }
  }

  return { bookingId };
}
