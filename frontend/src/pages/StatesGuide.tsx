import { useState } from 'react'

type Tipo = 'tax_deed' | 'tax_lien' | 'hibrido'

interface Estado {
  abbr: string
  nome: string
  tipo: Tipo
  frequencia: string
  resgate: string | null
  notas: string
  restricoes: string[]
  estrategias: string[]
}

const ESTADOS: Estado[] = [
  {
    abbr: 'AL', nome: 'Alabama', tipo: 'tax_lien',
    frequencia: 'Anual (Abr–Jun)', resgate: '3 anos',
    notas: 'Certificados de lien leiloados anualmente. Proprietário pode resgatar pagando o débito + juros de 12% a.a.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro antecipado obrigatório no condado',
      'Proprietários com impostos atrasados no estado não podem licitar',
      'Pagamento integral exigido logo após arrematação',
    ],
    estrategias: [],
  },
  {
    abbr: 'AK', nome: 'Alaska', tipo: 'tax_deed',
    frequencia: 'Varia por município', resgate: null,
    notas: 'Venda direta de escritura pelo governo local. Sem período de resgate após a venda.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Regras variam muito por município — consulte cada prefeitura',
      'Muitas propriedades vendidas no balcão, sem leilão público formal',
    ],
    estrategias: [],
  },
  {
    abbr: 'AZ', nome: 'Arizona', tipo: 'tax_lien',
    frequencia: 'Anual (Fev)', resgate: '3 anos',
    notas: 'Juros de até 16% a.a. Leilão online em muitos condados. Após 3 anos sem resgate, investidor solicita a escritura.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro obrigatório no Treasurer do condado antes do leilão',
      'Leilão online disponível na maioria dos condados',
      'Endereço postal nos EUA necessário para receber o certificado',
    ],
    estrategias: [
      'Pagamento de impostos subsequentes: se o proprietário não pagar os impostos dos anos seguintes, o titular do lien pode pagá-los e adicioná-los ao seu certificado. Isso aumenta o valor do resgate e impede que outro investidor compre um lien concorrente sobre o mesmo imóvel.',
    ],
  },
  {
    abbr: 'AR', nome: 'Arkansas', tipo: 'tax_deed',
    frequencia: 'Anual', resgate: '30 dias (após venda)',
    notas: 'Propriedades administradas pelo Commissioner of State Lands. Leilões presenciais e online.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro online via Commissioner of State Lands',
      'Pagamento integral imediato após arrematação',
    ],
    estrategias: [],
  },
  {
    abbr: 'CA', nome: 'California', tipo: 'tax_deed',
    frequencia: '1–2× por ano (varia por condado)', resgate: null,
    notas: 'Cada condado realiza seus próprios leilões. Escritura direta ao arrematante; sem resgate após o martelo.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Pagamento em cheque administrativo exigido no dia do leilão',
      'Registro antecipado exigido na maioria dos condados',
      'Lei SB 1079: inquilinos e ONGs têm direito de prelação em imóveis residenciais de 1–4 unidades — podem superar o lance vencedor em até 45 dias após o leilão',
    ],
    estrategias: [
      'Lei SB 1079 usada a favor: investidores constituem ONGs ou parceiros elegíveis para exercer o direito de prelação em imóveis residenciais sem precisar competir no leilão ao vivo.',
    ],
  },
  {
    abbr: 'CO', nome: 'Colorado', tipo: 'tax_lien',
    frequencia: 'Anual (Out–Nov)', resgate: '3 anos',
    notas: 'Juros de até 9% a.a. + prêmio de licitação. Leilão online via plataformas certificadas pelo estado.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro obrigatório via plataforma do condado',
      'Leilão online disponível na maioria dos condados',
      'Prêmio pago acima dos impostos é reembolsado se o proprietário resgatar (diferente de NJ)',
    ],
    estrategias: [],
  },
  {
    abbr: 'CT', nome: 'Connecticut', tipo: 'tax_deed',
    frequencia: 'Varia por município', resgate: null,
    notas: 'Leilões conduzidos por cada município. Processo judicial pode ser necessário antes da venda.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Regras definidas individualmente por cada município',
      'Advogado local recomendado para due diligence',
    ],
    estrategias: [],
  },
  {
    abbr: 'DE', nome: 'Delaware', tipo: 'tax_deed',
    frequencia: 'Anual (varia por condado)', resgate: null,
    notas: 'Execução via processo judicial in rem. Escritura emitida após confirmação pelo juiz.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Processo 100% judicial — advogado local necessário',
      'Escritura emitida somente após confirmação judicial',
    ],
    estrategias: [],
  },
  {
    abbr: 'FL', nome: 'Florida', tipo: 'hibrido',
    frequencia: 'Anual (Mai–Jun) + sob demanda', resgate: '2 anos',
    notas: 'Primeiro leiloa certificados de lien online (juros até 18%). Se não resgatado em 2 anos, investidor pode solicitar leilão de Tax Deed.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro online obrigatório por condado (RealTaxDeed, Bid4Assets, etc.)',
      'W-9 exigido para receber certificados de lien',
      'Tax Lien: pagamento em até 24h após arrematação',
      'Tax Deed: pagamento integral no dia do leilão',
      'Empresas estrangeiras devem estar registradas na Flórida para adquirir o imóvel',
    ],
    estrategias: [
      'Surplus Funds: quando um imóvel é arrematado por valor acima da dívida fiscal, o excedente vai para um fundo de "surplus". O ex-proprietário tem prazo limitado para resgatar esse dinheiro — se não reclamar, o valor vai para o estado. Há investidores especializados em localizar esses ex-donos e ajudá-los a recuperar o surplus em troca de comissão (geralmente 30–40%).',
    ],
  },
  {
    abbr: 'GA', nome: 'Georgia', tipo: 'tax_deed',
    frequencia: 'Mensal (1ª terça-feira)', resgate: '12 meses',
    notas: 'Redeemable Tax Deed: escritura emitida na venda, mas proprietário tem 12 meses para resgatar pagando 20% de prêmio sobre o valor pago.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro prévio obrigatório no condado (Sheriff)',
      'Pagamento em dinheiro ou cheque administrativo no dia da venda',
      'Empresas devem estar registradas na Georgia para tomar posse do imóvel',
      'Não faça reformas durante o período de resgate — o ex-dono paga apenas o valor arrematado + 20%, sem compensar melhorias',
    ],
    estrategias: [
      'Cessão do direito de resgate: assim como no Texas, o ex-proprietário pode vender o direito de resgate a terceiros. O investidor paga ao ex-dono pela cessão e exerce o resgate (valor do leilão + 20%), adquirindo o imóvel abaixo do mercado.',
      'Cobrança de aluguel: durante os 12 meses de resgate, o arrematante pode cobrar aluguel do imóvel se estiver vago e acessível, gerando renda enquanto aguarda o desfecho.',
    ],
  },
  {
    abbr: 'HI', nome: 'Hawaii', tipo: 'tax_deed',
    frequencia: 'Anual (varia)', resgate: null,
    notas: 'Leilões administrados pelo estado ou condado. Mercado competitivo dado o alto valor dos imóveis no arquipélago.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Volume baixo de leilões — mercado muito competitivo',
      'Pagamento integral exigido no dia do leilão',
    ],
    estrategias: [],
  },
  {
    abbr: 'ID', nome: 'Idaho', tipo: 'tax_deed',
    frequencia: 'Anual', resgate: null,
    notas: 'Leilão público após 3 anos de inadimplência fiscal. Escritura emitida diretamente ao arrematante.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Depósito antecipado pode ser exigido pelo condado',
      'Pagamento integral no dia do leilão',
    ],
    estrategias: [],
  },
  {
    abbr: 'IL', nome: 'Illinois', tipo: 'tax_lien',
    frequencia: 'Anual (Nov)', resgate: '2–3 anos',
    notas: 'Juros de 18% a.a. Um dos sistemas de tax lien mais ativos dos EUA. Chicago realiza leilão separado com alto volume.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro antecipado obrigatório',
      'Proprietários com impostos atrasados em Illinois não podem licitar',
      'Cook County (Chicago) tem regras e plataforma próprias',
    ],
    estrategias: [
      'Retorno garantido: Illinois garante 18% a.a. por lei — mesmo se o proprietário resgatar, o investidor recebe principal + juros. O "pior cenário" ainda é lucrativo, tornando Illinois um dos estados mais seguros para tax lien.',
      'Scavenger Sale: liens não vendidos no leilão regular vão para um leilão secundário (Scavenger Sale) com lance mínimo de $1. Alta oportunidade em imóveis de menor valor ou áreas menos competitivas.',
    ],
  },
  {
    abbr: 'IN', nome: 'Indiana', tipo: 'tax_lien',
    frequencia: 'Anual (Ago–Out)', resgate: '1 ano',
    notas: 'Certificado de lien com período de resgate de 1 ano. Após expirado, investidor solicita escritura via processo judicial.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro obrigatório antes do leilão',
      'Proprietários com impostos atrasados no condado não podem participar',
      'Leilão online disponível em muitos condados',
    ],
    estrategias: [
      'Scavenger Sale: imóveis que não foram vendidos no leilão regular vão para um leilão secundário com lance mínimo muito baixo (às vezes $1). Oportunidade para adquirir propriedades em áreas menos disputadas a preços mínimos.',
    ],
  },
  {
    abbr: 'IA', nome: 'Iowa', tipo: 'tax_lien',
    frequencia: 'Anual (Jun)', resgate: '1 ano e 9 meses',
    notas: 'Juros fixos de 24% a.a. — entre os mais altos dos EUA. Após período de resgate, investidor solicita Tax Deed.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro antecipado obrigatório no condado',
      'Proprietários com impostos atrasados no condado não podem licitar',
    ],
    estrategias: [
      'Taxa fixa de 24%: diferente de outros estados onde os juros são licitados para baixo, Iowa tem taxa fixada por lei. Todos os investidores ganham exatamente 24% a.a. — sem disputa por taxa, apenas pelo imóvel.',
    ],
  },
  {
    abbr: 'KS', nome: 'Kansas', tipo: 'tax_deed',
    frequencia: 'Anual', resgate: null,
    notas: 'Processo conduzido pelo Tribunal de Distrito. Escritura emitida após confirmação judicial.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Processo judicial — advogado local recomendado',
      'Pagamento integral exigido após confirmação do juiz',
    ],
    estrategias: [],
  },
  {
    abbr: 'KY', nome: 'Kentucky', tipo: 'tax_deed',
    frequencia: 'Anual (varia por condado)', resgate: null,
    notas: 'Master Commissioner realiza leilões por ordem judicial. Escritura transferida ao maior lance.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Processo judicial via Master Commissioner',
      'Advogado local recomendado para due diligence',
    ],
    estrategias: [],
  },
  {
    abbr: 'LA', nome: 'Louisiana', tipo: 'tax_lien',
    frequencia: 'Anual (Mai)', resgate: '3 anos',
    notas: 'Sistema único: investidor recebe direito limitado de posse durante o resgate. Juros de 5% (residencial) a 12%.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro antecipado obrigatório',
      'Investidor com lien tem direitos e responsabilidades de posse limitada durante o período de resgate',
      'Manutenção mínima do imóvel pode ser exigida legalmente',
      'Não faça reformas — se o proprietário resgatar, ele paga apenas os impostos + juros, sem compensar melhorias',
    ],
    estrategias: [
      'Posse durante o resgate: o investidor pode tomar posse de imóveis vagos logo após comprar o lien, cobrando aluguel durante os 3 anos de resgate. Se o proprietário não resgatar, o investidor fica com o imóvel. Se resgatar, recebe de volta os impostos + juros.',
    ],
  },
  {
    abbr: 'ME', nome: 'Maine', tipo: 'tax_deed',
    frequencia: 'Varia por município', resgate: null,
    notas: 'Municípios conduzem leilões independentemente. Propriedade revertida ao município após 18 meses de inadimplência.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Regras totalmente definidas por cada município',
      'Volume baixo — mercado fragmentado e pouco padronizado',
    ],
    estrategias: [],
  },
  {
    abbr: 'MD', nome: 'Maryland', tipo: 'tax_lien',
    frequencia: 'Anual (Mai–Jun)', resgate: '6 meses a 2 anos',
    notas: 'Juros de até 24% a.a. dependendo do condado. Baltimore City realiza leilão próprio com alto volume e taxas elevadas.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Depósito antecipado obrigatório (tipicamente $1.000–$5.000)',
      'Proprietários com impostos atrasados no condado não podem licitar',
      'Baltimore City tem plataforma e regras próprias',
    ],
    estrategias: [],
  },
  {
    abbr: 'MA', nome: 'Massachusetts', tipo: 'tax_lien',
    frequencia: 'Varia por município', resgate: '6 meses',
    notas: 'Processo via Land Court ou Town Meeting. Lien vendido e proprietário tem 6 meses para resgatar.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Processo complexo via Land Court — advogado local altamente recomendado',
      'Volume baixo e processo lento',
    ],
    estrategias: [],
  },
  {
    abbr: 'MI', nome: 'Michigan', tipo: 'tax_deed',
    frequencia: 'Anual (Jul–Ago)', resgate: null,
    notas: 'Processo em 2 etapas: forfeiture (1º ano) + foreclosure (2º ano). Leilões online via plataformas certificadas. Sem resgate após a venda.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro online obrigatório (plataformas certificadas pelo estado)',
      'Entidades com impostos atrasados no Michigan não podem licitar',
      'Pagamento integral exigido no dia do leilão',
    ],
    estrategias: [
      'Compra pré-foreclosure: após o forfeiture (ano 1) mas antes do leilão (ano 2), o proprietário ainda pode negociar a venda diretamente. Investidores abordam os donos nessa janela para comprar o imóvel abaixo do mercado sem enfrentar concorrência no leilão.',
    ],
  },
  {
    abbr: 'MN', nome: 'Minnesota', tipo: 'tax_deed',
    frequencia: 'Anual', resgate: null,
    notas: 'Estado emite a escritura após 3 anos de inadimplência. Leilões organizados por condado.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Processo conduzido pelo condado',
      'Pagamento integral exigido no dia da venda',
    ],
    estrategias: [],
  },
  {
    abbr: 'MS', nome: 'Mississippi', tipo: 'tax_lien',
    frequencia: 'Anual (Ago–Set)', resgate: '2 anos',
    notas: 'Juros de 18% a.a. Após 2 anos sem resgate, comprador do lien tem direito à escritura do imóvel.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro antecipado necessário',
      'Pagamento em dinheiro ou cheque administrativo no dia do leilão',
    ],
    estrategias: [],
  },
  {
    abbr: 'MO', nome: 'Missouri', tipo: 'hibrido',
    frequencia: 'Anual (Ago)', resgate: '1 ano',
    notas: 'Primeiro leilão para recuperação de impostos; imóveis não vendidos vão para leilão de escritura. Juros de 10% a.a.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro antecipado obrigatório',
      'Proprietários com impostos atrasados não podem participar',
    ],
    estrategias: [],
  },
  {
    abbr: 'MT', nome: 'Montana', tipo: 'tax_lien',
    frequencia: 'Anual', resgate: '2–5 anos',
    notas: 'Juros de 10% a.a. Longo período de resgate. Após expirado, investidor solicita escritura via Treasurer\'s Deed.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro no condado necessário',
      'Processo administrativo — sem leilão público formal em muitos condados',
    ],
    estrategias: [],
  },
  {
    abbr: 'NE', nome: 'Nebraska', tipo: 'tax_lien',
    frequencia: 'Anual (Mar)', resgate: '3 anos',
    notas: 'Juros de 14% a.a. Após 3 anos sem resgate, investidor pode solicitar a escritura do imóvel.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro antecipado obrigatório',
      'Pagamento integral exigido após arrematação',
    ],
    estrategias: [],
  },
  {
    abbr: 'NV', nome: 'Nevada', tipo: 'tax_deed',
    frequencia: 'Mensal (varia por condado)', resgate: null,
    notas: 'Clark County (Las Vegas) realiza leilões mensais online. Sem período de resgate após a venda.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro online obrigatório (Clark County: Bid4Assets)',
      'Pagamento integral no dia do leilão — cheque administrativo ou transferência bancária',
    ],
    estrategias: [],
  },
  {
    abbr: 'NH', nome: 'New Hampshire', tipo: 'tax_deed',
    frequencia: 'Varia por município', resgate: null,
    notas: 'Municípios retomam a propriedade após 2 anos de inadimplência e realizam leilão público.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Regras definidas por cada município',
      'Volume muito baixo de leilões públicos',
    ],
    estrategias: [],
  },
  {
    abbr: 'NJ', nome: 'New Jersey', tipo: 'tax_lien',
    frequencia: 'Anual (Dez)', resgate: '2 anos',
    notas: 'Juros de até 18% a.a. + prêmio de até 6%. Um dos estados mais ativos e competitivos para investidores de tax lien.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro antecipado obrigatório com depósito (tipicamente $2.000+)',
      'Mercado muito competitivo — municípios têm regras próprias de registro',
      'Prêmio pago ao município NÃO é reembolsado se o proprietário resgatar',
    ],
    estrategias: [
      'Licitação de prêmio: em NJ os juros são licitados para baixo (de 18% até 0%). Quando chegam a 0%, investidores passam a licitar um "prêmio" em dinheiro pago ao município. O prêmio não é recuperado no resgate — o ganho vem somente dos juros sobre os impostos. Estratégia: licitar prêmio apenas em imóveis onde há alta probabilidade de o proprietário não resgatar.',
    ],
  },
  {
    abbr: 'NM', nome: 'New Mexico', tipo: 'tax_deed',
    frequencia: 'Anual (varia por condado)', resgate: null,
    notas: 'Estado pode vender propriedades após 3 anos de inadimplência. Leilões presenciais nos condados.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro antecipado no condado necessário',
      'Pagamento integral exigido no dia da venda',
    ],
    estrategias: [],
  },
  {
    abbr: 'NY', nome: 'New York', tipo: 'tax_deed',
    frequencia: 'Anual (varia por condado)', resgate: null,
    notas: 'Processo in rem: ação judicial coletiva. NYC realiza leilões anuais com centenas de imóveis de uma só vez.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Processo in rem — advogado local recomendado',
      'NYC: imóveis com violações pendentes podem ter ônus adicionais não eliminados na venda',
      'Registro antecipado necessário para leilões municipais',
    ],
    estrategias: [],
  },
  {
    abbr: 'NC', nome: 'North Carolina', tipo: 'tax_deed',
    frequencia: 'Sob demanda', resgate: null,
    notas: 'Sistema de "upset bid" único: após o leilão, qualquer pessoa pode superar o lance em 5% em até 10 dias. Processo pode se estender por semanas.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Pagamento imediato após confirmação definitiva do lance',
      'Processo pode levar semanas ou meses até confirmação final do bid',
    ],
    estrategias: [
      'Upset bid aberto a todos: qualquer pessoa — não apenas participantes do leilão original — pode fazer um upset bid de 5% acima do lance vencedor dentro de 10 dias. Isso permite entrar em leilões já realizados sem ter participado ao vivo.',
      'Estratégia de cansaço: alguns investidores fazem sucessivos upset bids para desestimular concorrentes, sabendo que cada novo bid reinicia o prazo de 10 dias e exige novo depósito dos outros.',
    ],
  },
  {
    abbr: 'ND', nome: 'North Dakota', tipo: 'tax_lien',
    frequencia: 'Anual', resgate: '3 anos',
    notas: 'Condado retém a propriedade após inadimplência e pode vendê-la via leilão público após o período de resgate.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Volume muito baixo de leilões',
      'Processo administrativo pelo condado',
    ],
    estrategias: [],
  },
  {
    abbr: 'OH', nome: 'Ohio', tipo: 'tax_deed',
    frequencia: 'Anual (varia por condado)', resgate: null,
    notas: 'Processo via Common Pleas ou Probate Court. Condados realizam leilões anuais com alto volume de imóveis.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro antecipado obrigatório (varia por condado)',
      'Proprietários com impostos atrasados no condado não podem licitar',
      'Leilão online disponível em muitos condados (ex: Bid4Assets)',
    ],
    estrategias: [
      'Board of Revision: após arrematar, o novo proprietário pode contestar o valor avaliado do imóvel junto ao Board of Revision do condado, potencialmente reduzindo o IPTU futuro — especialmente útil em imóveis com avaliação acima do mercado.',
    ],
  },
  {
    abbr: 'OK', nome: 'Oklahoma', tipo: 'tax_deed',
    frequencia: 'Anual (Out)', resgate: null,
    notas: 'Treasurer vende o lien; se não resgatado em 2 anos, realiza-se o Tax Deed Sale com escritura direta.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro antecipado obrigatório',
      'Pagamento integral exigido no dia do leilão',
    ],
    estrategias: [],
  },
  {
    abbr: 'OR', nome: 'Oregon', tipo: 'tax_deed',
    frequencia: 'Anual (Out–Nov)', resgate: null,
    notas: 'Condados realizam leilões anuais. Escritura emitida imediatamente após a arrematação.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro antecipado obrigatório no condado',
      'Pagamento integral exigido no dia da arrematação',
    ],
    estrategias: [],
  },
  {
    abbr: 'PA', nome: 'Pennsylvania', tipo: 'tax_deed',
    frequencia: 'Anual (Set) + judicial', resgate: null,
    notas: '2 modalidades: Upset Sale (com ônus remanescentes) e Judicial Sale (sem ônus). Imóveis não vendidos no Upset vão ao Judicial.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Participantes com impostos atrasados na Pensilvânia NÃO podem licitar no Upset Sale',
      'Judicial Sale: sem restrição de delinquência para participação',
      'Registro antecipado obrigatório — prazo geralmente 2 semanas antes do leilão',
    ],
    estrategias: [
      'Judicial Sale elimina hipotecas: diferente do Upset Sale (que mantém ônus remanescentes), a Judicial Sale transfere o imóvel completamente livre de hipotecas e outros gravames — incluindo dívidas de bancos. Permite adquirir imóveis hipotecados por apenas o valor dos impostos devidos.',
    ],
  },
  {
    abbr: 'RI', nome: 'Rhode Island', tipo: 'tax_lien',
    frequencia: 'Varia por município', resgate: '1 ano',
    notas: 'Município pode leiloar o lien ou executar diretamente. Juros de até 18% a.a.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Regras definidas por cada município',
      'Volume baixo de leilões públicos',
    ],
    estrategias: [],
  },
  {
    abbr: 'SC', nome: 'South Carolina', tipo: 'tax_lien',
    frequencia: 'Anual (Nov–Dez)', resgate: '1 ano',
    notas: 'Juros de 3–12% a.a. dependendo do lance. Após 1 ano sem resgate, investidor solicita Tax Deed.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Proprietários com impostos atrasados no condado não podem licitar',
      'Registro antecipado obrigatório',
    ],
    estrategias: [
      'Licitação de taxa: assim como Illinois e NJ, SC leiloa a taxa de juros para baixo. Quem aceitar a menor taxa leva o certificado. Em imóveis muito desejados a taxa pode ir a 3% — mas o ganho real vem se o proprietário não resgatar e o investidor ficar com o imóvel.',
    ],
  },
  {
    abbr: 'SD', nome: 'South Dakota', tipo: 'tax_lien',
    frequencia: 'Anual', resgate: '3–4 anos',
    notas: 'Juros de 10% a.a. com um dos períodos de resgate mais longos dos EUA antes da transferência de escritura.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Processo administrativo pelo condado',
      'Volume baixo — mercado menos ativo',
    ],
    estrategias: [],
  },
  {
    abbr: 'TN', nome: 'Tennessee', tipo: 'tax_deed',
    frequencia: 'Anual (varia por condado)', resgate: null,
    notas: 'Processo via Chancery Court. Condados como Shelby realizam leilões online. Escritura após confirmação judicial.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro antecipado obrigatório',
      'Leilão online disponível em condados como Shelby (Memphis)',
      'Processo judicial — advogado local recomendado',
    ],
    estrategias: [],
  },
  {
    abbr: 'TX', nome: 'Texas', tipo: 'tax_deed',
    frequencia: 'Mensal (1ª terça-feira)', resgate: '6 meses a 2 anos',
    notas: 'Leilões na escadaria do tribunal, todo 1º terça do mês. Imóvel comercial/não-homestead: 6 meses de resgate. Homestead (residência principal) e terra agrícola: 2 anos de resgate.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Participantes com impostos atrasados no Texas NÃO podem licitar',
      'Pagamento integral no dia do leilão (cheque administrativo ou dinheiro)',
      'Homestead e terra agrícola: resgate de até 2 anos — NÃO faça reformas nem invista no imóvel durante esse período',
      'Imóvel comercial / não-homestead: resgate de 6 meses',
      'Direito de resgate (Tax Code §34.21): ex-proprietário recompra pagando o valor do leilão + 25% (1º ano) ou + 50% (2º ano) — não é possível impedir',
    ],
    estrategias: [
      'Cessão do direito de resgate: o ex-proprietário pode vender o direito de resgate a terceiros. Você paga ao ex-dono um valor pela cessão (ex: $5.000), exerce o resgate pagando ao arrematante o valor do leilão + 25%, e adquire o imóvel abaixo do mercado.',
      'Propriedades "struck off": imóveis que não foram vendidos no leilão são transferidos à entidade tributária (condado, cidade, escola). Essas entidades vendem diretamente ao público — sem leilão, sem concorrência — geralmente pelo valor dos impostos devidos.',
    ],
  },
  {
    abbr: 'UT', nome: 'Utah', tipo: 'tax_deed',
    frequencia: 'Anual (Mai–Jun)', resgate: null,
    notas: 'Processo via County Auditor. Escritura direta ao arrematante; sem período de resgate após a venda.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro antecipado no condado necessário',
      'Pagamento integral exigido no dia da venda',
    ],
    estrategias: [],
  },
  {
    abbr: 'VT', nome: 'Vermont', tipo: 'tax_lien',
    frequencia: 'Varia por município', resgate: '1 ano',
    notas: 'Municípios conduzem o processo individualmente. Após 1 ano sem resgate, escritura pode ser transferida ao investidor.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Regras definidas por cada município',
      'Volume muito baixo de leilões públicos',
    ],
    estrategias: [],
  },
  {
    abbr: 'VA', nome: 'Virginia', tipo: 'tax_deed',
    frequencia: 'Anual (varia por localidade)', resgate: null,
    notas: 'Processo judicial via Circuit Court. Escritura emitida após confirmação. Algumas localidades usam leilão público presencial.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Processo 100% judicial — advogado local necessário',
      'Registro antecipado necessário para leilões do condado',
    ],
    estrategias: [],
  },
  {
    abbr: 'WA', nome: 'Washington', tipo: 'tax_deed',
    frequencia: 'Anual (Fev–Mar)', resgate: null,
    notas: 'Treasurer\'s Deed Sale anual por condado. Lance mínimo inclui todos os impostos devidos + taxas. Sem resgate após a venda.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro antecipado obrigatório',
      'Pagamento integral exigido no dia do leilão (cheque administrativo)',
    ],
    estrategias: [],
  },
  {
    abbr: 'WV', nome: 'West Virginia', tipo: 'hibrido',
    frequencia: 'Anual (Out–Nov)', resgate: '18 meses (lien) / sem resgate (deed)',
    notas: 'Primeiro leiloa liens em outubro; propriedades não resgatadas vão para leilão de escritura em novembro.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Registro antecipado obrigatório para ambos os leilões (lien e deed)',
      'Processo em dois estágios — acompanhe o calendário do condado',
    ],
    estrategias: [],
  },
  {
    abbr: 'WI', nome: 'Wisconsin', tipo: 'tax_deed',
    frequencia: 'Anual', resgate: null,
    notas: 'Condados retomam a propriedade após 2 anos de inadimplência e realizam leilão público via County Treasurer.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Processo conduzido pelo County Treasurer',
      'Pagamento integral exigido no dia da venda',
    ],
    estrategias: [],
  },
  {
    abbr: 'WY', nome: 'Wyoming', tipo: 'tax_lien',
    frequencia: 'Anual', resgate: '4 anos',
    notas: 'Juros de 15% a.a. Um dos períodos de resgate mais longos dos EUA, o que reduz o risco para o proprietário.',
    restricoes: [
      'Sem exigência de residência no estado',
      'Volume muito baixo de leilões — estado pouco populoso',
      'Processo administrativo pelo condado',
    ],
    estrategias: [],
  },
]

