import { redirect } from 'next/navigation'
import { exigirPerfilPagina } from '@/lib/sessao'
import { adminSupabase } from '@/lib/supabase-server'
import { obterLojaAtivaId } from '@/lib/loja-ativa'
import type { UsuarioPerfil, Venda } from '@/types'
import VendasClient from './VendasClient'

export default async function VendasPage() {
  // Sessão validada pelo proxy e perfil lido uma vez por requisição
  // (lib/sessao.ts) — esta página não fala com o Supabase Auth.
  const perfil = await exigirPerfilPagina()
  const lojaId = await obterLojaAtivaId(perfil)

  const admin = adminSupabase()
  const { data } = await admin
    .from('vendas')
    .select('*, veiculo:veiculos(id,marca,modelo,ano,fotos,preco,placa,cor,km,cambio,combustivel,versao), vendedor:usuarios_perfil(nome)')
    .eq('loja_id', lojaId)
    .order('created_at', { ascending: false })

  const vendas = (data ?? []) as Venda[]

  return <VendasClient perfil={perfil} vendas={vendas} lojaId={lojaId} />
}
