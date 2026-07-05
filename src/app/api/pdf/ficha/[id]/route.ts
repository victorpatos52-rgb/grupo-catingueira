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

// ── Matching case-insensitive + substring por palavras ──────────────────────
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[-/]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function corresponde(dbOpcional: string, listItem: string): boolean {
  const nd = normalizar(dbOpcional)
  const nl = normalizar(listItem)
  if (nd === nl || nd.includes(nl) || nl.includes(nd)) return true
  const wordsD = nd.split(' ')
  const wordsL = nl.split(' ')
  return wordsD.some(wd =>
    wordsL.some(wl => {
      const minLen = 3
      return (wd.length >= minLen && wl.includes(wd)) || (wl.length >= minLen && wd.includes(wl))
    })
  )
}

function isAtivo(opcionaisVeiculo: string[], cambio: string, listItem: string): boolean {
  if (listItem === 'CAMBIO AUTOMÁTICO') {
    return (
      /autom/i.test(cambio) ||
      /cvt/i.test(cambio) ||
      opcionaisVeiculo.some(op => corresponde(op, listItem))
    )
  }
  return opcionaisVeiculo.some(op => corresponde(op, listItem))
}

const COL_ESQUERDA = [
  'AR CONDICIONADO',
  'DIREÇÃO HIDRÁULICA',
  'VIDROS ELÉTRICOS',
  'TRAVA ELÉTRICA',
  'ALARME',
  'RETROVISOR ELÉTRICO',
  'SOM USB e BTF',
  'AIRBAG e ABS',
  'CONTROLE SOM VOLANTE',
  'RODAS DE LIGA LEVE',
]

const COL_DIREITA = [
  'SENSOR ESTACIONAR',
  'CAMBIO AUTOMÁTICO',
  'BANCOS COURO',
  'REGULAGEM DO VOLANTE',
  'FARÓIS DE NEBLINA',
  'PINTURA METÁLICA',
  'LIMP. e DES. TRASEIRO',
  'PROTETOR DE CAÇAMBA',
  'CAPOTA MARÍTIMA / FIBRA',
  'PERSONALIZAÇÃO',
]

