'use client'

import { useState } from 'react'
import { submitContatoLead } from '@/app/actions'

interface Props {
  waHref: string
}

// A loja é resolvida no servidor pelo domínio (submitContatoLead) — não vem daqui.
export default function ContatoForm({ waHref }: Props) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [veiculoInteresse, setVeiculoInteresse] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      const website = (e.currentTarget as HTMLFormElement).elements.namedItem('website') as HTMLInputElement | null
      const res = await submitContatoLead({ nome, telefone, email, mensagem, veiculoInteresse, website: website?.value })
      if (!res.ok) {
        setErro(res.erro)
        return
      }
      setSucesso(true)
    } catch {
      setErro('Erro ao enviar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  if (sucesso) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#F0FFF4' }}>
        <p className="text-3xl mb-3">✅</p>
        <h2 className="font-[family-name:var(--font-barlow-condensed)] text-2xl font-extrabold uppercase text-[#0D1B2A] mb-2">
          Mensagem enviada!
        </h2>
        <p className="text-[#6B7280] text-sm mb-6">
          Recebemos seu contato e retornaremos em breve.
        </p>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#25D366] text-white font-bold text-sm uppercase tracking-wider hover:brightness-95 transition-all"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          Falar pelo WhatsApp
        </a>
      </div>
    )
  }

  const inputCls = 'w-full border rounded-xl px-4 py-3 text-[#1F2937] text-sm focus:outline-none transition-colors placeholder-[#9CA3AF]'
  const inputStyle = { borderColor: '#E5E7EB' }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Campo-isca anti-spam: fora da tela e fora do Tab; humanos não preenchem. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>
          Site
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
            Nome *
          </label>
          <input
            required
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Seu nome completo"
            className={inputCls}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
            Telefone / WhatsApp *
          </label>
          <input
            required
            type="tel"
            value={telefone}
            onChange={e => setTelefone(e.target.value)}
            placeholder="(83) 9 9999-9999"
            className={inputCls}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className={inputCls}
          style={inputStyle}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
          Veículo de interesse
        </label>
        <input
          value={veiculoInteresse}
          onChange={e => setVeiculoInteresse(e.target.value)}
          placeholder="Ex: Toyota Corolla 2022"
          className={inputCls}
          style={inputStyle}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
          Mensagem
        </label>
        <textarea
          value={mensagem}
          onChange={e => setMensagem(e.target.value)}
          rows={4}
          placeholder="Como podemos ajudá-lo?"
          className={`${inputCls} resize-y`}
          style={inputStyle}
        />
      </div>

      {erro && (
        <p className="text-red-500 text-sm">{erro}</p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all hover:brightness-90 disabled:opacity-50 text-white"
        style={{ backgroundColor: 'var(--cor-primaria)', color: '#0D0D0D' }}
      >
        {enviando ? 'Enviando...' : 'Enviar mensagem'}
      </button>

      <p className="text-center text-[#9CA3AF] text-xs">
        Ou fale direto pelo{' '}
        <a href={waHref} target="_blank" rel="noopener noreferrer" className="text-[#25D366] font-semibold hover:underline">
          WhatsApp
        </a>
      </p>
    </form>
  )
}
