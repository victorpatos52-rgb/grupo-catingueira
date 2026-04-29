'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import BotaoWhatsApp from '@/components/ui/BotaoWhatsApp'
import { formatarPreco, formatarKm } from '@/lib/utils'
import type { Veiculo, Loja } from '@/types'
import { Eye } from 'lucide-react'

interface VeiculoCardProps {
  veiculo: Veiculo
  loja: Loja
  delay?: number
}

export default function VeiculoCard({ veiculo, loja, delay = 0 }: VeiculoCardProps) {
  const capa = veiculo.fotos[0] ?? null

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      style={{ borderTop: '3px solid var(--cor-primaria)' }}
    >
      <Link
        href={`/veiculo/${veiculo.id}`}
        className="relative aspect-[4/3] block overflow-hidden bg-[#F0F0F0]"
      >
        {capa ? (
          <Image
            src={capa}
            alt={`${veiculo.marca} ${veiculo.modelo}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-14 h-14 text-[#D0D0D0]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {veiculo.status === 'reservado' && (
          <span
            className="absolute top-3 left-3 text-[10px] font-bold uppercase px-2.5 py-1 rounded tracking-widest text-[#3D3D3D]"
            style={{ backgroundColor: 'var(--cor-primaria)' }}
          >
            RESERVADO
          </span>
        )}

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <span
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[#1A1A1A] text-xs font-bold uppercase tracking-wider rounded-md translate-y-3 group-hover:translate-y-0 transition-transform duration-300"
            style={{ backgroundColor: 'var(--cor-primaria)' }}
          >
            <Eye className="w-3.5 h-3.5" />
            VER DETALHES
          </span>
        </div>
      </Link>

      <div className="flex flex-col flex-1 p-4 gap-3">
        <div>
          <Link href={`/veiculo/${veiculo.id}`}>
            <h3 className="font-[family-name:var(--font-barlow-condensed)] text-lg font-bold uppercase text-[#1A1A1A] leading-tight hover:text-[#3D3D3D] transition-colors">
              {veiculo.marca} {veiculo.modelo}
            </h3>
          </Link>
          {veiculo.versao && (
            <p className="text-[#888] text-xs uppercase tracking-wider mt-0.5">{veiculo.versao}</p>
          )}
          <p className="text-[#888] text-sm mt-1">
            {veiculo.ano} · {formatarKm(veiculo.km)} · {veiculo.cambio}
          </p>
        </div>

        <div className="mt-auto">
          <p
            className="font-[family-name:var(--font-barlow-condensed)] text-2xl font-extrabold"
            style={{ color: 'var(--cor-primaria)' }}
          >
            {formatarPreco(veiculo.preco)}
          </p>
        </div>

        <div className="flex gap-2 mt-1">
          <Link
            href={`/veiculo/${veiculo.id}`}
            className="flex-1 text-center py-2 rounded-md text-xs font-bold text-[#1A1A1A] uppercase tracking-wider hover:brightness-90 transition-all"
            style={{ backgroundColor: 'var(--cor-primaria)' }}
          >
            VER MAIS
          </Link>
          <BotaoWhatsApp whatsapp={loja.whatsapp} veiculo={veiculo} texto="WhatsApp" tamanho="sm" />
        </div>
      </div>
    </motion.div>
  )
}