const TIPO_CONFIG = {
  tax_deed: { label: 'Tax Deed', bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-200' },
  tax_lien: { label: 'Tax Lien', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  hibrido:  { label: 'Híbrido',  bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
}

const FILTROS = [
  { value: 'todos',    label: 'Todos os estados' },
  { value: 'tax_deed', label: 'Tax Deed' },
  { value: 'tax_lien', label: 'Tax Lien' },
  { value: 'hibrido',  label: 'Híbrido' },
]

type Panel = 'regras' | 'estrategias'

export default function StatesGuide() {
  const [filtro, setFiltro] = useState<string>('todos')
  const [expanded, setExpanded] = useState<Map<string, Panel>>(new Map())

  const visíveis = filtro === 'todos' ? ESTADOS : ESTADOS.filter(e => e.tipo === filtro)

  const counts = {
    tax_deed: ESTADOS.filter(e => e.tipo === 'tax_deed').length,
    tax_lien: ESTADOS.filter(e => e.tipo === 'tax_lien').length,
    hibrido:  ESTADOS.filter(e => e.tipo === 'hibrido').length,
  }

  function togglePanel(abbr: string, panel: Panel) {
    setExpanded(prev => {
      const next = new Map(prev)
      if (next.get(abbr) === panel) {
        next.delete(abbr)
      } else {
        next.set(abbr, panel)
      }
      return next
    })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Guia por Estado</h1>
        <p className="text-gray-500 text-sm">Como funcionam os leilões de imóveis em cada um dos 50 estados americanos</p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { tipo: 'tax_deed' as Tipo, desc: 'Escritura transferida direto na venda' },
          { tipo: 'tax_lien'  as Tipo, desc: 'Certificado de lien com período de resgate' },
          { tipo: 'hibrido'   as Tipo, desc: 'Combinação dos dois sistemas' },
        ].map(({ tipo, desc }) => {
          const cfg = TIPO_CONFIG[tipo]
          return (
            <button
              key={tipo}
              onClick={() => setFiltro(filtro === tipo ? 'todos' : tipo)}
              className={`text-left p-4 rounded-xl border transition-all shadow-sm ${
                filtro === tipo ? `${cfg.bg} ${cfg.border} border-2` : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
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
            {f.value !== 'todos' && <span className="ml-1.5 opacity-70">({counts[f.value as Tipo]})</span>}
          </button>
        ))}
        <span className="text-sm text-gray-400 ml-2">{visíveis.length} estado{visíveis.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visíveis.map(estado => {
          const cfg = TIPO_CONFIG[estado.tipo]
          const activePanel = expanded.get(estado.abbr)
          return (
            <div key={estado.abbr} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-5">
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

                <div className="mb-2">
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Frequência</div>
                  <div className="text-sm font-medium text-gray-800">{estado.frequencia}</div>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Período de resgate</div>
                  <div className="text-sm font-medium text-gray-800">
                    {estado.resgate ?? <span className="text-gray-400">Sem resgate</span>}
                  </div>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-50 pt-3">
                  {estado.notas}
                </p>

                {/* Toggle buttons */}
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={() => togglePanel(estado.abbr, 'regras')}
                    className={`flex items-center gap-1 text-xs font-semibold transition-opacity ${
                      activePanel === 'regras' ? 'text-[#002868]' : 'text-gray-400 hover:text-[#002868]'
                    }`}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: activePanel === 'regras' ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    Regras
                  </button>
                  {estado.estrategias.length > 0 && (
                    <button
                      onClick={() => togglePanel(estado.abbr, 'estrategias')}
                      className={`flex items-center gap-1 text-xs font-semibold transition-opacity ${
                        activePanel === 'estrategias' ? 'text-amber-600' : 'text-gray-400 hover:text-amber-600'
                      }`}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: activePanel === 'estrategias' ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      Estratégias
                    </button>
                  )}
                </div>
              </div>

              {/* Regras expandidas */}
              {activePanel === 'regras' && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 rounded-b-xl">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Regras de participação</div>
                  <ul className="space-y-1.5">
                    {estado.restricoes.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed">
                        <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-[#002868]/10 text-[#002868] flex items-center justify-center font-bold text-[10px]">
                          {i + 1}
                        </span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Estratégias expandidas */}
              {activePanel === 'estrategias' && (
                <div className="border-t border-amber-100 px-5 py-4 bg-amber-50 rounded-b-xl">
                  <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Estratégias de investimento</div>
                  <ul className="space-y-3">
                    {estado.estrategias.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-amber-900 leading-relaxed">
                        <span className="mt-0.5 shrink-0 text-amber-500">💡</span>
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
