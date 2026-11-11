import { createClient } from '@supabase/supabase-js'

// Clients do Supabase usados no SERVIDOR.
//
// Não existe mais client com cookies de sessão nas páginas/actions: qualquer
// consulta feita com ele chama getSession() por baixo e, se o token estiver
// perto de vencer, RENOVA — e no servidor de páginas o cookie novo não pode ser
// gravado. O refresh token antigo fica gasto no navegador e o Supabase derruba
// a sessão no próximo uso (causa das quedas de login).
//
// Regra: só o src/proxy.ts fala com o Supabase Auth e renova a sessão (e
// devolve os cookies ao navegador). O resto do servidor usa:
//   - adminSupabase()  → service role, com a autorização feita no código
//                        (lib/sessao.ts + lib/acesso.ts + lib/loja-ativa.ts);
//   - publicSupabase() → anon, SEM sessão (site público: view veiculos_publicos).

export function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/** Anon e sem sessão: dados públicos do site. Nunca lê nem renova cookies. */
export function publicSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
  )
}
