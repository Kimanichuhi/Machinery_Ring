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
    env[trimmed.slice(0, separatorIndex).trim()] = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
  }

  return env;
}

const [email, password, dashboardPath = '/api/dashboard/admin'] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: node ./scripts/verify-dashboard.js <email> <password> [dashboard-path]');
  process.exit(1);
}

const env = readEnv();
const supabase = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) throw error;

const apiBaseUrl = (env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
const response = await fetch(`${apiBaseUrl}${dashboardPath}`, {
  headers: {
    Authorization: `Bearer ${data.session.access_token}`,
  },
});

const text = await response.text();
console.log(`${response.status} ${response.statusText}`);
console.log(text);

await supabase.auth.signOut();

if (!response.ok) {
  process.exit(1);
}
