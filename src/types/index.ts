export type StatusVeiculo = 'disponivel' | 'reservado' | 'vendido' | 'manutencao'
export type Perfil = 'vendedor' | 'gerente' | 'diretor' | 'admin'
export type StatusLead = 'novo' | 'contato_feito' | 'negociando' | 'fechado' | 'perdido'
export type OrigemLead = 'site' | 'whatsapp' | 'instagram' | 'indicacao' | 'outros'
export type TipoInteracao = 'nota' | 'whatsapp' | 'ligacao' | 'visita' | 'proposta' | 'site'

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
  sobre: string | null
  missao: string | null
  visao: string | null
  horario: string | null
  instagram: string | null
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
  valor_oferta?: number | null
  placa: string | null
  chassi: string | null
  renavam: string | null
  tipo: string | null
  portas: number | null
  hodometro_venda: number | null
  descricao: string | null
  opcionais: string[]
  status: StatusVeiculo
  destaque: boolean
  fotos: string[]
  data_aquisicao: string
  created_at: string
  excluido?: boolean
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

export interface CustoManutencao {
  id: string
  veiculo_id: string
  loja_id: string
  categoria: string
  descricao: string
  valor: number
  data: string | null
  created_at: string
}

export interface Lead {
  id: string
  loja_id: string
  nome: string
  telefone: string
  email: string | null
  veiculo_id: string | null
  veiculo?: Pick<Veiculo, 'id' | 'marca' | 'modelo' | 'ano'> | null
  origem: OrigemLead
  status: StatusLead
  observacoes: string | null
  responsavel_id: string | null
  criado_por: string | null
  tags: string[]
  data_contato: string | null
  veiculo_interesse: string | null
  proximo_atendimento: string | null
  cpf: string | null
  data_nascimento: string | null
  profissao: string | null
  endereco: string | null
  created_at: string
}

export interface UsuarioPerfil {
  id: string
  loja_id: string
  loja?: Loja | null
  perfil: Perfil
  nome: string
  email?: string
  ativo: boolean
  modulos_permitidos: string[]
  created_at: string
}

export interface LeadInteracao {
  id: string
  lead_id: string
  loja_id: string
  usuario_id: string | null
  tipo: TipoInteracao
  descricao: string
  created_at: string
  usuario?: Pick<UsuarioPerfil, 'nome'> | null
}

export interface MensagemPadrao {
  id: string
  loja_id: string
  titulo: string
  mensagem: string
  created_at: string
}

export interface Lembrete {
  id: string
  loja_id: string
  lead_id: string | null
  veiculo_id: string | null
  tipo: 'pos_venda' | 'aniversario_compra' | 'aniversario_cliente' | 'financiamento' | 'visita' | 'personalizado'
  data_lembrete: string
  mensagem: string | null
  concluido: boolean
  created_at: string
  lead?: Pick<Lead, 'nome' | 'telefone'> | null
  veiculo?: Pick<Veiculo, 'marca' | 'modelo' | 'ano'> | null
}

export interface VistoriaVeiculo {
  id: string
  veiculo_id: string
  loja_id: string
  inspetor_id: string
  itens: Record<string, 'ok' | 'nok' | 'na'>
  observacoes: string | null
  aprovado: boolean
  created_at: string
}

export interface DespesaLoja {
  id: string
  loja_id: string
  descricao: string
  categoria: string
  valor: number
  data: string
  recorrente: boolean
  created_at: string
}

export type VendaStatus = 'rascunho' | 'finalizada'

export interface Venda {
  id: string
  loja_id: string
  veiculo_id: string
  vendedor_id: string | null
  numero_negociacao: string | null
  data_venda: string
  comprador_nome: string
  comprador_cpf: string | null
  comprador_rg: string | null
  comprador_identidade: string | null
  comprador_data_nasc: string | null
  comprador_estado_civil: string | null
  comprador_profissao: string | null
  comprador_endereco: string | null
  comprador_numero: string | null
  comprador_bairro: string | null
  comprador_cep: string | null
  comprador_cidade: string | null
  comprador_uf: string | null
  comprador_telefone: string | null
  comprador_email: string | null
  valor_venda: number
  desconto: number
  valor_liquido: number
  pagamento_dinheiro: number
  pagamento_cheque1_banco: string | null
  pagamento_cheque1_data: string | null
  pagamento_cheque1_valor: number
  pagamento_cheque2_banco: string | null
  pagamento_cheque2_data: string | null
  pagamento_cheque2_valor: number
  pagamento_duplicata1_banco: string | null
  pagamento_duplicata1_data: string | null
  pagamento_duplicata1_valor: number
  pagamento_duplicata2_banco: string | null
  pagamento_duplicata2_data: string | null
  pagamento_duplicata2_valor: number
  pagamento_financeira_nome: string | null
  pagamento_financeira_valor: number
  pagamento_outros_desc: string | null
  pagamento_outros_valor: number
  origem: string | null
  numero_fiscal: string | null
  inscricao_estadual: string | null
  hodometro_venda: number | null
  observacoes: string | null
  documentos_urls: string[]
  status: VendaStatus
  created_at: string
  veiculo?: Pick<Veiculo, 'id' | 'marca' | 'modelo' | 'ano' | 'fotos' | 'preco' | 'placa' | 'cor' | 'km' | 'cambio' | 'combustivel' | 'versao'> | null
  vendedor?: Pick<UsuarioPerfil, 'nome'> | null
}
