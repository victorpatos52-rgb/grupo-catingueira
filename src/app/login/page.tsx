'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase'
import { useLoja } from '@/contexts/LojaContext'

const schema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

type FormData = z.infer<typeof schema>

const inputCls =
  'w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-[#111] text-sm ' +
  'placeholder-[#D1D5DB] focus:outline-none focus:border-[#F5C842] focus:ring-2 focus:ring-[#FEF9C3] transition-all'

export default function LoginPage() {
  const router    = useRouter()
  const loja      = useLoja()
  const [erro, setErro]           = useState('')
  const [carregando, setCarregando] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setErro('')
    setCarregando(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.senha,
    })

    if (error) {
      setErro('Email ou senha incorretos.')
      setCarregando(false)
      return
    }

    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">

          {/* Topo amarelo */}
          <div
            className="px-8 pt-8 pb-6 flex flex-col items-center text-center"
            style={{ borderBottom: '1px solid #E5E7EB' }}
          >
            {/* Logo */}
            {loja?.logo_url ? (
              <img
                src={loja.logo_url}
                alt={loja.nome}
                className="h-12 object-contain mb-4"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #F5C842 0%, #F59E0B 100%)' }}
              >
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M5 17H3v-4l2.5-5h11L19 13v4h-2m-10 0a2 2 0 104 0 2 2 0 00-4 0zm8 0a2 2 0 104 0 2 2 0 00-4 0z" />
                </svg>
              </div>
            )}

            <h1 className="font-[family-name:var(--font-barlow-condensed)] text-2xl font-black uppercase tracking-wide text-[#111] leading-tight">
              {loja?.nome ?? 'Grupo Catingueira'}
            </h1>
            <p className="text-[#9CA3AF] text-xs mt-1 tracking-wide">Acesso ao painel administrativo</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-7 flex flex-col gap-4">

            <div>
              <label className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                {...register('email')}
                className={inputCls}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('senha')}
                className={inputCls}
              />
              {errors.senha && (
                <p className="text-red-500 text-xs mt-1.5">{errors.senha.message}</p>
              )}
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                <p className="text-red-600 text-sm text-center">{erro}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider text-[#111] transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              style={{ backgroundColor: '#F5C842' }}
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>

          </form>
        </div>

        {/* Voltar ao site */}
        <p className="text-center mt-5">
          <a
            href="/"
            className="text-[#9CA3AF] hover:text-[#374151] text-xs transition-colors"
          >
            ← Voltar ao site
          </a>
        </p>

      </div>
    </div>
  )
}
