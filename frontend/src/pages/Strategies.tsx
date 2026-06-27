import { useState } from 'react'

interface Estrategia {
  titulo: string
  descricao: string
}

interface Secao {
  id: string
  icone: React.ReactNode
  titulo: string
  subtitulo: string
  cor: { bg: string; text: string; border: string; light: string }
  estrategias: Estrategia[]
}

const IconTarget = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
)
const IconGavel = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2 L22 10 L16 16 L8 8 Z"/><path d="M2 22 L10 14"/><line x1="6" y1="18" x2="10" y2="14"/>
  </svg>
)
const IconKey = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2L13 10M16 7l2 2"/>
  </svg>
)
const IconWarning = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const SECOES: Secao[] = [
  {
    id: 'antes',
    icone: <IconTarget />,
    titulo: 'Antes do Leilão',
    subtitulo: 'Due diligence e preparação — onde a maioria dos erros acontece',
    cor: { bg: 'bg-blue-600', text: 'text-blue-700', border: 'border-blue-100', light: 'bg-blue-50' },
    estrategias: [
      {
        titulo: 'Defina seu critério de compra antes de qualquer coisa',
        descricao: 'Antes de pesquisar imóveis, defina: qual estado, qual tipo (tax deed ou lien), qual faixa de valor, qual estratégia de saída (revenda rápida, aluguel ou longo prazo). Investidores que entram no leilão sem critérios claros compram por impulso e pagam caro.',
      },
      {
        titulo: 'Pesquise o histórico do imóvel no cartório',
        descricao: 'Acesse os registros públicos do condado e verifique: hipotecas ativas, penhoras federais (IRS liens), julgamentos judiciais, e outros ônus. Em Tax Deed Sales, alguns ônus sobrevivem à venda — especialmente liens federais. Em Tax Lien Sales, a maioria sobrevive.',
      },
      {
        titulo: 'Visite o imóvel fisicamente antes de licitar',
        descricao: 'Fotos online mentem. Visite pessoalmente ou contrate alguém local para ir. Verifique: estado de conservação, se está ocupado (inquilino ou squatter), acesso à propriedade, e sinais de danos estruturais. Um imóvel que parece barato pode ter $80.000 em reparos necessários.',
      },
      {
        titulo: 'Calcule seu lance máximo antes de entrar',
        descricao: 'Fórmula básica: Lance máximo = Valor de mercado após reformas (ARV) × 70% − Custo das reformas − Custos de fechamento − Custos de carregamento (impostos, seguro, juros). Nunca entre no leilão sem esse número calculado. O calor do momento faz investidores superarem seus limites.',
      },
      {
        titulo: 'Verifique se há inquilinos ou moradores',
        descricao: 'Imóvel ocupado significa despejo — que pode levar meses e custar $3.000–$15.000 dependendo do estado. Em estados com forte proteção ao inquilino (CA, NY, IL), o processo é ainda mais longo. Desconte sempre o custo e prazo do despejo no seu cálculo.',
      },
      {
        titulo: 'Verifique multas e violações municipais',
        descricao: 'Alguns municípios têm multas por código de construção, violações ambientais, ou débitos de serviços públicos (água, esgoto) que seguem o imóvel — não o proprietário. Essas dívidas podem não aparecer na busca de título padrão. Ligue para o departamento de obras do município.',
      },
      {
        titulo: 'Entenda o que você está comprando: título limpo ou não?',
        descricao: 'Tax Deed via processo judicial geralmente transfere título limpo. Tax Deed administrativo pode deixar ônus. Tax Lien certificate não dá título algum — você compra um direito, não o imóvel. Só após o processo de foreclosure do lien é que você pode solicitar a escritura. Confundir isso é um dos erros mais caros.',
      },
    ],
  },
  {
    id: 'durante',
    icone: <IconGavel />,
    titulo: 'No Leilão',
    subtitulo: 'Disciplina e estratégia durante a disputa',
    cor: { bg: 'bg-[#002868]', text: 'text-[#002868]', border: 'border-blue-100', light: 'bg-slate-50' },
    estrategias: [
      {
        titulo: 'Respeite seu limite calculado — sem exceções',
        descricao: 'Defina o lance máximo antes e trate-o como regra absoluta. A adrenalina do leilão cria o "winner\'s curse" — a tendência de pagar mais do que o imóvel vale só para vencer. Se o preço passar do seu limite, deixe ir. Há centenas de outros imóveis.',
      },
      {
        titulo: 'Chegue cedo e observe antes de licitar',
        descricao: 'Em leilões presenciais, chegue 30–60 minutos antes. Observe quem está licitando, quais imóveis estão atraindo mais concorrência, e quais passam sem interesse. Imóveis pouco disputados frequentemente têm razão — mas às vezes são oportunidades que outros não pesquisaram.',
      },
      {
        titulo: 'Em leilões de tax lien, licite a taxa, não o prêmio',
        descricao: 'Nos estados que licitam a taxa de juros para baixo (IL, AZ, IA, SC), sua estratégia de lance define o retorno. Calcule antecipadamente qual taxa mínima ainda faz sentido para você. Lances de prêmio (dinheiro adicional pago ao município) raramente se justificam — esse dinheiro não retorna no resgate.',
      },
      {
        titulo: 'Não revele seu interesse antes do leilão',
        descricao: 'Em leilões menores, outros investidores observam quem visita os imóveis. Evite conversar sobre quais propriedades você quer. Concorrentes experientes podem estrategicamente elevar o preço de imóveis que sabem que você quer.',
      },
      {
        titulo: 'Tenha o pagamento pronto na forma exigida',
        descricao: 'A maioria dos leilões exige cheque administrativo (cashier\'s check) ou dinheiro vivo no dia. Alguns aceitam transferência bancária. Cartão de crédito raramente é aceito. Checar isso com antecedência evita perder o imóvel arrematado por problema de pagamento — e possível ban do leilão.',
      },
      {
        titulo: 'Em leilões online, teste a plataforma antes do dia',
        descricao: 'Crie conta, faça o registro completo e entenda como funciona o sistema de lances com antecedência. Muitas plataformas (Bid4Assets, RealTaxDeed) exigem depósito prévio que leva 1–3 dias úteis para processar. Problemas técnicos no dia do leilão são sua responsabilidade.',
      },
    ],
  },
  {
    id: 'depois',
    icone: <IconKey />,
    titulo: 'Depois do Leilão',
    subtitulo: 'Gestão do período de resgate e estratégias de saída',
    cor: { bg: 'bg-green-600', text: 'text-green-700', border: 'border-green-100', light: 'bg-green-50' },
    estrategias: [
      {
        titulo: 'Não invista no imóvel durante o período de resgate',
        descricao: 'Em estados com direito de resgate (TX, GA, AL, etc.), o ex-proprietário pode recuperar o imóvel pagando o valor arrematado + prêmio. Reformas feitas pelo investidor geralmente não são reembolsadas. Aguarde o fim do prazo antes de gastar qualquer dinheiro no imóvel.',
      },
      {
        titulo: 'Contrate seguro imediatamente após a arrematação',
        descricao: 'Assim que o imóvel for seu, contrate seguro de propriedade vazia (vacant property insurance). Imóveis desocupados têm risco maior de vandalismo, incêndio e invasão. Muitas apólices residenciais não cobrem imóveis vagos por mais de 30–60 dias.',
      },
      {
        titulo: 'Cuide da posse com cuidado legal',
        descricao: 'Nunca entre forçadamente num imóvel ocupado. O processo de despejo deve seguir a lei local — independentemente de você ter a escritura. Autoajuda (trocar fechadura, cortar água) é ilegal e pode gerar processo. Em estados com strong tenant protection, contrate advogado especializado em despejo.',
      },
      {
        titulo: 'Obtenha seguro de título após a escritura',
        descricao: 'Mesmo em Tax Deed Sales com limpeza de liens, problemas de título podem surgir: herdeiros não notificados, erros de processo judicial, descrições incorretas. O título de seguro (title insurance) protege contra isso e é exigido por qualquer financiador se você quiser revender com financiamento.',
      },
      {
        titulo: 'Defina a estratégia de saída antes de comprar',
        descricao: 'As três opções principais: (1) Flip rápido — revender em 3–6 meses após reformas; (2) Aluguel — renda passiva de longo prazo; (3) Wholesale — vender o contrato ou escritura para outro investidor sem reformar. Cada uma exige capital, tempo e habilidades diferentes. Decide antes, não depois.',
      },
      {
        titulo: 'Acompanhe prazos de resgate com precisão',
        descricao: 'Crie um calendário com a data exata de fim do período de resgate para cada imóvel. Passada essa data, o direito do ex-proprietário expira automaticamente — você pode então tomar todas as ações de posse e revenda. Um dia de erro pode complicar uma transação.',
      },
    ],
  },
  {
    id: 'erros',
    icone: <IconWarning />,
    titulo: 'Erros Clássicos',
    subtitulo: 'Armadilhas que custam caro — especialmente para iniciantes',
    cor: { bg: 'bg-red-500', text: 'text-red-700', border: 'border-red-100', light: 'bg-red-50' },
    estrategias: [
      {
        titulo: 'Confundir Tax Lien com Tax Deed',
        descricao: 'Tax Lien = você compra o direito de receber os impostos + juros. Você NÃO é dono do imóvel. Tax Deed = você compra o imóvel diretamente. Confundir os dois leva a expectativas erradas sobre o que você tem e o que pode fazer com o bem.',
      },
      {
        titulo: 'Não pesquisar liens federais (IRS)',
        descricao: 'Um lien do IRS (Internal Revenue Service) sobre o imóvel pode SOBREVIVER a uma Tax Deed Sale em muitos estados. O governo federal tem proteções especiais. Se o ex-proprietário devia ao IRS, você pode herdar esse problema. Sempre verifique o PACER (federal court records) ou o registro federal de liens.',
      },
      {
        titulo: 'Ignorar o custo real de um imóvel degradado',
        descricao: 'Investidores iniciantes veem um imóvel por $10.000 e imaginam revender por $80.000. Mas esquecem: reforma ($35.000), despejo ($5.000), impostos durante o processo ($3.000), comissão de corretor ($5.000), closing costs ($3.000). Margem real: $19.000 — se tudo correr bem.',
      },
      {
        titulo: 'Comprar em área com mercado imobiliário fraco',
        descricao: 'Imóvel barato em área sem demanda = imóvel que ninguém quer comprar ou alugar. Antes de arrematar, verifique: tempo médio de imóveis no mercado na área (DOM), taxa de vacância de aluguéis, tendência de preços nos últimos 2 anos, e distância de emprego e serviços.',
      },
      {
        titulo: 'Não considerar contaminação ambiental',
        descricao: 'Propriedades com histórico industrial, postos de gasolina antigos, ou uso agrícola podem ter contaminação de solo. O novo proprietário herda a responsabilidade de remediação — que pode custar dezenas de milhares de dólares. Consulte o banco de dados de sites contaminados do EPA (ECHO) antes de comprar.',
      },
      {
        titulo: 'Subestimar o tempo do processo',
        descricao: 'Tax lien em Illinois pode levar 3 anos do leilão até a escritura. Judicial Tax Deed em Virginia pode levar 18 meses. Esses prazos imobilizam seu capital. Calcule sempre o custo de oportunidade: o que você perderia de retorno em outros investimentos enquanto espera?',
      },
      {
        titulo: 'Comprar sem ver o imóvel',
        descricao: 'Nunca. Sem exceções. Fotos de satélite, Street View e imagens online são pontos de partida, não substitutos. Um investidor que compra às cegas eventualmente paga caro por isso — um imóvel sem telhado, sem piso, ou com fundação comprometida pode transformar um bom negócio em prejuízo total.',
      },
    ],
  },
  {
    id: 'equipe',
    icone: <IconUsers />,
    titulo: 'Montando sua Equipe',
    subtitulo: 'Os profissionais que fazem a diferença entre lucro e prejuízo',
    cor: { bg: 'bg-purple-600', text: 'text-purple-700', border: 'border-purple-100', light: 'bg-purple-50' },
    estrategias: [
      {
        titulo: 'Advogado especializado em real estate local',
        descricao: 'Indispensável para: revisar o processo de execução fiscal, verificar se a escritura está limpa, conduzir despejos, e orientar sobre legislação estadual. Não use advogado generalista — as nuances do tax deed/lien variam muito por estado e condado. Custo típico: $200–$500/hora ou pacotes fixos.',
      },
      {
        titulo: 'Empresa de pesquisa de título (Title Company)',
        descricao: 'Faz a busca completa de liens, hipotecas, julgamentos e restrições sobre o imóvel. Emite o title insurance. Essencial antes de qualquer compra significativa. Custo: $200–$500 pela pesquisa + prêmio de seguro baseado no valor do imóvel.',
      },
      {
        titulo: 'Avaliador ou investidor local de confiança',
        descricao: 'Para estimar o valor real de mercado (ARV) e o custo de reforma com precisão local. Um avaliador certificado (MAI) tem peso legal. Alternativamente, um investidor experiente na área pode dar uma segunda opinião rápida e prática. Não confie apenas em sites de estimativa automática (Zillow, Redfin).',
      },
      {
        titulo: 'Empreiteiro de confiança (Contractor)',
        descricao: 'Para imóveis que precisam de reforma, tenha pelo menos 3 orçamentos antes de definir o preço máximo de lance. Um empreiteiro que você conhece e confia é um ativo enorme — ele pode visitar o imóvel antes do leilão e dar uma estimativa rápida de custo.',
      },
      {
        titulo: 'Corretor imobiliário especializado em investimentos',
        descricao: 'Para ajudar na análise do mercado local, identificar oportunidades off-market, e executar a venda após reforma. Corretores que trabalham com investidores entendem prazos, não exigem imóvel "perfeito" para listar, e têm rede de compradores investidores.',
      },
      {
        titulo: 'Contador especializado em real estate',
        descricao: 'Investimentos em tax deed/lien têm implicações fiscais específicas: ganho de capital de curto vs longo prazo, depreciação, deduções de reforma, estrutura de LLC. Um contador especializado pode economizar mais do que cobra — especialmente se você operar em múltiplos estados.',
      },
    ],
  },
]

