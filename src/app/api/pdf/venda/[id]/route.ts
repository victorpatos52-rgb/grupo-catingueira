import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase-server'

function fmt(v: number | null | undefined) {
  if (!v) return ''
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(s: string | null | undefined) {
  if (!s) return ''
  const [y, m, d] = s.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

function fmtKm(v: number | null | undefined) {
  if (!v) return ''
  return v.toLocaleString('pt-BR') + ' km'
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = adminSupabase()

  const { data: venda, error } = await supabase
    .from('vendas')
    .select('*, veiculo:veiculos(id,marca,modelo,ano,fotos,preco,placa,cor,km,cambio,combustivel,versao,chassi,renavam,tipo,portas,hodometro_venda), vendedor:usuarios_perfil(nome)')
    .eq('id', id)
    .single()

  if (error || !venda) {
    return new NextResponse('Venda não encontrada', { status: 404 })
  }

  const { data: lojaData } = await supabase
    .from('lojas')
    .select('*')
    .eq('id', venda.loja_id)
    .single()

  const loja = lojaData ?? { nome: '', endereco: '', whatsapp: '' }
  const v = venda.veiculo ?? {}
  const nomeLoja = (loja.nome ?? '').toLowerCase()
  const logoUrl = nomeLoja.includes('catingueira')
    ? 'https://grupo-catingueira.vercel.app/logo-catingueira.png'
    : 'https://felizardo-veiculos.vercel.app/logo-felizardo.png'

  const css = `
    <style>
      @page { size: A4 portrait; margin: 15mm }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 0; }
      .page-break { page-break-before: always; }
      .logo { width: 100%; max-height: 80px; object-fit: contain; margin-bottom: 8px; }
      .titulo { font-size: 22px; font-weight: bold; text-align: center; margin: 12px 0; text-transform: uppercase; letter-spacing: 1px; }
      .subtitulo { font-size: 16px; font-weight: bold; text-align: center; margin: 8px 0; border-bottom: 2px solid #000; padding-bottom: 6px; }
      .linha { border-bottom: 1px solid #000; margin: 6px 0; padding-bottom: 4px; }
      .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .campo { margin-bottom: 8px; }
      .campo label { font-size: 10px; font-weight: bold; display: block; text-transform: uppercase; color: #555; }
      .campo span { display: block; border-bottom: 1px solid #000; min-height: 18px; font-size: 12px; padding: 1px 2px; }
      .assinatura { margin-top: 40px; border-top: 1px solid #000; text-align: center; font-size: 11px; padding-top: 4px; }
      .rodape { margin-top: 20px; border-top: 2px solid #000; padding-top: 8px; font-size: 10px; text-align: center; color: #333; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0; }
      td, th { border: 1px solid #000; padding: 4px 6px; font-size: 11px; }
      th { background: #f0f0f0; font-weight: bold; text-align: left; }
      .grid-assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; }
      button.imprimir { position: fixed; bottom: 20px; right: 20px; background: #000; color: #fff; border: none; padding: 12px 24px; font-size: 16px; cursor: pointer; border-radius: 4px; z-index: 999; }
      @media print { button.imprimir { display: none; } }
      p { margin: 4px 0; line-height: 1.5; }
    </style>
  `

  const rodape = `
    <div class="rodape">
      ${loja.nome} — ${loja.endereco ?? ''} | WhatsApp: ${loja.whatsapp ?? ''}
    </div>
  `

  // ── Documento 1: Carro Vendido ─────────────────────────────────────────────
  const doc1 = `
    <div>
      <img class="logo" src="${logoUrl}" alt="${loja.nome}" />
      <div class="titulo">Carro Vendido</div>

      <table>
        <tr>
          <th>NEG.º</th><td>${venda.numero_negociacao ?? ''}</td>
          <th>VEND.</th><td>${venda.vendedor?.nome ?? ''}</td>
          <th>Data Venda</th><td>${fmtData(venda.data_venda)}</td>
        </tr>
        <tr>
          <th>CNPJ/CPF</th><td>${venda.comprador_cpf ?? ''}</td>
          <th>IDENTIDADE</th><td>${venda.comprador_identidade ?? ''}</td>
          <th>Data Nasc.</th><td>${fmtData(venda.comprador_data_nasc)}</td>
        </tr>
        <tr>
          <th>Est. Civil</th><td>${venda.comprador_estado_civil ?? ''}</td>
          <th>N. FISCAL</th><td>${venda.numero_fiscal ?? ''}</td>
          <th>INSC. EST.</th><td>${venda.inscricao_estadual ?? ''}</td>
        </tr>
        <tr>
          <th>Origem</th><td colspan="5">${venda.origem ?? ''}</td>
        </tr>
      </table>

      <div class="campo"><label>Nome</label><span>${venda.comprador_nome}</span></div>
      <div class="grid2">
        <div class="campo"><label>Prof.</label><span>${venda.comprador_profissao ?? ''}</span></div>
        <div class="campo"><label>Hodômetro na entrega</label><span>${venda.hodometro_venda ? fmtKm(venda.hodometro_venda) : ''}</span></div>
      </div>
      <div class="grid2">
        <div class="campo"><label>E-mail</label><span>${venda.comprador_email ?? ''}</span></div>
        <div class="campo"><label>Tels.</label><span>${venda.comprador_telefone ?? ''}</span></div>
      </div>
      <div class="campo"><label>Endereço</label><span>${venda.comprador_endereco ?? ''}, ${venda.comprador_numero ?? '___'} - ${venda.comprador_bairro ?? '___'}</span></div>
      <div class="grid2">
        <div class="campo"><label>Cidade</label><span>${venda.comprador_cidade ?? ''}</span></div>
        <div class="campo"><label>UF / CEP</label><span>${venda.comprador_uf ?? ''} / ${venda.comprador_cep ?? ''}</span></div>
      </div>

      <table>
        <tr>
          <th>Veículo</th><td colspan="3">${v.marca ?? ''} ${v.modelo ?? ''}</td>
          <th>Modelo</th><td>${v.versao ?? ''}</td>
        </tr>
        <tr>
          <th>Tipos</th><td>${v.tipo ?? '___'}</td>
          <th>Portas</th><td>${v.portas ?? '___'}</td>
          <th>Cor</th><td>${v.cor ?? ''}</td>
        </tr>
        <tr>
          <th>Ano/Fab</th><td>${v.ano ?? ''}</td>
          <th>Ano/Mod</th><td>${v.ano ?? ''}</td>
          <th>Chassi</th><td>${v.chassi ?? '___'}</td>
        </tr>
        <tr>
          <th>Km</th><td>${fmtKm(v.km)}</td>
          <th>Placa</th><td>${v.placa ?? ''}</td>
          <th>Renavam</th><td>${v.renavam ?? '___'}</td>
        </tr>
      </table>

      <table>
        <tr><th>Forma</th><th>Detalhes</th><th style="text-align:right">Valor</th></tr>
        <tr><td>Recebido</td><td></td><td style="text-align:right">${fmt(venda.valor_venda)}</td></tr>
        ${venda.pagamento_dinheiro > 0 ? `<tr><td>Dinheiro</td><td></td><td style="text-align:right">${fmt(venda.pagamento_dinheiro)}</td></tr>` : ''}
        ${venda.pagamento_cheque1_valor > 0 ? `<tr><td>Cheque</td><td>${venda.pagamento_cheque1_banco ?? ''} — ${fmtData(venda.pagamento_cheque1_data)}</td><td style="text-align:right">${fmt(venda.pagamento_cheque1_valor)}</td></tr>` : ''}
        ${venda.pagamento_cheque2_valor > 0 ? `<tr><td>Cheque</td><td>${venda.pagamento_cheque2_banco ?? ''} — ${fmtData(venda.pagamento_cheque2_data)}</td><td style="text-align:right">${fmt(venda.pagamento_cheque2_valor)}</td></tr>` : ''}
        ${venda.pagamento_duplicata1_valor > 0 ? `<tr><td>Duplicata</td><td>${venda.pagamento_duplicata1_banco ?? ''} — ${fmtData(venda.pagamento_duplicata1_data)}</td><td style="text-align:right">${fmt(venda.pagamento_duplicata1_valor)}</td></tr>` : ''}
        ${venda.pagamento_duplicata2_valor > 0 ? `<tr><td>Duplicata</td><td>${venda.pagamento_duplicata2_banco ?? ''} — ${fmtData(venda.pagamento_duplicata2_data)}</td><td style="text-align:right">${fmt(venda.pagamento_duplicata2_valor)}</td></tr>` : ''}
        ${venda.pagamento_financeira_valor > 0 ? `<tr><td>Financeira/Consórcio</td><td>${venda.pagamento_financeira_nome ?? ''}</td><td style="text-align:right">${fmt(venda.pagamento_financeira_valor)}</td></tr>` : ''}
        ${venda.pagamento_outros_valor > 0 ? `<tr><td>Outros</td><td>${venda.pagamento_outros_desc ?? ''}</td><td style="text-align:right">${fmt(venda.pagamento_outros_valor)}</td></tr>` : ''}
        <tr>
          <td><strong>Desc.</strong> ${fmt(venda.desconto)}</td>
          <td><strong>Líquido</strong> ${fmt(venda.valor_liquido)}</td>
          <td style="text-align:right"><strong>TOTAL R$</strong> ${fmt(venda.valor_venda)}</td>
        </tr>
      </table>

      ${venda.observacoes ? `<p><strong>OBS.:</strong> ${venda.observacoes}</p>` : ''}

      <div class="assinatura">Assinatura do Comprador</div>
      ${rodape}
    </div>
  `

  // ── Documento 2: Dados do Comprador ────────────────────────────────────────
  const doc2 = `
    <div class="page-break">
      <div class="titulo">Dados do Comprador</div>
      <div style="border-top:3px double #000;border-bottom:3px double #000;padding:4px 0;margin-bottom:16px;"></div>

      <div class="campo"><label>Nome do Comprador</label><span>${venda.comprador_nome}</span></div>
      <div class="campo"><label>Endereço</label><span>${venda.comprador_endereco ?? ''}, ${venda.comprador_numero ?? '___'} - ${venda.comprador_bairro ?? '___'}</span></div>
      <div class="grid2">
        <div class="campo"><label>Cidade</label><span>${venda.comprador_cidade ?? ''}</span></div>
        <div class="campo"><label>UF</label><span>${venda.comprador_uf ?? ''}</span></div>
      </div>
      <div class="campo"><label>CEP</label><span>${venda.comprador_cep ?? ''}</span></div>
      <div class="grid2">
        <div class="campo"><label>C.P.F.</label><span>${venda.comprador_cpf ?? ''}</span></div>
        <div class="campo"><label>RG</label><span>${venda.comprador_rg ?? ''}</span></div>
      </div>
      <div class="grid2">
        <div class="campo"><label>Data nasc.</label><span>${fmtData(venda.comprador_data_nasc)}</span></div>
        <div class="campo"><label>Est. Civil</label><span>
          ${venda.comprador_estado_civil === 'Solteiro' ? '(X) Solteiro &nbsp;&nbsp; ( ) Casado' : venda.comprador_estado_civil === 'Casado' ? '( ) Solteiro &nbsp;&nbsp; (X) Casado' : '( ) Solteiro &nbsp;&nbsp; ( ) Casado'}
        </span></div>
      </div>
      <div class="grid2">
        <div class="campo"><label>Data de compra</label><span>${fmtData(venda.data_venda)}</span></div>
        <div class="campo"><label>Vendedor</label><span>${venda.vendedor?.nome ?? ''}</span></div>
      </div>
      <div class="campo"><label>Fone / E-mail</label><span>${venda.comprador_telefone ?? ''} / ${venda.comprador_email ?? ''}</span></div>

      <div style="margin-top:60px;">
        <div class="assinatura">Assinatura do Comprador</div>
      </div>
    </div>
  `

  // ── Documento 3: Certificado de Garantia ──────────────────────────────────
  const doc3 = `
    <div class="page-break">
      <img class="logo" src="${logoUrl}" alt="${loja.nome}" />
      <div class="titulo">Certificado de Garantia</div>

      <p>EU, <strong>${venda.comprador_nome}</strong>, Portador do CPF ou CNPJ: <strong>${venda.comprador_cpf ?? '_______________'}</strong>,</p>
      <p>Com domicílio a Rua: ${venda.comprador_endereco ?? '_______________'} Nº ${venda.comprador_numero ?? '___'} Bairro: ${venda.comprador_bairro ?? '___'}</p>
      <p>Cidade: ${venda.comprador_cidade ?? '_______________'} UF: ${venda.comprador_uf ?? '___'} CEP: ${venda.comprador_cep ?? '_______________'} Tel.:( ) ${venda.comprador_telefone ?? '_______________'}</p>

      <p style="margin-top:12px;font-weight:bold;text-align:center;">COMPREI O SEGUINTE VEÍCULO ABAIXO:</p>

      <p>Veículo: <strong>${v.marca ?? ''} ${v.modelo ?? ''}</strong> Marca: ${v.marca ?? '___'} Tipos: ${v.tipo ?? '___'} Portas: ${v.portas ?? '___'}</p>
      <p>Chassi: ${v.chassi ?? '___'} Ano/Mod.: ${v.ano ?? '___'} Ano/Fab.: ${v.ano ?? '___'} Cor: ${v.cor ?? '___'}</p>
      <p>Placa: ${v.placa ?? '___'} UF: ___ Renavam: ${v.renavam ?? '___'} Hora: ___ Km: ${venda.hodometro_venda ? fmtKm(venda.hodometro_venda) : fmtKm(v.km)}</p>

      <p style="margin-top:12px;">O qual tem a <strong>GARANTIA DE MOTOR E CÂMBIO</strong> contra defeitos resultantes de vício oculto ou que não possam ser identificados em procedimentos normais de revisão, pelo prazo <strong>90 (noventa) dias ou 5.000 (cinco mil) quilômetros</strong>. Vendendo-se pelo que ocorre primeiro.</p>

      <p style="margin-top:12px;font-weight:bold;">CONDIÇÕES GERAIS:</p>
      <p>Esta GARANTIA perde o seu valor:</p>
      <p>1 – Se o defeito eventualmente reclamado for resultante de abuso, imperícia ou uso inadequado do veículo.</p>
      <p>2 – Se o veículo tiver o seu velocímetro quebrado ou seus lacres violados.</p>
      <p>3 – Se as peças eventualmente reclamadas tiverem seu desgaste do seu uso normal de veículo.</p>
      <p>4 – Se durante o período da GARANTIA o COMPRADOR executar serviço de manutenção no veículo em oficina não autorizada pelo VENDEDOR.</p>

      <p style="margin-top:8px;"><strong>OBS:</strong> NÃO DAMOS GARANTIA: Parte elétrica em geral, ar-condicionado, freios, suspensão, embreagem, bomba de gasolina, velas, correias, bateria, som, escapamento, enfim, todas as peças que não pertençam ao motor e câmbio.</p>

      <p style="margin-top:12px;font-weight:bold;">DECLARAÇÃO DO COMPRADOR:</p>
      <p>Declaro que examinarei o veículo adquirido nesta data e que se encontra em perfeita condição de uso e que recebo sem quaisquer ressalvas ou restrições.</p>
      <p>Declaro ainda, que foram devidamente explicadas as condições de garantia constantes neste documento, com as quais concordo plenamente.</p>
      <p>Declaro finalmente que fui completamente orientado quanto aos cuidados com o uso e manutenção do veículo adquirido.</p>

      <p style="margin-top:12px;font-weight:bold;">VERIFICAÇÃO DE ENTREGA: Assinale SIM ou NÃO</p>
      <p>Macaco ( ) &nbsp; Triângulo ( ) &nbsp; Extintor ( ) &nbsp; Chave de Roda ( ) &nbsp; Pneus de Suporte ( ) &nbsp; CRLV em Dias ( )</p>
      <p>Manual ( ) &nbsp; Cópia de Chave ( ) &nbsp; Nada Consta ( ) &nbsp; Quitação ( ) &nbsp; CRV Recibo ( )</p>
      <p>Obs: _______________________________________________</p>

      <p style="margin-top:16px;">Patos, ___ / ___ / ___</p>

      <div class="grid-assinaturas">
        <div class="assinatura">${loja.nome}</div>
        <div class="assinatura">Assinatura do Comprador</div>
      </div>
      ${rodape}
    </div>
  `

  // ── Documento 4: Termo de Responsabilidade ────────────────────────────────
  const doc4 = `
    <div class="page-break">
      <img class="logo" src="${logoUrl}" alt="${loja.nome}" />
      <div class="titulo">Termo de Responsabilidade</div>

      <p>Pelo presente instrumento particular em conformidade com a Lei da Legislação Pertinente, EU, _______________, Portador do CPF ou CNPJ _______________</p>
      <p>Identidade _______________ Residente na Rua: _______________ Nº ___</p>
      <p>Bairro: _______________ Cidade: _______________ UF: ___ CEP: ___</p>
      <p>Tel.: ( ) _______________ / _______________ DECLARO para todos os efeitos Legais, Civis e Criminais, assumindo inteira responsabilidade, judicial e Extra-judicial sobre o veículo abaixo:</p>

      <p style="margin-top:8px;">Veículo: _______________ Marca: _______________ Tipos: _______________ Portas: ___</p>
      <p>Chassi: _______________ Ano/Mod.: ___ Ano/Fab.: ___ Cor: _______________</p>
      <p>Placa: _______________ UF: ___ Renavam: _______________ Hora: _______________ Km: _______________</p>
      <p>Registrado em nome de _______________, que nesta data estou vendendo a <strong>${loja.nome}</strong>, encontra-se até a presente data, livre e desembaraçado de todo e qualquer ônus financeiro, fiscal, gravame legal ou processo judicial que por ventura possam incidir sobre o mesmo.</p>

      <p style="margin-top:8px;">1 - Assumirei a responsabilidade pela autenticidade de toda a documentação e consultas do veiculo junto ao DETRAN e ORGÃOS COMPETENTES, na qual confirmo as informações contidas nestas consultas, principalmente quanto à procedência licita do MOTOR instalado no veiculo de minha propriedade.</p>

      <p style="margin-top:8px;font-weight:bold;">VERIFICAÇÃO DE ENTREGA: Assinale SIM ou NÃO</p>
      <p>Macaco ( ) &nbsp; Triângulo ( ) &nbsp; Extintor ( ) &nbsp; Chave de Roda ( ) &nbsp; Pneus de Suporte ( ) &nbsp; CRLV em Dias ( )</p>
      <p>Manual ( ) &nbsp; Cópia de Chave ( ) &nbsp; Nada Consta ( ) &nbsp; Quitação ( ) &nbsp; CRV Recibo ( )</p>
      <p>Obs: _______________________________________________</p>

      <p style="margin-top:8px;">2 - Autorizo a empresa <strong>${loja.nome}</strong>, a pagar todas as multas e acréscimos legais que possam existir até a presente data, sobre o referido veículo por mim vendido a mesma. Independente de verificação aos órgãos competentes ou não. Sendo de minha inteira responsabilidade reembolsá-la imediatamente após o pagamento nas mesmas condições.</p>

      <p style="margin-top:8px;">3 - Caso o veículo encontrar-se em desconformidade com as declarações estabelecidas, fica desde já facultado a <strong>${loja.nome}</strong>, ao seu livre arbítrio, desfazer o negócio realizado e rescindir o contrato de compra e venda firmado independentemente de notificação judicial ou extra-judicial, obrigando-me a ressarci-la por eventuais perdas e danos ocasionados, bem como pelo lucro que deixou de auferir em decorrência de desfazimento do negócio.</p>

      <p style="margin-top:16px;">Patos, ___ / ___ / ___</p>

      <div class="grid-assinaturas">
        <div class="assinatura">${loja.nome}</div>
        <div class="assinatura">Assinatura do Declarante</div>
      </div>
      ${rodape}
    </div>
  `

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Documentos de Venda — ${venda.comprador_nome}</title>
  ${css}
</head>
<body>
  ${doc1}
  ${doc2}
  ${doc3}
  ${doc4}
  <button class="imprimir" onclick="window.print()">🖨️ Imprimir</button>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
