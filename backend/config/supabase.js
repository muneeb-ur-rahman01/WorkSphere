const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[CampOS] WARNING: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set. ' +
    'Copy backend/.env.example to backend/.env and fill in your Supabase project credentials.'
  );
}

// Service role key is used because this client only ever runs on the server.
// It bypasses Row Level Security, so all tenant isolation (orgId scoping) is
// enforced in the controllers below - never expose this key to the frontend.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

module.exports = supabase;
