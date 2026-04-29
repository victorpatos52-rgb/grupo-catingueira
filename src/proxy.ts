import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Nunca redirecionar a página de login
  if (pathname === '/admin/login' || pathname === '/admin/login/') {
    return NextResponse.next()
  }

  // Proteger apenas rotas admin internas
  if (pathname.startsWith('/admin/')) {
    const cookies = request.cookies.getAll()
    const isAuthenticated = cookies.some(c =>
      c.name.includes('sb-') && c.name.includes('auth')
    )
    if (!isAuthenticated) {
      const url = new URL('/admin/login', request.url)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}
