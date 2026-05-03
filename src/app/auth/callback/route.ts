import { NextResponse, type NextRequest } from 'next/server'
import { ensureAuthUserProfile } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data } = await supabase.auth.getUser()
      const email = data.user?.email

      if (data.user && email) {
        await ensureAuthUserProfile(data.user.id, email)
      }

      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', request.url))
}