function checkboxItem(label: string, ativo: boolean): string {
  return `<div style="font-size:13px;padding:5px 8px;min-height:24px">${ativo ? '(X)' : '( )'}&nbsp;${label}</div>`
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
    descricao: string | null
    logo_url: string | null
  }

  const opcionaisVeiculo: string[] = veiculo.opcionais ?? []
  const temOferta = !!veiculo.valor_oferta && veiculo.valor_oferta < veiculo.preco
  const slogan =
    loja.descricao?.trim() ||
    'SUA REVENDA MULTIMARCAS EM PATOS E REGIÃO.'

  const enderecoLoja = [loja.endereco, loja.cidade, loja.estado].filter(Boolean).join(' — ')

  // ── Logo via URL pública estática do Vercel ──────────────────────────────────
  const nomeLoja = loja.nome.toLowerCase()
  const logoUrl = nomeLoja.includes('catingueira')
    ? 'https://grupo-catingueira.vercel.app/logo-catingueira.png'
    : nomeLoja.includes('felizardo')
    ? 'https://felizardo-veiculos.vercel.app/logo-felizardo.png'
    : null

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" style="width:100%;height:auto;max-height:180px;object-fit:contain;object-position:center;display:block;margin:0 0 12px 0;" />`
    : `<div style="border:3px double #000;padding:10px 20px;display:inline-block;"><strong style="font-size:22px;text-transform:uppercase;letter-spacing:2px;">${loja.nome}</strong></div>`

  // ── Grid de dados ───────────────────────────────────────────────────────────
  function celula(label: string, valor: string): string {
    return `<td style="border:1px solid #000;width:50%;min-height:40px;vertical-align:top">
      <div style="font-weight:700;font-size:11px;padding:6px 8px 2px">${label}</div>
      <div style="font-size:14px;padding:2px 8px 8px">${valor}</div>
    </td>`
  }

  const tabelaDados = `
    <table style="width:100%;border-collapse:collapse;border:1px solid #000">
      <tr>
        ${celula('MODELO:', veiculo.versao ?? '—')}
        ${celula('COR:', veiculo.cor)}
      </tr>
      <tr>
        ${celula('ANO/FAB.:', String(veiculo.ano))}
        ${celula('ANO/MOD.:', String(veiculo.ano))}
      </tr>
      <tr>
        ${celula('COMBUSTÍVEL:', veiculo.combustivel)}
        ${celula('KM.:', formatarKm(veiculo.km))}
      </tr>
      <tr>
        <td style="border:1px solid #000;width:50%;min-height:40px">&nbsp;</td>
        ${celula('MOTOR:', veiculo.versao ?? '—')}
      </tr>
    </table>`

  // ── Opcionais ───────────────────────────────────────────────────────────────
  const colEsquerdaHtml = COL_ESQUERDA
    .map(item => checkboxItem(item, isAtivo(opcionaisVeiculo, veiculo.cambio, item)))
    .join('')

  const colDireitaHtml = COL_DIREITA
    .map(item => checkboxItem(item, isAtivo(opcionaisVeiculo, veiculo.cambio, item)))
    .join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Ficha — ${veiculo.marca} ${veiculo.modelo}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: Arial, Helvetica, sans-serif;
  color: #111;
  background: #fff;
  font-size: 13px;
  padding: 0;
  margin: 0;
}
.pagina {
  padding: 10mm;
}
.topo { margin-bottom: 0; }
.slogan {
  font-style: italic;
  font-size: 13px;
  color: #333;
  text-align: center;
  margin: 4px 0 12px;
}
.sep { border-top: 3px solid #000; margin: 12px 0 3px; }
.sep2 { border-top: 1px solid #000; margin-bottom: 12px; }
.carro-titulo {
  font-size: 26px;
  font-weight: 900;
  text-transform: uppercase;
  margin-bottom: 10px;
  letter-spacing: 0.03em;
}
.secao-titulo {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border-bottom: 1px solid #000;
  padding-bottom: 3px;
  margin: 14px 0 6px;
}
.opcionais-grid {
  display: flex;
  gap: 0;
  border: 1px solid #000;
}
.opcol {
  flex: 1;
  padding: 4px 0;
  border-right: 1px solid #000;
}
.opcol:last-child { border-right: none; }
.preco-bloco { margin: 0; }
.preco {
  font-size: 72px;
  font-weight: 900;
  letter-spacing: -1px;
  line-height: 1;
  margin: 16px 0 8px;
}
.preco-de {
  font-size: 22px;
  font-weight: 700;
  text-decoration: line-through;
  color: #555;
  margin: 16px 0 0;
}
.preco-por {
  font-size: 60px;
  font-weight: 900;
  letter-spacing: -1px;
  line-height: 1;
  margin: 2px 0 8px;
}
.motor-linha {
  display: flex;
  gap: 40px;
  font-size: 14px;
  margin-bottom: 12px;
}
.motor-campo {
  border-bottom: 1px solid #000;
  min-width: 160px;
  padding-bottom: 2px;
}
.pagamento {
  font-size: 13px;
  line-height: 1.8;
}
.rodape {
  margin-top: 16px;
  padding-top: 10px;
  border-top: 1px solid #000;
  font-size: 12px;
  color: #333;
  display: flex;
  justify-content: space-between;
}
.btn-imprimir {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 24px;
  background: #000;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  font-family: Arial, sans-serif;
}
.btn-imprimir:hover { background: #333; }
@media print {
  body { margin: 0; padding: 0; }
  .pagina { padding: 0; }
  .btn-imprimir { display: none; }
  @page { size: A4 portrait; margin: 10mm; }
}
</style>
</head>
<body>

<button class="btn-imprimir" onclick="window.print()">🖨 Imprimir</button>

<div class="pagina">

  <!-- TOPO: Logo ou placa -->
  <div class="topo">${logoHtml}</div>
  <div class="slogan">${slogan}</div>

  <!-- Separador duplo -->
  <div class="sep"></div>
  <div class="sep2"></div>

  <!-- Dados do carro -->
  <div class="carro-titulo">CARRO: ${veiculo.marca.toUpperCase()} ${veiculo.modelo.toUpperCase()}</div>

  ${tabelaDados}

  <!-- Opcionais -->
  <div class="secao-titulo">OPCIONAIS:</div>
  <div class="opcionais-grid">
    <div class="opcol">${colEsquerdaHtml}</div>
    <div class="opcol">${colDireitaHtml}</div>
  </div>

  <!-- Preço -->
  <div class="preco-bloco">
    <div class="sep" style="margin-top:14px"></div>
    <div class="sep2"></div>
    ${temOferta
      ? `<div class="preco-de">DE ${formatarPreco(veiculo.preco)}</div>
         <div class="preco-por">POR ${formatarPreco(veiculo.valor_oferta)}</div>`
      : `<div class="preco">${formatarPreco(veiculo.preco)}</div>`
    }
    <div class="motor-linha">
      <div>
        <span style="font-weight:700">MOTOR:</span>
        <span class="motor-campo">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
      </div>
      <div>
        <span style="font-weight:700">PLACA:</span>
        <span class="motor-campo">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
      </div>
    </div>
  </div>

  <!-- Forma de pagamento -->
  <div class="pagamento">
    <div><strong>FORMA DE PAGAMENTO:</strong> A VISTA, PIX, FINANCIAMENTO E CONSÓRCIO.</div>
    <div><strong>TROCA EM VEÍCULO:</strong> CARRO E MOTO</div>
  </div>

  <!-- Rodapé -->
  <div class="rodape">
    <div><strong>${loja.nome.toUpperCase()}</strong>${enderecoLoja ? ' — ' + enderecoLoja : ''}</div>
    <div>WhatsApp: ${loja.whatsapp}</div>
  </div>

</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
