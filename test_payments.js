import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/New folder/PROGRAMMING/ASP.Net Projects/Promise/promise lastee/project/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('payments').select('amount, payment_date, payment_type, approval_status');
  console.log('Error:', error);
  console.log('Payments:', data?.length);
  if (data) {
    console.log(data.slice(0, 5));
  }
}
test();
