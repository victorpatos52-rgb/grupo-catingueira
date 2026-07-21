import type { Metadata, Viewport } from 'next'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import './globals.css'
import { getLoja } from '@/lib/getLoja'
import { LojaProvider } from '@/contexts/LojaContext'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import PwaServiceWorker from '@/components/PwaServiceWorker'

// Pesos auditados via grep de className em todas as páginas públicas
// (font-medium/500 não é usado em nenhuma delas — só no admin, que também
// usa Barlow via body/globals.css). 400 é essencial (peso padrão do body,
// usado implicitamente por todo texto sem classe de peso); 600/700 aparecem
// em várias páginas (labels, CTAs). Ver explicação sobre 500 na resposta.
const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
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

function slugLoja(loja: { dominio?: string | null; nome?: string | null } | null) {
  return (loja?.dominio ?? loja?.nome ?? '').toLowerCase().includes('felizardo')
    ? 'felizardo'
    : 'catingueira'
}

export async function generateMetadata(): Promise<Metadata> {
  const loja = await getLoja()
  const slug = slugLoja(loja)
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
      apple: `/icons/${slug}-192.png`,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: nome,
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const loja = await getLoja()

  const corPrimaria = loja?.cor_primaria ?? '#F5C200'
  const corSecundaria = loja?.cor_secundaria ?? '#1C1C1C'

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
      <body>
        <PwaServiceWorker />
        <LojaProvider loja={loja}>
          <Header />
          {children}
          <Footer />
        </LojaProvider>
      </body>
      {gaId && <GoogleAnalytics gaId={gaId} />}
    </html>
  )
}
