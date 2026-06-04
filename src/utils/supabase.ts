import { createClient } from '@supabase/supabase-js';

// Helper to safely access environment variables across Vite, Node, and Deno
const getEnvVar = (key) => {
  // @ts-ignore
  if (typeof Deno !== 'undefined') {
    // @ts-ignore
    return Deno.env.get(key);
  } else if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

// We keep the exact import.meta.env.VITE_SUPABASE_URL token so Vite can statically replace it,
// but we wrap the whole thing to avoid crashing in Deno/Node.
let supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
let supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY') || getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') || getEnvVar('VITE_SUPABASE_SERVICE_ROLE_KEY');

try {
  if (!supabaseUrl && typeof import.meta !== 'undefined' && import.meta.env) {
    supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  }
  if (!supabaseKey && typeof import.meta !== 'undefined' && import.meta.env) {
    supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  }
} catch (e) {
  // Ignore in environments where import.meta.env throws
}

supabaseUrl = supabaseUrl || 'https://huikxhnceywgofllfyle.supabase.co';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey || '');
