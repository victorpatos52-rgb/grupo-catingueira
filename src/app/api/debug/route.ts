import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const headersList = await headers()
  const host = headersList.get('host')
  const forwardedHost = headersList.get('x-forwarded-host')
  const allHeaders: Record<string, string> = {}
  headersList.forEach((value, key) => {
    allHeaders[key] = value
  })
  return NextResponse.json({ host, forwardedHost, allHeaders })
}
