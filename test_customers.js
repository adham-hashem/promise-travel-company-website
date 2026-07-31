import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://matpwavtfkdeqsewighk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hdHB3YXZ0ZmtkZXFzZXdpZ2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMTI4MjgsImV4cCI6MjA5NzU4ODgyOH0.7X_kUpJYk4wVdMHlArPOVW8r0QmuLzvxAbazzBexWUg');

async function checkColumn() {
  const { data, error } = await supabase.from('customers').select('id, name, source, sales_agent_submitted').limit(5);
  console.log('Error:', error);
  console.log('Data:', data);
}
checkColumn();