export default function Strategies() {
  const [activeSection, setActiveSection] = useState<string>('antes')

  const secaoAtiva = SECOES.find(s => s.id === activeSection)!

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Estratégias para Leilões</h1>
        <p className="text-gray-500 text-sm">Guia prático para investidores — do primeiro leilão à equipe profissional</p>
      </div>

      {/* Navegação por seção */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {SECOES.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              activeSection === s.id
                ? `${s.id === 'erros' ? 'bg-red-500' : s.id === 'antes' ? 'bg-blue-600' : s.id === 'durante' ? 'bg-[#002868]' : s.id === 'depois' ? 'bg-green-600' : 'bg-purple-600'} text-white border-transparent shadow-md`
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className={activeSection === s.id ? 'text-white' : 'text-gray-400'}>{s.icone}</span>
            {s.titulo}
          </button>
        ))}
      </div>

      {/* Conteúdo da seção */}
      <div>
        {/* Header da seção */}
        <div className={`rounded-xl p-5 mb-6 ${secaoAtiva.cor.light} border ${secaoAtiva.cor.border}`}>
          <div className="flex items-center gap-3 mb-1">
            <span className={secaoAtiva.cor.text}>{secaoAtiva.icone}</span>
            <h2 className={`text-lg font-bold ${secaoAtiva.cor.text}`}>{secaoAtiva.titulo}</h2>
            <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${secaoAtiva.cor.light} ${secaoAtiva.cor.text} border ${secaoAtiva.cor.border}`}>
              {secaoAtiva.estrategias.length} estratégias
            </span>
          </div>
          <p className="text-sm text-gray-600">{secaoAtiva.subtitulo}</p>
        </div>

        {/* Cards de estratégia */}
        <div className="space-y-3">
          {secaoAtiva.estrategias.map((e, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex gap-4">
              <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5 ${
                activeSection === 'erros' ? 'bg-red-500' :
                activeSection === 'antes' ? 'bg-blue-600' :
                activeSection === 'durante' ? 'bg-[#002868]' :
                activeSection === 'depois' ? 'bg-green-600' : 'bg-purple-600'
              }`}>
                {i + 1}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{e.titulo}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{e.descricao}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
