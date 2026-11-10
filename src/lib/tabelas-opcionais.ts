// Tabelas que o código usa mas que podem não existir no banco real (schema
// versionado divergiu do banco). Nome centralizado aqui: se a vistoria estiver
// em outra tabela, troque SÓ esta constante (e a lista da função
// transferir_veiculo na migration 025).
//
// Banco real (nov/2026): `public.vistoria_veiculo` não existia (ERROR 42P01) e
// é criada pela migration 026 com este mesmo nome. Até a 026 ser aplicada, a
// aba Vistoria mostra "indisponível" e a transferência pula essa etapa.
export const TABELA_VISTORIA = 'vistoria_veiculo'

type ErroSupabase = { code?: string | null; message?: string | null } | null | undefined

/**
 * Erro de "tabela não existe": 42P01 (Postgres) ou PGRST205 (PostgREST:
 * "Could not find the table ... in the schema cache").
 */
export function ehTabelaInexistente(error: ErroSupabase): boolean {
  if (!error) return false
  if (error.code === '42P01' || error.code === 'PGRST205') return true
  return /does not exist|could not find the table/i.test(error.message ?? '')
}

export const MSG_VISTORIA_INDISPONIVEL =
  'A vistoria está indisponível: a tabela de vistoria não existe no banco de dados. Avise o administrador.'
