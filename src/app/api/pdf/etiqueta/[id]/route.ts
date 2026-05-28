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
    dominio: string
    cor_primaria: string
  }

  const veiculoUrl = `https://${loja.dominio}/veiculo/${id}`
  const corPrimaria = loja.cor_primaria ?? '#111111'

  let qrSvg = ''
  try {
    const QRCode = (await import('qrcode')).default
    qrSvg = await QRCode.toString(veiculoUrl, { type: 'svg', width: 72, margin: 0 })
  } catch {
    qrSvg = ''
  }

  const opcionaisExibir = (veiculo.opcionais as string[] ?? []).slice(0, 6)

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Etiqueta — ${veiculo.marca} ${veiculo.modelo}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: 105mm;
  height: 148mm;
  font-family: Arial, Helvetica, sans-serif;
  background: #fff;
  color: #111;
  font-size: 10px;
}
.etiqueta {
  width: 105mm;
  height: 148mm;
  border: 1.5px solid #111;
  padding: 5mm;
  display: flex;
  flex-direction: column;
  gap: 3mm;
  overflow: hidden;
}
.loja-nome {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #555;
  border-bottom: 1px solid #eee;
  padding-bottom: 2mm;
}
.carro-marca {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #888;
  margin-bottom: 1mm;
}
.carro-modelo {
  font-size: 20px;
  font-weight: 900;
  text-transform: uppercase;
  line-height: 1.05;
  color: #111;
}
.carro-versao {
  font-size: 10px;
  color: #555;
  margin-top: 1mm;
}
.preco {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: -0.5px;
  line-height: 1;
  color: ${corPrimaria};
}
.specs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5mm;
}
.spec-item {
  border: 1px solid #ddd;
  border-radius: 2mm;
  padding: 1.5mm 2mm;
}
.spec-label {
  font-size: 7px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #999;
  margin-bottom: 0.5mm;
}
.spec-valor {
  font-size: 11px;
  font-weight: 700;
  color: #111;
}
.opcionais {
  flex: 1;
}
.opcionais-titulo {
  font-size: 7px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #999;
  margin-bottom: 1.5mm;
}
.opcionais-lista {
  display: flex;
  flex-wrap: wrap;
  gap: 1mm;
}
.opcional-tag {
  font-size: 8px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 2mm;
  padding: 1mm 2mm;
  color: #374151;
  font-weight: 600;
}
.rodape {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #eee;
  padding-top: 2mm;
  gap: 2mm;
}
.rodape-wa {
  flex: 1;
}
.wa-label {
  font-size: 7px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.wa-numero {
  font-size: 11px;
  font-weight: 900;
  color: #111;
}
.qr-box {
  width: 18mm;
  height: 18mm;
  flex-shrink: 0;
}
.qr-box svg {
  width: 100%;
  height: 100%;
}
@media print {
  html, body { margin: 0; padding: 0; }
  .etiqueta { border: 1.5px solid #111; }
  @page {
    size: A6;
    margin: 0;
  }
}
</style>
</head>
<body>
<div class="etiqueta">

  <div class="loja-nome">${loja.nome.toUpperCase()}</div>

  <div>
    <div class="carro-marca">${veiculo.marca.toUpperCase()}</div>
    <div class="carro-modelo">${veiculo.modelo.toUpperCase()}</div>
    <div class="carro-versao">${[veiculo.versao, veiculo.ano].filter(Boolean).join(' · ')}</div>
  </div>

  <div class="preco">${formatarPreco(veiculo.preco)}</div>

  <div class="specs-grid">
    <div class="spec-item">
      <div class="spec-label">KM</div>
      <div class="spec-valor">${formatarKm(veiculo.km)}</div>
    </div>
    <div class="spec-item">
      <div class="spec-label">Câmbio</div>
      <div class="spec-valor">${veiculo.cambio}</div>
    </div>
    <div class="spec-item">
      <div class="spec-label">Cor</div>
      <div class="spec-valor">${veiculo.cor}</div>
    </div>
    <div class="spec-item">
      <div class="spec-label">Combustível</div>
      <div class="spec-valor">${veiculo.combustivel}</div>
    </div>
  </div>

  ${opcionaisExibir.length > 0 ? `
  <div class="opcionais">
    <div class="opcionais-titulo">Opcionais</div>
    <div class="opcionais-lista">
      ${opcionaisExibir.map(op => `<span class="opcional-tag">${op}</span>`).join('')}
    </div>
  </div>
  ` : ''}

  <div class="rodape">
    <div class="rodape-wa">
      <div class="wa-label">WhatsApp</div>
      <div class="wa-numero">${loja.whatsapp}</div>
    </div>
    ${qrSvg ? `<div class="qr-box">${qrSvg}</div>` : ''}
  </div>

</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
