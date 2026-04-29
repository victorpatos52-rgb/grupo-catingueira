import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import type { Lead, UsuarioPerfil, Loja } from '@/types'
import NovoLeadForm from '@/components/admin/NovoLeadForm'

interface SearchParams {
  status?: string
  origem?: string
}

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: perfilData } = await supabase
    .from('usuario_perfis')
    .select('*, loja:lojas(*)')
    .eq('user_id', user.id)
    .single()

  if (!perfilData) redirect('/admin/login')
  const perfil = perfilData as UsuarioPerfil & { loja: Loja | null }

  let query = supabase
    .from('leads')
    .select('*, veiculo:veiculos(marca, modelo, ano)')
    .eq('loja_id', perfil.loja_id)
    .order('created_at', { ascending: false })

  if (params.status) query = query.eq('status', params.status as 'novo' | 'contato_feito' | 'negociando' | 'fechado' | 'perdido')
  if (params.origem) query = query.eq('origem', params.origem as 'site' | 'whatsapp' | 'instagram' | 'indicacao' | 'outros')

  const { data } = await query
  const leads = (data ?? []) as Lead[]

  const statusBadge: Record<string, string> = {
    novo: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    contato_feito: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    negociando: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    fechado: 'bg-green-600/20 text-green-400 border-green-600/30',
    perdido: 'bg-red-600/20 text-red-400 border-red-600/30',
  }

  const origemBadge: Record<string, string> = {
    site: 'bg-purple-500/20 text-purple-400',
    whatsapp: 'bg-green-500/20 text-green-400',
    instagram: 'bg-pink-500/20 text-pink-400',
    indicacao: 'bg-blue-400/20 text-blue-300',
    outros: 'bg-gray-500/20 text-gray-400',
  }

  const statusOpts = [
    { value: '', label: 'Todos' },
    { value: 'novo', label: 'Novo' },
    { value: 'contato_feito', label: 'Contato feito' },
    { value: 'negociando', label: 'Negociando' },
    { value: 'fechado', label: 'Fechado' },
    { value: 'perdido', label: 'Perdido' },
  ]

  const origemOpts = [
    { value: '', label: 'Todas origens' },
    { value: 'site', label: 'Site' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'indicacao', label: 'Indicação' },
    { value: 'outros', label: 'Outros' },
  ]

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-white">
            CRM — Leads
          </h1>
          <p className="text-[#555] text-sm mt-1">{leads.length} lead(s)</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {statusOpts.map(opt => (
          <a
            key={opt.value}
            href={
              opt.value
                ? `/admin/crm?status=${opt.value}${params.origem ? `&origem=${params.origem}` : ''}`
                : `/admin/crm${params.origem ? `?origem=${params.origem}` : ''}`
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              params.status === opt.value || (!params.status && opt.value === '')
                ? 'border-[var(--cor-primaria)] text-[var(--cor-primaria)]'
                : 'border-[#2A2A2A] text-[#666] hover:border-[#333] hover:text-[#888]'
            }`}
          >
            {opt.label}
          </a>
        ))}
        <div className="w-px bg-[#2A2A2A] mx-1" />
        {origemOpts.map(opt => (
          <a
            key={opt.value}
            href={
              opt.value
                ? `/admin/crm${params.status ? `?status=${params.status}&` : '?'}origem=${opt.value}`
                : `/admin/crm${params.status ? `?status=${params.status}` : ''}`
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              params.origem === opt.value || (!params.origem && opt.value === '')
                ? 'border-[var(--cor-primaria)] text-[var(--cor-primaria)]'
                : 'border-[#2A2A2A] text-[#666] hover:border-[#333] hover:text-[#888]'
            }`}
          >
            {opt.label}
          </a>
        ))}
      </div>

      {/* Adicionar lead manualmente */}
      <div className="mb-6">
        <NovoLeadForm lojaId={perfil.loja_id} />
      </div>

      {/* Tabela */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                {['Nome', 'Telefone', 'Veículo de interesse', 'Origem', 'Status', 'Data', 'Ação'].map(h => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-[#555] font-medium text-xs uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E1E]">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#555] text-sm">
                    Nenhum lead encontrado.
                  </td>
                </tr>
              ) : (
                leads.map((l, i) => {
                  const whatsappLink = `https://wa.me/55${l.telefone.replace(/\D/g, '')}`
                  const dataFmt = new Date(l.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                  })

                  return (
                    <tr
                      key={l.id}
                      className={i % 2 === 0 ? 'bg-[#1A1A1A]' : 'bg-[#141414]'}
                    >
                      <td className="px-4 py-3 text-white font-medium">{l.nome}</td>
                      <td className="px-4 py-3 text-[#888]">{l.telefone}</td>
                      <td className="px-4 py-3 text-[#888] whitespace-nowrap">
                        {l.veiculo
                          ? `${l.veiculo.marca} ${l.veiculo.modelo} ${l.veiculo.ano}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${origemBadge[l.origem]}`}>
                          {l.origem}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusBadge[l.status]}`}
                        >
                          {l.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#555] whitespace-nowrap">{dataFmt}</td>
                      <td className="px-4 py-3">
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/10 text-[#25D366] text-xs font-medium hover:bg-[#25D366]/20 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                          Abrir
                        </a>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
