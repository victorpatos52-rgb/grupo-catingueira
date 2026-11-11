import type { Perfil } from '@/types'

// Tela inicial de cada perfil — usada pelo login (navegador), pelo proxy
// (/login com sessão válida, /admin) e por /api/auth/sair. Sem dependência de
// servidor ou navegador.
//
//   admin           → Dashboard (só admin vê o Dashboard — regra do proxy)
//   sócio           → Veículos (sócio não acessa CRM/Vendas)
//   diretor         → CRM
//   gerente/vendedor→ primeiro módulo liberado: CRM → Veículos → Vendas
export function telaInicial(perfil: { perfil: Perfil | string; modulos_permitidos?: string[] | null }): string {
  if (perfil.perfil === 'admin') return '/admin/dashboard'
  if (perfil.perfil === 'socio') return '/admin/veiculos'
  if (perfil.perfil === 'diretor') return '/admin/crm'
  const modulos = perfil.modulos_permitidos ?? []
  if (modulos.includes('crm')) return '/admin/crm'
  if (modulos.includes('veiculos')) return '/admin/veiculos'
  if (modulos.includes('vendas')) return '/admin/vendas'
  return '/admin/veiculos'
}
