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
  return `<div style="margin-bottom:3px;font-size:11px">${ativo ? '(X)' : '( )'}&nbsp;${label}</div>`
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
  const slogan =
    loja.descricao?.trim() ||
    'SUA REVENDA MULTIMARCAS EM PATOS E REGIÃO.'

  const enderecoLoja = [loja.endereco, loja.cidade, loja.estado].filter(Boolean).join(' — ')

  // ── Logo ou placa de texto ──────────────────────────────────────────────────
  const logoHtml = loja.logo_url
    ? `<img src="${loja.logo_url}" alt="${loja.nome}" style="max-height:80px;max-width:280px;display:block;margin:0 auto;object-fit:contain"/>`
    : `<div style="display:inline-block;border:3px solid #000;padding:4px">
         <div style="border:1px solid #000;padding:10px 32px;font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em">
           ${loja.nome.toUpperCase()}
         </div>
       </div>`

  // ── Grid de dados ───────────────────────────────────────────────────────────
  function celula(label: string, valor: string): string {
    return `<td style="border:1px solid #000;padding:5px 8px;font-size:12px;width:50%">
      <span style="font-weight:700;font-size:10px">${label}</span><br/>${valor}
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
        <td style="border:1px solid #000;padding:5px 8px;font-size:12px;width:50%">&nbsp;</td>
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
  color: #000;
  background: #fff;
  font-size: 12px;
}
.pagina {
  max-width: 190mm;
  margin: 0 auto;
  padding: 10mm 0;
}
.topo { text-align: center; margin-bottom: 8px; }
.slogan {
  font-style: italic;
  font-size: 11px;
  color: #333;
  text-align: center;
  margin: 6px 0 12px;
}
.sep { border-top: 3px solid #000; margin-bottom: 3px; }
.sep2 { border-top: 1px solid #000; margin-bottom: 14px; }
.carro-titulo {
  font-size: 22px;
  font-weight: 900;
  text-transform: uppercase;
  margin-bottom: 10px;
  letter-spacing: 0.03em;
}
.secao-titulo {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border-bottom: 1px solid #000;
  padding-bottom: 3px;
  margin: 14px 0 8px;
}
.opcionais-grid {
  display: flex;
  gap: 0;
  border: 1px solid #000;
}
.opcol {
  flex: 1;
  padding: 6px 10px;
  border-right: 1px solid #000;
}
.opcol:last-child { border-right: none; }
.preco-bloco { margin: 14px 0 8px; }
.preco {
  font-size: 58px;
  font-weight: 900;
  letter-spacing: -1px;
  line-height: 1;
}
.motor-linha {
  margin-top: 8px;
  display: flex;
  gap: 40px;
  font-size: 12px;
}
.motor-campo {
  border-bottom: 1px solid #000;
  min-width: 140px;
  padding-bottom: 1px;
}
.pagamento {
  margin-top: 14px;
  font-size: 12px;
  line-height: 1.8;
}
.rodape {
  margin-top: 16px;
  padding-top: 8px;
  border-top: 1px solid #000;
  font-size: 10px;
  color: #333;
  display: flex;
  justify-content: space-between;
}
.btn-imprimir {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 28px;
  background: #000;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  font-family: Arial, sans-serif;
}
.btn-imprimir:hover { background: #333; }
@media print {
  body { margin: 0; }
  .pagina { padding: 0; max-width: 100%; }
  .btn-imprimir { display: none; }
  @page { size: A4 portrait; margin: 15mm; }
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
    <div class="preco">${formatarPreco(veiculo.preco)}</div>
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
