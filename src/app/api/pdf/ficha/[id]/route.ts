import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function formatarPreco(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarKm(v: number) {
  return v.toLocaleString('pt-BR') + ' km'
}

const PDF_OPCIONAIS: { label: string; dbKeys: string[] }[] = [
  { label: 'AR CONDICIONADO', dbKeys: ['Ar-condicionado'] },
  { label: 'DIREÇÃO HIDRÁULICA', dbKeys: ['Direção hidráulica', 'Direção elétrica'] },
  { label: 'VIDROS ELÉTRICOS', dbKeys: ['Vidro elétrico'] },
  { label: 'TRAVA ELÉTRICA', dbKeys: ['Trava elétrica'] },
  { label: 'ALARME', dbKeys: ['Alarme'] },
  { label: 'RETROVISOR ELÉTRICO', dbKeys: [] },
  { label: 'SOM USB e BTF', dbKeys: ['Bluetooth', 'Central multimídia'] },
  { label: 'AIRBAG e ABS', dbKeys: ['Airbag', 'ABS'] },
  { label: 'CONTROLE SOM VOLANTE', dbKeys: [] },
  { label: 'RODAS DE LIGA LEVE', dbKeys: ['Rodas de liga leve'] },
  { label: 'SENSOR ESTACIONAR', dbKeys: ['Sensor de ré', 'Câmera de ré'] },
  { label: 'CÂMBIO AUTOMÁTICO', dbKeys: [] },
  { label: 'BANCOS COURO', dbKeys: ['Bancos de couro'] },
  { label: 'REGULAGEM DO VOLANTE', dbKeys: [] },
  { label: 'FARÓIS DE NEBLINA', dbKeys: ['Farol de milha', 'Farol LED'] },
  { label: 'PINTURA METÁLICA', dbKeys: [] },
  { label: 'LIMP. e DES. TRASEIRO', dbKeys: [] },
  { label: 'PROTETOR DE CAÇAMBA', dbKeys: [] },
  { label: 'CAPOTA MARÍTIMA / FIBRA', dbKeys: [] },
  { label: 'PERSONALIZAÇÃO', dbKeys: [] },
]

function isOpcionalAtivo(
  opcionalVeiculo: string[],
  item: { label: string; dbKeys: string[] },
  cambio: string
): boolean {
  if (item.label === 'CÂMBIO AUTOMÁTICO') {
    return cambio.toLowerCase().includes('automático') || cambio.toLowerCase().includes('cvt')
  }
  return item.dbKeys.some(key => opcionalVeiculo.includes(key))
}

function renderOpcionais(opcionaisVeiculo: string[], cambio: string): string {
  const metade = Math.ceil(PDF_OPCIONAIS.length / 2)
  const col1 = PDF_OPCIONAIS.slice(0, metade)
  const col2 = PDF_OPCIONAIS.slice(metade)

  const renderItem = (item: { label: string; dbKeys: string[] }) => {
    const marcado = isOpcionalAtivo(opcionaisVeiculo, item, cambio)
    return `<div style="margin-bottom:4px;font-size:11px">${marcado ? '(X)' : '( )'} ${item.label}</div>`
  }

  return `
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="width:50%;vertical-align:top;padding-right:16px">
          ${col1.map(renderItem).join('')}
        </td>
        <td style="width:50%;vertical-align:top">
          ${col2.map(renderItem).join('')}
        </td>
      </tr>
    </table>
  `
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = adminSupabase()

  const { data: veiculo } = await supabase
    .from('veiculos')
    .select('*, loja:lojas(*)')
    .eq('id', id)
    .single()

  if (!veiculo) {
    return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
  }

  const loja = veiculo.loja as {
    nome: string
    whatsapp: string
    endereco: string | null
    cidade: string | null
    estado: string | null
  }

  const opcionaisVeiculo: string[] = veiculo.opcionais ?? []

  const nomeGrid = [
    { label: 'MODELO', valor: `${veiculo.marca} ${veiculo.modelo}` },
    { label: 'COR', valor: veiculo.cor },
    { label: 'ANO/FAB', valor: String(veiculo.ano) },
    { label: 'ANO/MOD', valor: String(veiculo.ano) },
    { label: 'COMBUSTÍVEL', valor: veiculo.combustivel },
    { label: 'KM', valor: formatarKm(veiculo.km) },
    { label: 'MOTOR', valor: veiculo.versao ?? '—' },
  ]

  const enderecoLoja = [loja.endereco, loja.cidade, loja.estado].filter(Boolean).join(' — ')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Ficha — ${veiculo.marca} ${veiculo.modelo}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: Arial, Helvetica, sans-serif;
  color: #000;
  background: #fff;
  padding: 20px 28px;
  max-width: 210mm;
  margin: 0 auto;
  font-size: 12px;
}
.placa-wrapper {
  text-align: center;
  margin-bottom: 6px;
}
.placa {
  display: inline-block;
  border: 3px solid #000;
  padding: 4px;
}
.placa-inner {
  border: 1px solid #000;
  padding: 8px 32px;
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.slogan {
  text-align: center;
  font-style: italic;
  font-size: 11px;
  color: #333;
  margin-bottom: 10px;
}
.sep-duplo {
  border: none;
  border-top: 3px solid #000;
  margin-bottom: 3px;
}
.sep-duplo2 {
  border: none;
  border-top: 1px solid #000;
  margin-bottom: 10px;
}
.carro-titulo {
  font-size: 22px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 10px;
}
.secao-titulo {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-bottom: 1px solid #000;
  margin-bottom: 6px;
  padding-bottom: 2px;
}
.grid-specs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 16px;
  margin-bottom: 12px;
}
.spec-item {
  border: 1px solid #ccc;
  padding: 4px 8px;
}
.spec-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #555;
}
.spec-valor {
  font-size: 13px;
  font-weight: 600;
}
.preco {
  text-align: center;
  font-size: 52px;
  font-weight: 900;
  letter-spacing: -1px;
  margin: 12px 0 8px;
  line-height: 1;
}
.pagamento {
  font-size: 11px;
  text-align: center;
  margin-bottom: 16px;
  line-height: 1.6;
}
.rodape {
  border-top: 2px solid #000;
  padding-top: 6px;
  margin-top: 8px;
  font-size: 10px;
  display: flex;
  justify-content: space-between;
}
@media print {
  body { padding: 10px 16px; }
  @page { size: A4; margin: 10mm; }
}
</style>
</head>
<body>

