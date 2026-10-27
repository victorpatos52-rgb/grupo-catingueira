import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import './globals.css'
import { getLoja } from '@/lib/getLoja'
import { getTenantLogoUrl, getTenantStartupImages } from '@/lib/tenant-assets'
import { LojaProvider } from '@/contexts/LojaContext'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import WhatsAppFab from '@/components/layout/WhatsAppFab'
import PwaServiceWorker from '@/components/PwaServiceWorker'

// 500 (font-medium) não é usado nas páginas públicas, mas é usado em ~25
// arquivos do admin — mesma fonte global (body/globals.css), então fica.
const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal'],
  variable: '--font-barlow',
  display: 'swap',
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-barlow-condensed',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const loja = await getLoja()
  const nome = loja?.nome ?? 'Catingueira Multimarcas'

  return {
    title: loja?.nome
      ? `${loja.nome} — Veículos Seminovos em Patos/PB`
      : 'Catingueira Multimarcas — Veículos Seminovos em Patos/PB',
    description:
      loja?.sobre ??
      '30 anos realizando sonhos. Veículos seminovos com procedência garantida, atendimento transparente e financiamento fácil em Patos, Paraíba.',
    manifest: '/manifest.webmanifest',
    icons: {
      apple: getTenantLogoUrl(loja),
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: nome,
      startupImage: getTenantStartupImages(loja),
    },
  }
}

export async function generateViewport(): Promise<Viewport> {
  const loja = await getLoja()
  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: loja?.cor_primaria ?? '#F5C842',
  }
}

const gaId = process.env.NEXT_PUBLIC_GA_ID

// Texto exatamente como fornecido pelo Google — não reformatar.
const GOOGLE_ADS_INLINE = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'AW-18541038284');
`

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const loja = await getLoja()

  if (!loja) notFound()

  const corPrimaria = loja?.cor_primaria ?? '#F5C200'
  const corSecundaria = loja?.cor_secundaria ?? '#1C1C1C'

  // x-pathname é gravado pelo src/proxy.ts só nas rotas públicas; sem ele
  // (/admin, /api/pdf) a tag não é renderizada.
  const pathname = (await headers()).get('x-pathname')
  const rotaInterna =
    pathname === '/login' || pathname?.startsWith('/login/') ||
    pathname === '/admin' || pathname?.startsWith('/admin/')
  const mostrarGoogleAds = loja.slug === 'felizardo' && pathname !== null && !rotaInterna

  return (
    <html
      lang="pt-BR"
      className={`${barlow.variable} ${barlowCondensed.variable}`}
      style={
        {
          '--cor-primaria': corPrimaria,
          '--cor-secundaria': corSecundaria,
        } as React.CSSProperties
      }
    >
      {mostrarGoogleAds && (
        <head>
          {/* Google tag (gtag.js) */}
          <script async src="https://www.googletagmanager.com/gtag/js?id=AW-18541038284"></script>
          <script dangerouslySetInnerHTML={{ __html: GOOGLE_ADS_INLINE }} />
        </head>
      )}
      <body>
        <PwaServiceWorker />
        <LojaProvider loja={loja}>
          <Header />
          {children}
          <Footer />
          <WhatsAppFab />
        </LojaProvider>
      </body>
      {gaId && <GoogleAnalytics gaId={gaId} />}
    </html>
  )
}
