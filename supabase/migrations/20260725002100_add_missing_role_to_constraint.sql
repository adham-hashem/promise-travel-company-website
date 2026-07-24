-- Update user_profiles check constraint for role to include 'إضافة عملاء'
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('super_admin', 'مالك النظام', 'مدير النظام', 'إضافة عملاء', 'مدير المبيعات', 'مندوب مبيعات', 'محاسب', 'موظف التشغيل', 'مسؤول طيران'));