<div class="placa-wrapper">
  <div class="placa">
    <div class="placa-inner">${loja.nome.toUpperCase()}</div>
  </div>
</div>
<div class="slogan">${enderecoLoja || loja.whatsapp}</div>

<hr class="sep-duplo"/>
<hr class="sep-duplo2"/>

<div class="carro-titulo">CARRO: ${veiculo.marca.toUpperCase()} ${veiculo.modelo.toUpperCase()}</div>

<div class="secao-titulo">Especificações</div>
<div class="grid-specs">
  ${nomeGrid.map(item => `
    <div class="spec-item">
      <div class="spec-label">${item.label}</div>
      <div class="spec-valor">${item.valor}</div>
    </div>
  `).join('')}
</div>

<div class="secao-titulo">Opcionais</div>
${renderOpcionais(opcionaisVeiculo, veiculo.cambio)}

<hr class="sep-duplo" style="margin-top:12px"/>
<hr class="sep-duplo2"/>

<div class="preco">${formatarPreco(veiculo.preco)}</div>

<div class="pagamento">
  <strong>FORMA DE PAGAMENTO:</strong> A VISTA, PIX, FINANCIAMENTO E CONSÓRCIO<br/>
  <strong>TROCA EM VEÍCULO:</strong> CARRO E MOTO
</div>

<div class="rodape">
  <div>
    <strong>${loja.nome.toUpperCase()}</strong><br/>
    ${enderecoLoja}
  </div>
  <div style="text-align:right">
    WhatsApp: ${loja.whatsapp}
  </div>
</div>

</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
