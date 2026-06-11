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
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      const dest = data?.nextLevel === 'aal2' ? '/verify' : '/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return response
  }

  // Check TOTP enrollment
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const hasTotp = (factors?.totp?.length ?? 0) > 0

  if (!hasTotp) {
    return path === '/setup-totp'
      ? response
      : NextResponse.redirect(new URL('/setup-totp', request.url))
  }

  // Allow auth routes (verify) without AAL2
  if (AUTH.includes(path)) return response

  // Protected routes: require AAL2 (except /dashboard which allows AAL1 upload-only)
  if (path !== '/dashboard') {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.currentLevel !== 'aal2') {
      return NextResponse.redirect(new URL('/verify', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
