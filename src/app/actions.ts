'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Perfil } from '@/types'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function userSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
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
          } catch {}
        },
      },
    }
  )
}

export async function setLojaAtiva(lojaId: string) {
  const cookieStore = await cookies()
  cookieStore.set('loja_ativa', lojaId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function updateUserRole(perfilId: string, novoPerfil: Perfil) {
  const supabase = adminSupabase()
  const { error } = await supabase
    .from('usuarios_perfil')
    .update({ perfil: novoPerfil })
    .eq('id', perfilId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/usuarios')
}

export async function inviteUser(
  email: string,
  lojaId: string,
  perfil: Perfil,
  nome: string
) {
  const supabase = adminSupabase()
  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(email)
  if (inviteError || !inviteData.user) {
    throw new Error(inviteError?.message ?? 'Falha ao convidar usuário')
  }
  const { error } = await supabase.from('usuarios_perfil').insert({
    id: inviteData.user.id,
    loja_id: lojaId,
    perfil,
    nome,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/usuarios')
}

export async function deleteUser(id: string) {
  const supabase = adminSupabase()
  await supabase.from('usuarios_perfil').delete().eq('id', id)
  await supabase.auth.admin.deleteUser(id)
  revalidatePath('/admin/usuarios')
}

export async function updateLojaSettings(
  lojaId: string,
  data: {
    nome: string
    whatsapp: string
    cor_primaria: string
    cor_secundaria: string
    endereco: string | null
    cidade: string | null
    estado: string | null
    horario: string | null
    sobre: string | null
    missao: string | null
    visao: string | null
    instagram: string | null
    maps_url: string | null
  }
) {
  const supabase = await userSupabase()
  const { error } = await supabase.from('lojas').update(data).eq('id', lojaId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/configuracoes')
  revalidatePath('/', 'layout')
}

export async function updateLead(
  leadId: string,
  updates: { status: string; observacoes: string | null }
) {
  const supabase = await userSupabase()
  const { error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', leadId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/leads/' + leadId)
  revalidatePath('/admin/crm')
}
