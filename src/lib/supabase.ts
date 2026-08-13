import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (...args) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return Promise.resolve(new Response(
          JSON.stringify({ error: 'offline', message: 'No internet connection', code: 'OFFLINE' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        ));
      }
      return fetch(...args);
    }
  }
});
