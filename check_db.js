import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envStr = fs.readFileSync('.env', 'utf8')
const supabaseUrl = envStr.match(/VITE_SUPABASE_URL=(.*)/)[1]
const supabaseKey = envStr.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1]
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: res } = await supabase.from('reservations').select('*').order('created_at', { ascending: false }).limit(3)
  console.log('Reservations:', res)
  const { data: rooms } = await supabase.from('rooms').select('*').limit(3)
  console.log('Rooms:', rooms)
}
run()
