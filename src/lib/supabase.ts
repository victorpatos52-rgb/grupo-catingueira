import { createServerClient } from '@supabase/ssr'
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export type Database = {
  public: {
    Tables: {
      lojas: {
        Row: {
          id: string
          nome: string
          dominio: string
          whatsapp: string
          cor_primaria: string
          cor_secundaria: string
          logo_url: string | null
          endereco: string | null
          cidade: string | null
          estado: string | null
          maps_url: string | null
          descricao: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['lojas']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['lojas']['Row'], 'id'>>
        Relationships: []
      }
      veiculos: {
        Row: {
          id: string
          loja_id: string
          marca: string
          modelo: string
          versao: string | null
          ano: number
          cor: string
          km: number
          combustivel: string
          cambio: string
          preco: number
          placa: string | null
          descricao: string | null
          opcionais: string[]
          status: 'disponivel' | 'reservado' | 'vendido' | 'manutencao'
          destaque: boolean
          fotos: string[]
          data_aquisicao: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['veiculos']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['veiculos']['Row'], 'id'>>
        Relationships: []
      }
      financeiro_veiculos: {
        Row: {
          id: string
          veiculo_id: string
          loja_id: string
          custo_aquisicao: number
          custos_adicionais: { descricao: string; valor: number }[]
          preco_venda: number | null
          data_venda: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['financeiro_veiculos']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['financeiro_veiculos']['Row'], 'id'>>
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          loja_id: string
          nome: string
          telefone: string
          veiculo_id: string | null
          origem: 'site' | 'whatsapp' | 'instagram' | 'indicacao' | 'outros'
          status: 'novo' | 'contato_feito' | 'negociando' | 'fechado' | 'perdido'
          observacoes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['leads']['Row'], 'id'>>
        Relationships: []
      }
      usuario_perfis: {
        Row: {
          id: string
          user_id: string
          loja_id: string
          perfil: 'vendedor' | 'gerente' | 'diretor' | 'admin'
          nome: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['usuario_perfis']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['usuario_perfis']['Row'], 'id'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — token refresh handled by middleware
          }
        },
      },
    }
  )
}

export function createBrowserClient() {
  return createSupabaseBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
