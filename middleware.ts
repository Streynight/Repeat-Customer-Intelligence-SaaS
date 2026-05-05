import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { safeAuthRedirectPath } from '@/lib/auth-redirect'
import { allowsLocalDemoMode, hasSupabaseRuntimeConfig } from '@/lib/runtime-config'

const protectedPaths = ['/dashboard', '/analytics', '/income', '/projects', '/calendar', '/imports', '/customers', '/tutorials', '/settings', '/admin']
const authEntryPaths = ['/', '/login', '/signup']

export async function middleware(request: NextRequest) {
  const hasSupabaseConfig = hasSupabaseRuntimeConfig()
  const isProtected = matchesPath(request.nextUrl.pathname, protectedPaths)
  const isAuthEntry = authEntryPaths.includes(request.nextUrl.pathname)

  if (!hasSupabaseConfig) {
    if (isProtected && !allowsLocalDemoMode()) {
      return NextResponse.redirect(loginUrl(request))
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

  if (data.user && isAuthEntry) {
    return NextResponse.redirect(new URL(authenticatedEntryPath(request), request.url))
  }

  if (isProtected && !data.user) {
    return NextResponse.redirect(loginUrl(request))
  }

  return response
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/signup',
    '/dashboard/:path*',
    '/analytics/:path*',
    '/income/:path*',
    '/projects/:path*',
    '/calendar/:path*',
    '/imports/:path*',
    '/customers/:path*',
    '/tutorials/:path*',
    '/settings/:path*',
    '/admin/:path*',
  ],
}

function matchesPath(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function currentPath(request: NextRequest) {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`
}

function loginUrl(request: NextRequest) {
  const url = new URL('/login', request.url)
  url.searchParams.set('next', currentPath(request))
  return url
}

function authenticatedEntryPath(request: NextRequest) {
  const next = safeAuthRedirectPath(request.nextUrl.searchParams.get('next'))
  const nextPathname = new URL(next, request.url).pathname
  return authEntryPaths.includes(nextPathname) ? '/dashboard' : next
}
