import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkColumn() {
  const { data, error } = await supabase.from('rooms').select('*').limit(1);
  console.log('Error:', error);
  console.log('Columns:', data && data.length > 0 ? Object.keys(data[0]) : 'None');
  console.log('Data:', data);
}
checkColumn();
