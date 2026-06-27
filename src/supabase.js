import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iscnbmyriopufagzdmhn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzY25ibXlyaW9wdWZhZ3pkbWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MDc5OTcsImV4cCI6MjA5ODA4Mzk5N30.-EmEn6NSnb2B1ouSZ-tYwWL_LNq8JE2y8qpIIM4P0KI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
