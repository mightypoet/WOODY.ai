import { createClient } from '@supabase/supabase-js';

// Helper to safely access environment variables across Vite, Node, and Deno
const getEnvVar = (key: string) => {
  // @ts-ignore
  if (typeof Deno !== 'undefined') {
    // @ts-ignore
    return Deno.env.get(key);
  } else if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

// Start with standard backend/Deno process variables
let supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
let supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY') || getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') || getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

// For Vite browser build
try {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (!supabaseUrl) {
      supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    }
    if (!supabaseKey) {
      supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    }
  }
} catch (e) {
  // Ignore in environments where import.meta.env throws
}

supabaseUrl = supabaseUrl || 'https://huikxhnceywgofllfyle.supabase.co';
supabaseKey = supabaseKey || 'sb_publishable_E_5daNHCs9gW8owaBD5Ddw_n9_sI6x1';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
