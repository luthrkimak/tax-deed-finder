import { useState } from 'react'

type Tipo = 'tax_deed' | 'tax_lien' | 'hibrido'

interface Estado {
  abbr: string
  nome: string
  tipo: Tipo
  frequencia: string
  resgate: string | null
  notas: string
}

const ESTADOS: Estado[] = [
  { abbr: 'AL', nome: 'Alabama', tipo: 'tax_lien', frequencia: 'Anual (Abr–Jun)', resgate: '3 anos', notas: 'Certificados de lien leiloados anualmente. Proprietário pode resgatar pagando o débito + juros de 12% a.a.' },
  { abbr: 'AK', nome: 'Alaska', tipo: 'tax_deed', frequencia: 'Varia por município', resgate: null, notas: 'Venda direta de escritura pelo governo local. Sem período de resgate após a venda.' },
  { abbr: 'AZ', nome: 'Arizona', tipo: 'tax_lien', frequencia: 'Anual (Fev)', resgate: '3 anos', notas: 'Juros de até 16% a.a. Leilão online em muitos condados. Após 3 anos sem resgate, investidor solicita a escritura.' },
  { abbr: 'AR', nome: 'Arkansas', tipo: 'tax_deed', frequencia: 'Anual', resgate: '30 dias (após venda)', notas: 'Propriedades administradas pelo Commissioner of State Lands. Leilões presenciais e online.' },
  { abbr: 'CA', nome: 'California', tipo: 'tax_deed', frequencia: '1–2× por ano (varia por condado)', resgate: null, notas: 'Cada condado realiza seus próprios leilões. Escritura direta ao arrematante; sem resgate após o martelo.' },
  { abbr: 'CO', nome: 'Colorado', tipo: 'tax_lien', frequencia: 'Anual (Out–Nov)', resgate: '3 anos', notas: 'Juros de até 9% a.a. + prêmio de licitação. Leilão online via plataformas certificadas pelo estado.' },
  { abbr: 'CT', nome: 'Connecticut', tipo: 'tax_deed', frequencia: 'Varia por município', resgate: null, notas: 'Leilões conduzidos por cada município. Processo judicial pode ser necessário antes da venda.' },
  { abbr: 'DE', nome: 'Delaware', tipo: 'tax_deed', frequencia: 'Anual (varia por condado)', resgate: null, notas: 'Execução via processo judicial in rem. Escritura emitida após confirmação pelo juiz.' },
  { abbr: 'FL', nome: 'Florida', tipo: 'hibrido', frequencia: 'Anual (Mai–Jun) + sob demanda', resgate: '2 anos', notas: 'Primeiro leiloa certificados de lien online (juros até 18%). Se não resgatado em 2 anos, investidor pode solicitar leilão de Tax Deed.' },
  { abbr: 'GA', nome: 'Georgia', tipo: 'tax_deed', frequencia: 'Mensal (1ª terça-feira)', resgate: '12 meses', notas: 'Redeemable Tax Deed: escritura emitida na venda, mas proprietário tem 12 meses para resgatar pagando 20% de prêmio sobre o valor pago.' },
  { abbr: 'HI', nome: 'Hawaii', tipo: 'tax_deed', frequencia: 'Anual (varia)', resgate: null, notas: 'Leilões administrados pelo estado ou condado. Mercado competitivo dado o alto valor dos imóveis no arquipélago.' },
  { abbr: 'ID', nome: 'Idaho', tipo: 'tax_deed', frequencia: 'Anual', resgate: null, notas: 'Leilão público após 3 anos de inadimplência fiscal. Escritura emitida diretamente ao arrematante.' },
  { abbr: 'IL', nome: 'Illinois', tipo: 'tax_lien', frequencia: 'Anual (Nov)', resgate: '2–3 anos', notas: 'Juros de 18% a.a. Um dos sistemas de tax lien mais ativos dos EUA. Chicago realiza leilão separado com alto volume.' },
  { abbr: 'IN', nome: 'Indiana', tipo: 'tax_lien', frequencia: 'Anual (Ago–Out)', resgate: '1 ano', notas: 'Certificado de lien com período de resgate de 1 ano. Após expirado, investidor solicita escritura via processo judicial.' },
  { abbr: 'IA', nome: 'Iowa', tipo: 'tax_lien', frequencia: 'Anual (Jun)', resgate: '1 ano e 9 meses', notas: 'Juros fixos de 24% a.a. — entre os mais altos dos EUA. Após período de resgate, investidor solicita Tax Deed.' },
  { abbr: 'KS', nome: 'Kansas', tipo: 'tax_deed', frequencia: 'Anual', resgate: null, notas: 'Processo conduzido pelo Tribunal de Distrito. Escritura emitida após confirmação judicial.' },
  { abbr: 'KY', nome: 'Kentucky', tipo: 'tax_deed', frequencia: 'Anual (varia por condado)', resgate: null, notas: 'Master Commissioner realiza leilões por ordem judicial. Escritura transferida ao maior lance.' },
  { abbr: 'LA', nome: 'Louisiana', tipo: 'tax_lien', frequencia: 'Anual (Mai)', resgate: '3 anos', notas: 'Sistema único: investidor recebe direito limitado de posse durante o resgate. Juros de 5% (residencial) a 12%.' },
  { abbr: 'ME', nome: 'Maine', tipo: 'tax_deed', frequencia: 'Varia por município', resgate: null, notas: 'Municípios conduzem leilões independentemente. Propriedade revertida ao município após 18 meses de inadimplência.' },
  { abbr: 'MD', nome: 'Maryland', tipo: 'tax_lien', frequencia: 'Anual (Mai–Jun)', resgate: '6 meses a 2 anos', notas: 'Juros de até 24% a.a. dependendo do condado. Baltimore City realiza leilão próprio com alto volume e taxas elevadas.' },
  { abbr: 'MA', nome: 'Massachusetts', tipo: 'tax_lien', frequencia: 'Varia por município', resgate: '6 meses', notas: 'Processo via Land Court ou Town Meeting. Lien vendido e proprietário tem 6 meses para resgatar.' },
  { abbr: 'MI', nome: 'Michigan', tipo: 'tax_deed', frequencia: 'Anual (Jul–Ago)', resgate: null, notas: 'Processo em 2 etapas: forfeiture (1º ano) + foreclosure (2º ano). Leilões online via plataformas certificadas. Sem resgate após a venda.' },
  { abbr: 'MN', nome: 'Minnesota', tipo: 'tax_deed', frequencia: 'Anual', resgate: null, notas: 'Estado emite a escritura após 3 anos de inadimplência. Leilões organizados por condado.' },
  { abbr: 'MS', nome: 'Mississippi', tipo: 'tax_lien', frequencia: 'Anual (Ago–Set)', resgate: '2 anos', notas: 'Juros de 18% a.a. Após 2 anos sem resgate, comprador do lien tem direito à escritura do imóvel.' },
  { abbr: 'MO', nome: 'Missouri', tipo: 'hibrido', frequencia: 'Anual (Ago)', resgate: '1 ano', notas: 'Primeiro leilão para recuperação de impostos; imóveis não vendidos vão para leilão de escritura. Juros de 10% a.a.' },
  { abbr: 'MT', nome: 'Montana', tipo: 'tax_lien', frequencia: 'Anual', resgate: '2–5 anos', notas: 'Juros de 10% a.a. Longo período de resgate. Após expirado, investidor solicita escritura via Treasurer\'s Deed.' },
  { abbr: 'NE', nome: 'Nebraska', tipo: 'tax_lien', frequencia: 'Anual (Mar)', resgate: '3 anos', notas: 'Juros de 14% a.a. Após 3 anos sem resgate, investidor pode solicitar a escritura do imóvel.' },
  { abbr: 'NV', nome: 'Nevada', tipo: 'tax_deed', frequencia: 'Mensal (varia por condado)', resgate: null, notas: 'Clark County (Las Vegas) realiza leilões mensais online. Sem período de resgate após a venda.' },
  { abbr: 'NH', nome: 'New Hampshire', tipo: 'tax_deed', frequencia: 'Varia por município', resgate: null, notas: 'Municípios retomam a propriedade após 2 anos de inadimplência e realizam leilão público.' },
  { abbr: 'NJ', nome: 'New Jersey', tipo: 'tax_lien', frequencia: 'Anual (Dez)', resgate: '2 anos', notas: 'Juros de até 18% a.a. + prêmio de até 6%. Um dos estados mais ativos e competitivos para investidores de tax lien.' },
  { abbr: 'NM', nome: 'New Mexico', tipo: 'tax_deed', frequencia: 'Anual (varia por condado)', resgate: null, notas: 'Estado pode vender propriedades após 3 anos de inadimplência. Leilões presenciais nos condados.' },
  { abbr: 'NY', nome: 'New York', tipo: 'tax_deed', frequencia: 'Anual (varia por condado)', resgate: null, notas: 'Processo in rem: ação judicial coletiva. NYC realiza leilões anuais com centenas de imóveis de uma só vez.' },
  { abbr: 'NC', nome: 'North Carolina', tipo: 'tax_deed', frequencia: 'Sob demanda', resgate: null, notas: 'Sistema de "upset bid" único: após o leilão, qualquer pessoa pode superoferecer 5% em até 10 dias. Processo pode se estender por semanas.' },
  { abbr: 'ND', nome: 'North Dakota', tipo: 'tax_lien', frequencia: 'Anual', resgate: '3 anos', notas: 'Condado retém a propriedade após inadimplência e pode vendê-la via leilão público após o período de resgate.' },
  { abbr: 'OH', nome: 'Ohio', tipo: 'tax_deed', frequencia: 'Anual (varia por condado)', resgate: null, notas: 'Processo via Common Pleas ou Probate Court. Condados realizam leilões anuais com alto volume de imóveis.' },
  { abbr: 'OK', nome: 'Oklahoma', tipo: 'tax_deed', frequencia: 'Anual (Out)', resgate: null, notas: 'Treasurer vende o lien; se não resgatado em 2 anos, realiza-se o Tax Deed Sale com escritura direta.' },
  { abbr: 'OR', nome: 'Oregon', tipo: 'tax_deed', frequencia: 'Anual (Out–Nov)', resgate: null, notas: 'Condados realizam leilões anuais. Escritura emitida imediatamente após a arrematação.' },
  { abbr: 'PA', nome: 'Pennsylvania', tipo: 'tax_deed', frequencia: 'Anual (Set) + judicial', resgate: null, notas: '2 modalidades: Upset Sale (com ônus remanescentes) e Judicial Sale (sem ônus). Imóveis não vendidos no Upset vão ao Judicial.' },
  { abbr: 'RI', nome: 'Rhode Island', tipo: 'tax_lien', frequencia: 'Varia por município', resgate: '1 ano', notas: 'Município pode leiloar o lien ou executar diretamente. Juros de até 18% a.a.' },
  { abbr: 'SC', nome: 'South Carolina', tipo: 'tax_lien', frequencia: 'Anual (Nov–Dez)', resgate: '1 ano', notas: 'Juros de 3–12% a.a. dependendo do lance. Após 1 ano sem resgate, investidor solicita Tax Deed.' },
  { abbr: 'SD', nome: 'South Dakota', tipo: 'tax_lien', frequencia: 'Anual', resgate: '3–4 anos', notas: 'Juros de 10% a.a. com um dos períodos de resgate mais longos dos EUA antes da transferência de escritura.' },
  { abbr: 'TN', nome: 'Tennessee', tipo: 'tax_deed', frequencia: 'Anual (varia por condado)', resgate: null, notas: 'Processo via Chancery Court. Condados como Shelby realizam leilões online. Escritura após confirmação judicial.' },
  { abbr: 'TX', nome: 'Texas', tipo: 'tax_deed', frequencia: 'Mensal (1ª terça-feira)', resgate: '6 meses (residencial)', notas: 'Leilões realizados na escadaria do tribunal, todo 1º terça do mês. Imóveis residenciais têm 6 meses de resgate; propriedades agrícolas, 2 anos.' },
  { abbr: 'UT', nome: 'Utah', tipo: 'tax_deed', frequencia: 'Anual (Mai–Jun)', resgate: null, notas: 'Processo via County Auditor. Escritura direta ao arrematante; sem período de resgate após a venda.' },
  { abbr: 'VT', nome: 'Vermont', tipo: 'tax_lien', frequencia: 'Varia por município', resgate: '1 ano', notas: 'Municípios conduzem o processo individualmente. Após 1 ano sem resgate, escritura pode ser transferida ao investidor.' },
  { abbr: 'VA', nome: 'Virginia', tipo: 'tax_deed', frequencia: 'Anual (varia por localidade)', resgate: null, notas: 'Processo judicial via Circuit Court. Escritura emitida após confirmação. Algumas localidades usam leilão público presencial.' },
  { abbr: 'WA', nome: 'Washington', tipo: 'tax_deed', frequencia: 'Anual (Fev–Mar)', resgate: null, notas: 'Treasurer\'s Deed Sale anual por condado. Lance mínimo inclui todos os impostos devidos + taxas. Sem resgate após a venda.' },
  { abbr: 'WV', nome: 'West Virginia', tipo: 'hibrido', frequencia: 'Anual (Out–Nov)', resgate: '18 meses (lien) / sem resgate (deed)', notas: 'Primeiro leiloa liens em outubro; propriedades não resgatadas vão para leilão de escritura em novembro.' },
  { abbr: 'WI', nome: 'Wisconsin', tipo: 'tax_deed', frequencia: 'Anual', resgate: null, notas: 'Condados retomam a propriedade após 2 anos de inadimplência e realizam leilão público via County Treasurer.' },
  { abbr: 'WY', nome: 'Wyoming', tipo: 'tax_lien', frequencia: 'Anual', resgate: '4 anos', notas: 'Juros de 15% a.a. Um dos períodos de resgate mais longos dos EUA, o que reduz o risco para o proprietário.' },
]

