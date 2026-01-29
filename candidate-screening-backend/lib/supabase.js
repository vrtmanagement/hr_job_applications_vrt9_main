import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config(); // 👈 ENSURE env is loaded FIRST

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Supabase environment variables are missing');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default supabase;