import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Menggunakan service_role key agar hanya server Next.js yang bisa mengakses tabel ter-RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});