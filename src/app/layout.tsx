import type { Metadata } from 'next'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import './globals.css'
import { getLoja } from '@/lib/getLoja'
import { LojaProvider } from '@/contexts/LojaContext'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

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

export const metadata: Metadata = {
  title: 'Catingueira Multimarcas — Veículos Seminovos em Patos/PB',
  description:
    '30 anos realizando sonhos. Veículos seminovos com procedência garantida, atendimento transparente e financiamento fácil em Patos, Paraíba.',
}

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
        <LojaProvider loja={loja}>
          <Header />
          {children}
          <Footer />
        </LojaProvider>
      </body>
    </html>
  )
}
