import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

if (!fs.existsSync(envPath)) {
  console.error('[TEST] ERROR: .env file does not exist at project root.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split(/\r?\n/);
let supabaseUrl = '';
let publishableKey = '';

for (const line of envLines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const [k, ...v] = trimmed.split('=');
  const val = v.join('=').trim().replace(/^['"]|['"]$/g, '');
  if (k.trim() === 'VITE_SUPABASE_URL') supabaseUrl = val;
  if (k.trim() === 'VITE_SUPABASE_PUBLISHABLE_KEY') publishableKey = val;
}

if (!supabaseUrl || !publishableKey) {
  console.error('[TEST] ERROR: Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env');
  process.exit(1);
}

console.log('[TEST] Supabase URL detected:', supabaseUrl);
console.log('[TEST] Key configured: YES (Key length: ' + publishableKey.length + ' chars, prefix: ' + publishableKey.substring(0, 14) + '...)');

// Test 1: Health check / REST root
try {
  const rootResp = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
  });
  console.log(`[TEST] Root endpoint /rest/v1/ response status: ${rootResp.status} ${rootResp.statusText}`);
} catch (err) {
  console.error('[TEST] Failed to connect to Supabase host:', err.message);
}

// Test 2: Query public.students table
try {
  const studentsResp = await fetch(`${supabaseUrl}/rest/v1/students?select=count`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      Range: '0-0',
      Prefer: 'count=exact',
    },
  });

  const status = studentsResp.status;
  const statusText = studentsResp.statusText;
  const contentRange = studentsResp.headers.get('content-range');
  let bodyText = '';
  try {
    bodyText = await studentsResp.text();
  } catch (e) {
    bodyText = '';
  }

  console.log(`[TEST] Query /rest/v1/students status: ${status} ${statusText}`);
  if (contentRange) {
    console.log(`[TEST] Content-Range header: ${contentRange}`);
  }

  if (status === 200 || status === 206) {
    console.log('[TEST] RESULT: SUCCESS! Authentication and table access to public.students verified.');
    console.log('[TEST] Response body snippet:', bodyText.substring(0, 200));
  } else if (status === 401) {
    console.error('[TEST] RESULT: AUTHENTICATION FAILED. The publishable key was rejected by Supabase.');
    console.error('[TEST] Response error:', bodyText);
  } else if (status === 404 || bodyText.includes('does not exist') || bodyText.includes('42P01')) {
    console.log('[TEST] RESULT: AUTHENTICATION SUCCEEDED, but table public.students does not exist in the database.');
    console.log('[TEST] Response details:', bodyText);
  } else if (status === 403) {
    console.log('[TEST] RESULT: AUTHENTICATION SUCCEEDED, but Row Level Security (RLS) denied SELECT access.');
    console.log('[TEST] Response details:', bodyText);
  } else {
    console.log('[TEST] RESULT: Non-200 status code received:', status, bodyText);
  }
} catch (err) {
  console.error('[TEST] Network error during query:', err.message);
}
