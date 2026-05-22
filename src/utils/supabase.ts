import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabaseUrl = (envUrl && envUrl.startsWith('http')) ? envUrl : 'https://huikxhnceywgofllfyle.supabase.co';
const supabaseKey = (envKey && envKey.trim() !== '') ? envKey : 'sb_publishable_E_5daNHCs9gW8owaBD5Ddw_n9_sI6x1';

export const supabase = createClient(supabaseUrl, supabaseKey);
