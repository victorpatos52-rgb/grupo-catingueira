import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createServerSupabase } from '@/lib/supabase-server'
import { formatarPreco, formatarKm } from '@/lib/utils'
import type { Veiculo, UsuarioPerfil } from '@/types'
import MarcaVendidoButton from '@/components/admin/MarcaVendidoButton'

interface SearchParams {
  status?: string
}

export default async function VeiculosAdminPage({
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
    .select('*')
    .eq('user_id', user.id)
    .single()

  const perfil = perfilData as UsuarioPerfil | null
  if (!perfil) redirect('/admin/login')

  let query = supabase
    .from('veiculos')
    .select('*')
    .eq('loja_id', perfil.loja_id)
    .order('created_at', { ascending: false })

  if (params.status) {
    query = query.eq('status', params.status as 'disponivel' | 'reservado' | 'vendido' | 'manutencao')
  }

  const { data } = await query
  const veiculos = (data ?? []) as Veiculo[]

  const statusBadge: Record<string, string> = {
    disponivel: 'bg-green-600/20 text-green-400 border-green-600/30',
    reservado: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    vendido: 'bg-red-600/20 text-red-400 border-red-600/30',
    manutencao: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  }

  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'disponivel', label: 'Disponível' },
    { value: 'reservado', label: 'Reservado' },
    { value: 'vendido', label: 'Vendido' },
    { value: 'manutencao', label: 'Manutenção' },
  ]

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-white">
            Veículos
          </h1>
          <p className="text-[#555] text-sm mt-1">{veiculos.length} veículo(s)</p>
        </div>
        <Link
          href="/admin/veiculos/novo"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm text-[#0D0D0D] transition-all hover:brightness-90"
          style={{ backgroundColor: 'var(--cor-primaria)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Veículo
        </Link>
      </div>

      {/* Filtro status */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {statusOptions.map(opt => (
          <a
            key={opt.value}
            href={opt.value ? `/admin/veiculos?status=${opt.value}` : '/admin/veiculos'}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              params.status === opt.value || (!params.status && opt.value === '')
                ? 'border-[var(--cor-primaria)] text-[var(--cor-primaria)]'
                : 'border-[#2A2A2A] text-[#666] hover:border-[#333] hover:text-[#888]'
            }`}
          >
            {opt.label}
          </a>
        ))}
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
        {veiculos.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[#555] text-sm">Nenhum veículo encontrado.</p>
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
                <tr className="border-b border-[#2A2A2A]">
                  <th className="text-left px-4 py-3 text-[#555] font-medium text-xs uppercase tracking-wider">Veículo</th>
                  <th className="text-left px-4 py-3 text-[#555] font-medium text-xs uppercase tracking-wider hidden md:table-cell">KM</th>
                  <th className="text-left px-4 py-3 text-[#555] font-medium text-xs uppercase tracking-wider">Preço</th>
                  <th className="text-left px-4 py-3 text-[#555] font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Status</th>
                  <th className="text-right px-4 py-3 text-[#555] font-medium text-xs uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E1E]">
                {veiculos.map((v, i) => (
                  <tr
                    key={v.id}
                    className={i % 2 === 0 ? 'bg-[#1A1A1A]' : 'bg-[#141414]'}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-10 rounded-md overflow-hidden bg-[#111] shrink-0">
                          {v.fotos[0] ? (
                            <Image
                              src={v.fotos[0]}
                              alt={`${v.marca} ${v.modelo}`}
                              width={56}
                              height={40}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-[#333]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">{v.marca} {v.modelo}</p>
                          <p className="text-[#555] text-xs">{v.ano} • {v.cambio}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#888] hidden md:table-cell">{formatarKm(v.km)}</td>
                    <td className="px-4 py-3 text-white font-medium">{formatarPreco(v.preco)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusBadge[v.status]}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/veiculos/${v.id}`}
                          className="text-xs text-[#666] hover:text-white px-2.5 py-1.5 rounded-md border border-[#2A2A2A] hover:border-[#333] transition-colors"
                        >
                          Editar
                        </Link>
                        <a
                          href={`/veiculo/${v.id}`}
                          target="_blank"
                          className="text-xs text-[#666] hover:text-white px-2.5 py-1.5 rounded-md border border-[#2A2A2A] hover:border-[#333] transition-colors"
                        >
                          Ver
                        </a>
                        {v.status !== 'vendido' && (
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
