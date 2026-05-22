import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function readEnv() {
  const env = {};
  const text = fs.readFileSync('.env', 'utf8');

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }

  return env;
}

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: node ./scripts/verify-login.js <email> <password>');
  process.exit(1);
}

const env = readEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) {
  throw error;
}

const userId = data.user.id;
const [profileResult, roleResult] = await Promise.all([
  supabase.from('profiles').select('id, email, name, status').eq('id', userId).maybeSingle(),
  supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
]);

console.log(`Signed in: ${data.user.email} (${userId})`);
console.log(`Profile: ${profileResult.error ? profileResult.error.message : JSON.stringify(profileResult.data)}`);
console.log(`Role: ${roleResult.error ? roleResult.error.message : JSON.stringify(roleResult.data)}`);

await supabase.auth.signOut();
