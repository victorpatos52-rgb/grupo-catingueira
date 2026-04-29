'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createBrowserClient } from '@/lib/supabase'
import { useLoja } from '@/contexts/LojaContext'

const schema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const loja = useLoja()
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setErro('')
    setCarregando(true)
    const supabase = createBrowserClient()

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

  const corPrimaria = loja?.cor_primaria ?? '#F5C842'

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 font-[family-name:var(--font-barlow-condensed)] font-black text-xl text-[#0D0D0D]"
            style={{ backgroundColor: corPrimaria }}
          >
            {(loja?.nome ?? 'GC').substring(0, 2).toUpperCase()}
          </div>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-white">
            {loja?.nome ?? 'Painel Admin'}
          </h1>
          <p className="text-[#666] text-sm mt-1">Entre com suas credenciais</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-[#111] border border-[#1E1E1E] rounded-2xl p-6 flex flex-col gap-4"
        >
          <div>
            <label className="block text-xs text-[#888] uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              {...register('email')}
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors"
              placeholder="seu@email.com"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-[#888] uppercase tracking-wider mb-1.5">
              Senha
            </label>
            <input
              type="password"
              autoComplete="current-password"
              {...register('senha')}
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors"
              placeholder="••••••••"
            />
            {errors.senha && (
              <p className="text-red-400 text-xs mt-1">{errors.senha.message}</p>
            )}
          </div>

          {erro && (
            <p className="text-red-400 text-sm text-center bg-red-400/10 rounded-lg px-4 py-2">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider text-[#0D0D0D] transition-all hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            style={{ backgroundColor: corPrimaria }}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center mt-6">
          <a
            href="/"
            className="text-[#555] hover:text-white text-xs transition-colors"
          >
            ← Voltar ao site
          </a>
        </p>
      </div>
    </div>
  )
}
