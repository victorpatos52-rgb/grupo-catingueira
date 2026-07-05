import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createServerSupabase, adminSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import { formatarPreco, formatarKm } from '@/lib/utils'
import type { Veiculo, UsuarioPerfil } from '@/types'
import MarcaVendidoButton from '@/components/admin/MarcaVendidoButton'
import VeiculosBuscaClient from './VeiculosBuscaClient'

interface SearchParams {
  status?: string
  q?: string
}

export default async function VeiculosAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilData } = await supabase.from('usuarios_perfil').select('*').eq('id', user.id).single()
  const perfil = perfilData as UsuarioPerfil | null
  if (!perfil) redirect('/login')

  const lojaId = await getLojaIdAtiva(perfil)
  const ehSocio = perfil.perfil === 'socio'

  const admin = adminSupabase()
  let query = admin.from('veiculos').select('*').eq('loja_id', lojaId).eq('excluido', false).order('created_at', { ascending: false })
  // Sócio só vê veículos de propriedade dividida (Felizardo) — filtro na query, não só na UI.
  if (ehSocio) {
    query = query.eq('proprietario_tipo', 'dividido')
  }
  if (params.status) {
    query = query.eq('status', params.status as 'disponivel' | 'reservado' | 'vendido' | 'manutencao')
  }
  if (params.q) {
    const q = params.q.replace(/'/g, "''")
    query = query.or(`marca.ilike.%${q}%,modelo.ilike.%${q}%,placa.ilike.%${q}%`)
  }

  const { data } = await query
  const veiculos = (data ?? []) as Veiculo[]

  const statusBadge: Record<string, string> = {
    disponivel: 'bg-green-50 text-green-700 border-green-200',
    reservado: 'bg-amber-50 text-amber-700 border-amber-200',
    vendido: 'bg-red-50 text-red-700 border-red-200',
    manutencao: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'disponivel', label: 'Disponível' },
    { value: 'reservado', label: 'Reservado' },
    { value: 'vendido', label: 'Vendido' },
    { value: 'manutencao', label: 'Manutenção' },
  ]

  return (
    <div className="p-6 md:p-8 pb-24 md:pb-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
            Veículos
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">{veiculos.length} veículo(s)</p>
        </div>
        <Link
          href="/admin/veiculos/novo"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:brightness-90"
          style={{ backgroundColor: 'var(--cor-primaria)', color: '#111' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Veículo
        </Link>
      </div>

      <VeiculosBuscaClient valorInicial={params.q ?? ''} status={params.status ?? ''} />

      <div className="flex gap-2 mb-6 flex-wrap">
        {statusOptions.map(opt => (
          <a
            key={opt.value}
            href={(() => {
              const p = new URLSearchParams()
              if (opt.value) p.set('status', opt.value)
              if (params.q) p.set('q', params.q)
              const qs = p.toString()
              return `/admin/veiculos${qs ? `?${qs}` : ''}`
            })()}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              params.status === opt.value || (!params.status && opt.value === '')
                ? 'border-[var(--cor-primaria)] text-[var(--cor-primaria)] bg-white'
                : 'border-[#E5E5E5] text-[#6B7280] hover:border-[#D0D0D0] hover:text-[#374151] bg-white'
            }`}
          >
            {opt.label}
          </a>
        ))}
      </div>

      <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm">
        {veiculos.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[#9CA3AF] text-sm">Nenhum veículo encontrado.</p>
            <Link
              href="/admin/veiculos/novo"
              className="mt-3 inline-flex text-sm underline underline-offset-2 transition-opacity hover:opacity-70"
              style={{ color: 'var(--cor-primaria)' }}
            >
              Cadastrar primeiro veículo
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#F8F8F8]">
                  <th className="text-left px-4 py-3 text-[#9CA3AF] font-medium text-xs uppercase tracking-wider">Veículo</th>
                  <th className="text-left px-4 py-3 text-[#9CA3AF] font-medium text-xs uppercase tracking-wider hidden md:table-cell">KM</th>
                  <th className="text-left px-4 py-3 text-[#9CA3AF] font-medium text-xs uppercase tracking-wider">Preço</th>
                  <th className="text-left px-4 py-3 text-[#9CA3AF] font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Status</th>
                  <th className="text-right px-4 py-3 text-[#9CA3AF] font-medium text-xs uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {veiculos.map(v => (
                  <tr key={v.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-10 rounded-md overflow-hidden bg-[#F5F5F5] shrink-0">
                          {v.fotos[0] ? (
                            <Image src={v.fotos[0]} alt={`${v.marca} ${v.modelo}`} width={56} height={40} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-[#D0D0D0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[#111] font-medium">{v.marca} {v.modelo}</p>
                          <p className="text-[#9CA3AF] text-xs">{v.ano} · {v.cambio}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] hidden md:table-cell">{formatarKm(v.km)}</td>
                    <td className="px-4 py-3 text-[#111] font-medium">{formatarPreco(v.preco)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusBadge[v.status]}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/veiculos/${v.id}`}
                          className="text-xs text-[#6B7280] hover:text-[#111] px-2.5 py-1.5 rounded-md border border-[#E5E5E5] hover:border-[#D0D0D0] transition-colors bg-white"
                        >
                          Editar
                        </Link>
                        <a
                          href={`/veiculo/${v.id}`}
                          target="_blank"
                          className="text-xs text-[#6B7280] hover:text-[#111] px-2.5 py-1.5 rounded-md border border-[#E5E5E5] hover:border-[#D0D0D0] transition-colors bg-white"
                        >
                          Ver
                        </a>
                        {/* Sócio não acessa /admin/vendas (bloqueado no proxy) — esconde o atalho */}
                        {v.status !== 'vendido' && !ehSocio && (
                          <MarcaVendidoButton veiculoId={v.id} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
