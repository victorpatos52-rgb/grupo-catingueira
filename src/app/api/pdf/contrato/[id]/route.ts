import { NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase-server'
import { obterPerfilDaSessao, temAcessoLoja } from '@/lib/acesso'

function formatarPreco(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const perfil = await obterPerfilDaSessao()
  if (!perfil) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const supabase = adminSupabase()

  const { data: veiculo } = await supabase
    .from('veiculos')
    .select('*, loja:lojas(*)')
    .eq('id', id)
    .single()

  if (!veiculo) {
    return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
  }
  // Mesma regra da ficha: acesso à loja do veículo; sócio só em veículo de
  // propriedade dividida (validarVeiculoParaSocio em actions.ts).
  if (
    !temAcessoLoja(perfil, veiculo.loja_id) ||
    (perfil.perfil === 'socio' && veiculo.proprietario_tipo !== 'dividido')
  ) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const loja = veiculo.loja as { nome: string; whatsapp: string; endereco: string | null; cnpj?: string }

  const hoje = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Contrato de Compra e Venda</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#111;background:#fff;padding:40px;max-width:800px;margin:0 auto;font-size:13px;line-height:1.7}
h1{font-size:18px;font-weight:900;text-transform:uppercase;text-align:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:24px}
h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:20px 0 8px}
.field{border-bottom:1px solid #ccc;min-height:22px;margin-bottom:12px;padding:2px 4px;display:flex;align-items:flex-end}
.field label{font-size:10px;text-transform:uppercase;color:#888;margin-right:8px;white-space:nowrap}
.field span{font-size:13px;font-weight:600}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.clausulas{margin-top:24px}
.clausulas p{margin-bottom:10px;text-align:justify}
.assinaturas{margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
.assinatura{border-top:1px solid #111;padding-top:8px;text-align:center;font-size:12px}
.header-loja{text-align:center;margin-bottom:32px}
.header-loja .nome{font-size:20px;font-weight:900;text-transform:uppercase}
.header-loja .info{color:#888;font-size:12px}
@media print{body{padding:20px}}
</style>
</head>
<body>

<div class="header-loja">
  <div class="nome">${loja.nome}</div>
  <div class="info">${loja.endereco ?? ''} | WhatsApp: ${loja.whatsapp}</div>
</div>

<h1>Contrato Particular de Compra e Venda de Veículo</h1>

<h2>I — Vendedor</h2>
<div class="field"><label>Empresa:</label><span>${loja.nome}</span></div>
<div class="grid-2">
  <div class="field"><label>CNPJ:</label><span>${loja.cnpj ?? '____________________'}</span></div>
  <div class="field"><label>Telefone:</label><span>${loja.whatsapp}</span></div>
</div>
<div class="field"><label>Endereço:</label><span>${loja.endereco ?? '______________________________________'}</span></div>

<h2>II — Comprador</h2>
<div class="field"><label>Nome:</label><span>_____________________________________________</span></div>
<div class="grid-2">
  <div class="field"><label>CPF:</label><span>________________________</span></div>
  <div class="field"><label>RG:</label><span>_____________________</span></div>
</div>
<div class="field"><label>Endereço:</label><span>____________________________________________</span></div>
<div class="grid-2">
  <div class="field"><label>Cidade:</label><span>____________________</span></div>
  <div class="field"><label>Telefone:</label><span>___________________</span></div>
</div>

<h2>III — Veículo</h2>
<div class="grid-2">
  <div class="field"><label>Marca / Modelo:</label><span>${veiculo.marca} ${veiculo.modelo}</span></div>
  <div class="field"><label>Versão:</label><span>${veiculo.versao ?? '—'}</span></div>
  <div class="field"><label>Ano:</label><span>${veiculo.ano}</span></div>
  <div class="field"><label>Cor:</label><span>${veiculo.cor}</span></div>
  <div class="field"><label>Placa:</label><span>${veiculo.placa ?? '_____________'}</span></div>
  <div class="field"><label>KM:</label><span>${veiculo.km.toLocaleString('pt-BR')}</span></div>
  <div class="field"><label>Chassi:</label><span>_____________________</span></div>
  <div class="field"><label>RENAVAM:</label><span>_____________________</span></div>
</div>

<h2>IV — Condições de Pagamento</h2>
<div class="field"><label>Valor total:</label><span>${formatarPreco(veiculo.preco)}</span></div>
<div class="grid-2">
  <div class="field"><label>Forma de pagamento:</label><span>________________</span></div>
  <div class="field"><label>Entrada:</label><span>________________________</span></div>
</div>
<div class="field"><label>Parcelas / Financiamento:</label><span>___________________________________________</span></div>

<div class="clausulas">
<h2>V — Cláusulas</h2>
<p><strong>1.</strong> O VENDEDOR declara que o veículo descrito é de sua propriedade, livre de ônus, penhoras, multas e débitos de qualquer natureza, exceto os informados acima.</p>
<p><strong>2.</strong> O COMPRADOR declara ter inspecionado o veículo e estar de pleno acordo com suas condições gerais, aceitando-o no estado em que se encontra.</p>
<p><strong>3.</strong> A transferência de propriedade junto ao DETRAN é de responsabilidade do COMPRADOR, a ser efetuada no prazo legal.</p>
<p><strong>4.</strong> As partes elegem o foro da comarca de ${loja.endereco?.split(',').pop()?.trim() ?? 'Patos/PB'} para dirimir eventuais litígios.</p>
</div>

<p style="margin-top:24px;text-align:center;color:#888;font-size:12px">${loja.endereco ?? ''}, ${hoje}</p>

<div class="assinaturas">
  <div class="assinatura">
    <div>VENDEDOR</div>
    <div style="color:#888">${loja.nome}</div>
  </div>
  <div class="assinatura">
    <div>COMPRADOR</div>
    <div style="color:#888">Nome: ______________________</div>
  </div>
</div>

<div class="assinaturas" style="margin-top:24px">
  <div class="assinatura"><div>TESTEMUNHA 1</div><div style="color:#888">CPF: ___________________</div></div>
  <div class="assinatura"><div>TESTEMUNHA 2</div><div style="color:#888">CPF: ___________________</div></div>
</div>

<script>window.onload=()=>window.print()</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
