import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/New folder/PROGRAMMING/ASP.Net Projects/Promise/promise lastee/project/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumn() {
  const { data, error } = await supabase.from('customers').select('id, name, source, sales_agent_submitted').limit(5);
  console.log('Error:', error);
  console.log('Data:', data);
}
checkColumn();