const TIPO_CONFIG = {
  tax_deed:  { label: 'Tax Deed',  bg: 'bg-blue-50',   text: 'text-blue-700',  border: 'border-blue-200' },
  tax_lien:  { label: 'Tax Lien',  bg: 'bg-green-50',  text: 'text-green-700', border: 'border-green-200' },
  hibrido:   { label: 'Híbrido',   bg: 'bg-amber-50',  text: 'text-amber-700', border: 'border-amber-200' },
}

const FILTROS = [
  { value: 'todos',    label: 'Todos os estados' },
  { value: 'tax_deed', label: 'Tax Deed' },
  { value: 'tax_lien', label: 'Tax Lien' },
  { value: 'hibrido',  label: 'Híbrido' },
]

export default function StatesGuide() {
  const [filtro, setFiltro] = useState<string>('todos')

  const visíveis = filtro === 'todos' ? ESTADOS : ESTADOS.filter(e => e.tipo === filtro)

  const counts = {
    tax_deed: ESTADOS.filter(e => e.tipo === 'tax_deed').length,
    tax_lien: ESTADOS.filter(e => e.tipo === 'tax_lien').length,
    hibrido:  ESTADOS.filter(e => e.tipo === 'hibrido').length,
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Guia por Estado</h1>
        <p className="text-gray-500 text-sm">Como funcionam os leilões de imóveis em cada um dos 50 estados americanos</p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { tipo: 'tax_deed' as Tipo, desc: 'Escritura transferida direto na venda' },
          { tipo: 'tax_lien' as Tipo, desc: 'Certificado de lien com período de resgate' },
          { tipo: 'hibrido'  as Tipo, desc: 'Combinação dos dois sistemas' },
        ].map(({ tipo, desc }) => {
          const cfg = TIPO_CONFIG[tipo]
          return (
            <button
              key={tipo}
              onClick={() => setFiltro(filtro === tipo ? 'todos' : tipo)}
              className={`text-left p-4 rounded-xl border transition-all ${
                filtro === tipo
                  ? `${cfg.bg} ${cfg.border} border-2`
                  : 'bg-white border-gray-100 hover:border-gray-200'
              } shadow-sm`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${cfg.bg} ${cfg.text}`}>
                  {cfg.label}
                </span>
                <span className="text-2xl font-bold text-gray-900">{counts[tipo]}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </button>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {FILTROS.map(f => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              filtro === f.value
                ? 'bg-[#002868] text-white border-[#002868]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {f.label}
            {f.value !== 'todos' && (
              <span className="ml-1.5 opacity-70">
                ({counts[f.value as Tipo]})
              </span>
            )}
          </button>
        ))}
        <span className="text-sm text-gray-400 ml-2">{visíveis.length} estado{visíveis.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Cards grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visíveis.map(estado => {
          const cfg = TIPO_CONFIG[estado.tipo]
          return (
            <div key={estado.abbr} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-3xl font-black text-gray-900 leading-none">{estado.abbr}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{estado.nome}</div>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-md uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
                  {cfg.label}
                </span>
              </div>

              {/* Frequência */}
              <div className="mb-2">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Frequência</div>
                <div className="text-sm font-medium text-gray-800">{estado.frequencia}</div>
              </div>

              {/* Período de resgate */}
              <div className="mb-3">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Período de resgate</div>
                <div className="text-sm font-medium text-gray-800">
                  {estado.resgate ?? <span className="text-gray-400">Sem resgate</span>}
                </div>
              </div>

              {/* Notas */}
              <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-50 pt-3">
                {estado.notas}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
