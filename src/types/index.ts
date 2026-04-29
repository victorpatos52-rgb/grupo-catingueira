export type StatusVeiculo = 'disponivel' | 'reservado' | 'vendido' | 'manutencao'
export type Perfil = 'vendedor' | 'gerente' | 'diretor' | 'admin'
export type StatusLead = 'novo' | 'contato_feito' | 'negociando' | 'fechado' | 'perdido'
export type OrigemLead = 'site' | 'whatsapp' | 'instagram' | 'indicacao' | 'outros'

export interface Loja {
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

export interface Veiculo {
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
  status: StatusVeiculo
  destaque: boolean
  fotos: string[]
  data_aquisicao: string
  created_at: string
}

export interface CustoAdicional {
  descricao: string
  valor: number
}

export interface FinanceiroVeiculo {
  id: string
  veiculo_id: string
  loja_id: string
  custo_aquisicao: number
  custos_adicionais: CustoAdicional[]
  preco_venda: number | null
  data_venda: string | null
  created_at: string
  veiculo?: Pick<Veiculo, 'marca' | 'modelo' | 'ano' | 'data_aquisicao'> | null
}

export interface Lead {
  id: string
  loja_id: string
  nome: string
  telefone: string
  veiculo_id: string | null
  veiculo?: Pick<Veiculo, 'marca' | 'modelo' | 'ano'> | null
  origem: OrigemLead
  status: StatusLead
  observacoes: string | null
  created_at: string
}

export interface UsuarioPerfil {
  id: string
  user_id: string
  loja_id: string
  loja?: Loja | null
  perfil: Perfil
  nome: string
  created_at: string
}
