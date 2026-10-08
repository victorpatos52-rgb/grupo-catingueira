'use client'

import { useState, useTransition } from 'react'
import { useAdmin } from '@/contexts/AdminContext'
import { desconectarOlx } from './olx-actions'

const MENSAGENS_ERRO: Record<string, string> = {
  negado: 'A autorização foi negada na OLX. Nada foi alterado.',
  state: 'O link de autorização expirou ou é inválido. Tente conectar novamente.',
  loja_divergente: 'A autorização foi iniciada para outra loja. Conecte pelo domínio da loja correta.',
  loja: 'Não foi possível identificar a loja pelo domínio.',
  troca: 'A OLX não aceitou o código de autorização. Tente conectar novamente.',
  banco: 'Autorizado na OLX, mas houve erro ao salvar. Tente conectar novamente.',
  config: 'Integração OLX não configurada no servidor. Fale com o suporte técnico.',
  olx: 'A OLX retornou um erro na autorização. Tente novamente mais tarde.',
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Fortaleza',
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function IntegracoesSection({
  lojaDominio,
  olxAutorizadoEm,
  resultado,
  motivo,
}: {
  lojaDominio: { id: string; nome: string } | null
  olxAutorizadoEm: string | null
  resultado: string | null
  motivo: string | null
}) {
  const { loja: lojaAtiva } = useAdmin()
  const [erroDesconectar, setErroDesconectar] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()

  function onDesconectar() {
    if (!confirm('Desconectar a OLX desta loja? Será preciso autorizar de novo para voltar a enviar anúncios.')) return
    setErroDesconectar(null)
    startTransition(async () => {
      try {
        await desconectarOlx()
      } catch (err: unknown) {
        setErroDesconectar(err instanceof Error ? err.message : 'Erro ao desconectar')
      }
    })
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm max-w-3xl">
      <h2 className="text-[#111827] font-bold text-sm uppercase tracking-wider mb-1">Integrações</h2>
      <p className="text-[#6B7280] text-xs mb-4">
        A conexão vale para a loja deste domínio{lojaDominio ? <> (<strong>{lojaDominio.nome}</strong>)</> : null}.
      </p>

      {lojaDominio && lojaAtiva && lojaAtiva.id !== lojaDominio.id && (
        <p className="text-amber-700 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          A loja selecionada no painel ({lojaAtiva.nome}) é diferente da loja deste domínio. Para conectar a OLX
          de {lojaAtiva.nome}, acesse o painel pelo domínio dela.
        </p>
      )}

      {resultado === 'conectado' && (
        <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
          ✓ Conta OLX conectada com sucesso.
        </p>
      )}
      {resultado === 'erro' && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {MENSAGENS_ERRO[motivo ?? ''] ?? 'Não foi possível conectar à OLX.'}
        </p>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#E5E7EB] rounded-lg p-4">
        <div>
          <p className="text-[#111827] font-semibold text-sm">OLX</p>
          {olxAutorizadoEm ? (
            <p className="text-green-700 text-xs mt-0.5">Conectado em {formatarData(olxAutorizadoEm)}</p>
          ) : (
            <p className="text-[#6B7280] text-xs mt-0.5">Não conectado</p>
          )}
        </div>
        {lojaDominio && (
          <div className="flex items-center gap-2">
            {/* <a> e não <Link>: é uma rota de API que redireciona para fora do site */}
            <a
              href="/api/integrations/olx/connect"
              className="px-4 py-2 rounded-lg font-bold text-sm text-[#111827] bg-[#F5C842] hover:brightness-90 transition-all"
            >
              {olxAutorizadoEm ? 'Reconectar' : 'Conectar à OLX'}
            </a>
            {olxAutorizadoEm && (
              <button
                type="button"
                onClick={onDesconectar}
                disabled={pendente}
                className="px-4 py-2 rounded-lg font-semibold text-sm text-red-600 border border-red-200 hover:bg-red-50 transition-all disabled:opacity-50"
              >
                {pendente ? 'Desconectando...' : 'Desconectar'}
              </button>
            )}
          </div>
        )}
      </div>

      {erroDesconectar && <p className="text-red-600 text-xs mt-2">{erroDesconectar}</p>}
    </div>
  )
}
