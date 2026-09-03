import { supabase } from './supabase';

export async function grantVipAccess(employeeId?: string | null) {
  if (!employeeId) return;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('permissions, page_permissions')
    .eq('id', employeeId)
    .maybeSingle();

  if (error || !data) return;

  await supabase
    .from('user_profiles')
    .update({
      permissions: {
        ...(data.permissions || {}),
        vip_management_access: true,
      },
      page_permissions: {
        ...(data.page_permissions || {}),
        'vip-dashboard': true,
        'vip-trips': true,
        'vip-details': true,
      },
    })
    .eq('id', employeeId);
}
