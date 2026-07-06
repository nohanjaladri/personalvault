import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC  = ['/login', '/register']
const AUTH    = ['/setup-totp', '/verify']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  const isPublicRoute = PUBLIC.includes(path) || path === '/public-vault' || path.startsWith('/share/')

  // Unauthenticated: only allow public routes
  if (!user) {
    if (isPublicRoute) return response
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated on public route: redirect based on state
  if (isPublicRoute) {
    if (path === '/login' || path === '/register') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
