import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { FinanceiroVeiculo } from '@/types'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatarPreco(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

export function formatarKm(km: number): string {
  return new Intl.NumberFormat('pt-BR').format(km) + ' km'
}

export function calcularLucro(financeiro: FinanceiroVeiculo): {
  custo_total: number
  lucro_bruto: number
  lucro_liquido: number
  margem_percentual: number
} {
  const extras = financeiro.custos_adicionais.reduce((acc, c) => acc + c.valor, 0)
  const custo_total = financeiro.custo_aquisicao + extras
  const preco_venda = financeiro.preco_venda ?? 0
  const lucro_bruto = preco_venda - custo_total
  const lucro_liquido = lucro_bruto
  const margem_percentual = preco_venda > 0 ? (lucro_bruto / preco_venda) * 100 : 0

  return { custo_total, lucro_bruto, lucro_liquido, margem_percentual }
}

export function calcularDiasEstoque(data_aquisicao: string, data_venda?: string | null): number {
  const inicio = new Date(data_aquisicao)
  const fim = data_venda ? new Date(data_venda) : new Date()
  return Math.floor((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
}
