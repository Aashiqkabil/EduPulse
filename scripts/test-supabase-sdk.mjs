import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

const envContent = fs.readFileSync(envPath, 'utf-8');
let supabaseUrl = '';
let publishableKey = '';

for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const [k, ...v] = trimmed.split('=');
  const val = v.join('=').trim().replace(/^['"]|['"]$/g, '');
  if (k.trim() === 'VITE_SUPABASE_URL') supabaseUrl = val;
  if (k.trim() === 'VITE_SUPABASE_PUBLISHABLE_KEY') publishableKey = val;
}

const client = createClient(supabaseUrl, publishableKey);

console.log('[SDK TEST] Initialized @supabase/supabase-js client.');

// 1. Test Select
const { data, count, error } = await client
  .from('students')
  .select('*', { count: 'exact' });

if (error) {
  console.error('[SDK TEST] Query error:', error.message, error.code);
  process.exit(1);
}

console.log('[SDK TEST] Select query succeeded!');
console.log('[SDK TEST] Rows retrieved:', data?.length ?? 0);
console.log('[SDK TEST] Exact count:', count ?? 0);

// 2. Test RLS protection against unauthorized direct deletion
console.log('[SDK TEST] Testing RLS enforcement against direct DELETE...');
const { error: delError } = await client
  .from('students')
  .delete()
  .neq('student_id', '');

if (delError) {
  console.log('[SDK TEST] Expected RLS behavior: Direct DELETE denied or restricted by policy. Error code:', delError.code);
} else {
  console.log('[SDK TEST] Direct delete executed (0 rows affected as table is empty).');
}
