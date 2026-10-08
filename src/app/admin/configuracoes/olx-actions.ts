'use server'

import { revalidatePath } from 'next/cache'
import { getLoja } from '@/lib/getLoja'
import { adminSupabase } from '@/lib/supabase-server'
import { usuarioPodeGerenciarOlx } from '@/lib/olx'

/** Apaga o token OLX da loja resolvida pelo domínio. */
export async function desconectarOlx() {
  const loja = await getLoja()
  if (!loja) throw new Error('Loja não identificada pelo domínio.')
  if (!(await usuarioPodeGerenciarOlx(loja.id))) throw new Error('Sem permissão para gerenciar integrações.')

  const { error } = await adminSupabase().from('olx_integracoes').delete().eq('loja_id', loja.id)
  if (error) throw new Error('Erro ao desconectar da OLX.')

  revalidatePath('/admin/configuracoes')
}
