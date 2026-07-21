import { notFound, redirect } from 'next/navigation'
import { createServerSupabase, adminSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import MarcaVendidoButton from '@/components/admin/MarcaVendidoButton'
import ExcluirVeiculoButton from '@/components/admin/ExcluirVeiculoButton'
import TransferirVeiculoButton from '@/components/admin/TransferirVeiculoButton'
import PublicarVeiculoButton from '@/components/admin/PublicarVeiculoButton'
import VeiculoTabs, { type Aba } from './VeiculoTabs'
import type { AnexoComUrl } from './DocumentacaoVeiculoClient'
import type { Veiculo, UsuarioPerfil, FinanceiroVeiculo, CustoManutencao, VeiculoAquisicao, Anexo, VistoriaVeiculo, VeiculoTransferencia } from '@/types'

const ABAS_VALIDAS: Aba[] = ['dados', 'fotos', 'financeiro', 'checklist', 'documentacao', 'vistoria']

export default async function EditarVeiculoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ aba?: string }>
}) {
  const { id } = await params
  const { aba: abaParam } = await searchParams
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilData } = await supabase.from('usuarios_perfil').select('*').eq('id', user.id).single()
  if (!perfilData) redirect('/login')
  const perfil = perfilData as UsuarioPerfil

  const lojaId = await getLojaIdAtiva(perfil)
  // Documentação (aquisição/anexos do veículo, histórico de transferência) —
  // gerente/diretor/admin, como sempre foi.
  const podeVerDocumentacao = ['gerente', 'diretor', 'admin'].includes(perfil.perfil)
  // Financeiro "de verdade" (custo de aquisição, valor de venda, DRE por
  // carro) — agora restrito a admin. Diferente de podeVerDocumentacao.
  const podeVerFinanceiroCompleto = perfil.perfil === 'admin'

  // Permite abrir direto numa aba específica (ex: link "Lançar despesa" na tela
  // de venda) — só aceita valores conhecidos, e nunca uma aba restrita pra quem
  // não tem a permissão correspondente (a própria VeiculoTabs também revalida isso).
  const abaInicial: Aba | undefined =
    abaParam && (ABAS_VALIDAS as string[]).includes(abaParam) &&
    (abaParam !== 'financeiro' || podeVerFinanceiroCompleto) &&
    (abaParam !== 'documentacao' || podeVerDocumentacao)
      ? (abaParam as Aba)
      : undefined

  const admin = adminSupabase()
  const [
    { data },
    { data: finData },
    { data: custosData },
    { data: aquisicaoData },
    { data: anexosData },
    { data: vistoriaData },
    { data: outrasLojasData },
    { data: transferenciasData },
  ] = await Promise.all([
    admin.from('veiculos').select('*').eq('id', id).eq('loja_id', lojaId).single(),
    // financeiro_veiculos (custo de aquisição, preço de venda) agora só é
    // buscado por quem tem financeiro completo (admin) — mesmo motivo de não
    // mandar dado sensível no payload mesmo com a aba escondida na UI.
    podeVerFinanceiroCompleto
      ? admin
          .from('financeiro_veiculos')
          .select('*')
          .eq('veiculo_id', id)
          .eq('loja_id', lojaId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // custos_manutencao NÃO é gated: é usado tanto pela aba Financeiro (admin)
    // quanto pela aba Checklist de Serviços (aberta pra todo mundo) — só o
    // valor monetário some da tela pra quem não é admin, a lista de serviços
    // continua visível pra todos, como sempre foi.
    admin
      .from('custos_manutencao')
      .select('*')
      .eq('veiculo_id', id)
      .order('data', { ascending: false }),
    // Documentação (aquisição/anexos) só é buscada para quem tem permissão de vê-la —
    // evita mandar dados sensíveis (CPF do vendedor, signed URLs de anexos privados)
    // no payload para um vendedor, mesmo que a aba fique escondida na UI.
    podeVerDocumentacao
      ? admin.from('veiculo_aquisicao').select('*').eq('veiculo_id', id).maybeSingle()
      : Promise.resolve({ data: null }),
    podeVerDocumentacao
      ? admin
          .from('anexos')
          .select('*, usuario:usuarios_perfil(nome)')
          .eq('entidade_tipo', 'veiculo')
          .eq('entidade_id', id)
          .order('criado_em', { ascending: false })
      : Promise.resolve({ data: [] as Anexo[] }),
    admin
      .from('vistoria_veiculo')
      .select('*')
      .eq('veiculo_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Loja(s) de destino possíveis para o botão "Transferir" — segue o mesmo
    // nível de Documentação (não é "financeiro completo"), sem mudança de
    // comportamento nesta reorganização.
    podeVerDocumentacao
      ? admin.from('lojas').select('id, nome').order('nome')
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
    podeVerDocumentacao
      ? admin
          .from('veiculo_transferencias')
          .select('*, loja_origem:lojas!veiculo_transferencias_loja_origem_id_fkey(nome)')
          .eq('veiculo_id', id)
          .order('data_transferencia', { ascending: false })
      : Promise.resolve({ data: [] as VeiculoTransferencia[] }),
  ])

  if (!data) notFound()
  const veiculo = data as Veiculo

  // Sócio só pode ver/editar veículos de propriedade dividida da loja Felizardo —
  // mesma regra já aplicada na listagem, aqui bloqueando acesso direto por URL.
  if (perfil.perfil === 'socio') {
    const { data: lojaRow } = await admin.from('lojas').select('dominio').eq('id', veiculo.loja_id).single()
    const ehFelizardo = (lojaRow?.dominio ?? '').toLowerCase().includes('felizardo')
    if (!ehFelizardo || veiculo.proprietario_tipo !== 'dividido') {
      redirect('/admin/veiculos')
    }
  }

  const financeiro = finData as FinanceiroVeiculo | null
  const custos = (custosData ?? []) as CustoManutencao[]
  const aquisicao = aquisicaoData as VeiculoAquisicao | null
  const vistoria = vistoriaData as VistoriaVeiculo | null
  const outrasLojas = ((outrasLojasData ?? []) as { id: string; nome: string }[]).filter(
    l => l.id !== veiculo.loja_id
  )
  const transferencias = (transferenciasData ?? []) as VeiculoTransferencia[]

  const anexos: AnexoComUrl[] = await Promise.all(
    ((anexosData ?? []) as Anexo[]).map(async a => {
      const { data: signed } = await admin.storage.from('veiculos-documentos').createSignedUrl(a.url, 3600)
      return { ...a, urlAssinada: signed?.signedUrl ?? null }
    })
  )

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <a
          href="/admin/veiculos"
          className="text-[#6B7280] hover:text-[#111] text-sm transition-colors inline-flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </a>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111] flex items-center gap-3">
              Editar Veículo
              {veiculo.rascunho && (
                <span className="text-xs px-2.5 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-700 font-semibold tracking-wide normal-case">
                  RASCUNHO
                </span>
              )}
            </h1>
            <p className="text-[#6B7280] text-sm mt-1">
              {veiculo.marca} {veiculo.modelo} {veiculo.ano}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {veiculo.rascunho && (
              <PublicarVeiculoButton
                veiculoId={id}
                temFoto={veiculo.fotos.length > 0}
                temPreco={veiculo.preco > 0}
              />
            )}
            <a
              href={`/api/pdf/ficha/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E5E5] text-[#6B7280] text-xs font-medium hover:text-[#111] hover:border-[#D0D0D0] transition-colors"
            >
              📄 Ficha
            </a>
            {veiculo.status !== 'vendido' && (
              <MarcaVendidoButton veiculoId={id} />
            )}
            {podeVerDocumentacao && !veiculo.excluido && (
              <TransferirVeiculoButton veiculoId={id} outrasLojas={outrasLojas} />
            )}
            {!veiculo.excluido && <ExcluirVeiculoButton veiculoId={id} />}
          </div>
        </div>
        {veiculo.excluido && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <p className="text-amber-700 text-sm">
              Este veículo foi excluído (soft delete) — o registro foi mantido para preservar histórico financeiro/vendas.
            </p>
          </div>
        )}
      </div>

      <VeiculoTabs
        veiculo={veiculo}
        financeiro={financeiro}
        custos={custos}
        lojaId={lojaId}
        podeVerDocumentacao={podeVerDocumentacao}
        podeVerFinanceiroCompleto={podeVerFinanceiroCompleto}
        aquisicao={aquisicao}
        anexos={anexos}
        vistoria={vistoria}
        transferencias={transferencias}
        abaInicial={abaInicial}
      />
    </div>
  )
}
