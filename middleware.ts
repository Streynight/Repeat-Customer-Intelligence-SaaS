import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { allowsLocalDemoMode, hasSupabaseRuntimeConfig } from '@/lib/runtime-config'

const protectedPaths = ['/dashboard', '/analytics', '/income', '/calendar', '/imports', '/customers', '/tutorials', '/settings', '/admin']

export async function middleware(request: NextRequest) {
  const hasSupabaseConfig = hasSupabaseRuntimeConfig()
  const isProtected = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  if (!hasSupabaseConfig) {
    if (isProtected && !allowsLocalDemoMode()) {
      return NextResponse.redirect(new URL('/login?error=auth_required', request.url))
    }

    return NextResponse.next()
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const { data } = await supabase.auth.getUser()

  if (isProtected && !data.user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/analytics/:path*',
    '/income/:path*',
    '/calendar/:path*',
    '/imports/:path*',
    '/customers/:path*',
    '/tutorials/:path*',
    '/settings/:path*',
    '/admin/:path*',
  ],
}
