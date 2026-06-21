import { createContext, useContext, useState, type ReactNode } from 'react'

export type Lang = 'pt' | 'en' | 'es'

const translations = {
  pt: {
    // Navbar
    nav_search: 'Busca',
    nav_favorites: 'Favoritos',
    nav_alerts: 'Alertas',
    nav_counties: 'Diretório',
    nav_login: 'Entrar',
    nav_logout: 'Sair',
    // FilterBar
    filter_state: 'Estado',
    filter_county: 'Condado',
    filter_type: 'Tipo',
    filter_property: 'Imóvel',
    filter_min_bid: 'Lance mín. ($)',
    filter_max_bid: 'Lance máx. ($)',
    filter_date_from: 'Data início',
    filter_date_to: 'Data fim',
    filter_all: 'Todos',
    filter_any_county: 'Qualquer',
    filter_any_value: 'Qualquer',
    filter_search: 'Buscar',
    filter_searching: 'Buscando…',
    type_tax_deed: 'Tax Deed',
    type_tax_lien: 'Tax Lien',
    type_foreclosure: 'Foreclosure',
    prop_residential: 'Residencial',
    prop_commercial: 'Comercial',
    prop_land: 'Terreno',
    // AuctionCard
    card_min_bid: 'Lance Mín.',
    card_assessed: 'Avaliado',
    card_date: 'Data',
    card_property: 'Imóvel',
    card_no_address: 'Endereço não disponível',
    // Search
    search_results: 'resultados',
    search_prev: 'Anterior',
    search_next: 'Próximo',
    // AuctionDetail
    detail_back: '← Voltar à busca',
    detail_no_address: 'Endereço não disponível',
    detail_notes: 'Notas Pessoais',
    detail_notes_placeholder: 'Adicione notas sobre este imóvel…',
    detail_save_notes: 'Salvar Notas',
    detail_official: 'Listagem Oficial',
    detail_loading: 'Carregando…',
    detail_not_found: 'Leilão não encontrado.',
    field_min_bid: 'Lance Mín.',
    field_assessed: 'Valor Avaliado',
    field_market: 'Estimativa de Mercado',
    field_debt: 'Dívida Pendente',
    field_tax: 'Imposto Devido',
    field_interest: 'Taxa de Juros',
    field_date: 'Data do Leilão',
    field_parcel: 'Parcel ID',
    field_prop_type: 'Tipo de Imóvel',
    field_status: 'Status',
  },
  en: {
    nav_search: 'Search',
    nav_favorites: 'Favorites',
    nav_alerts: 'Alerts',
    nav_counties: 'Directory',
    nav_login: 'Login',
    nav_logout: 'Logout',
    filter_state: 'State',
    filter_county: 'County',
    filter_type: 'Type',
    filter_property: 'Property',
    filter_min_bid: 'Min Bid ($)',
    filter_max_bid: 'Max Bid ($)',
    filter_date_from: 'Date from',
    filter_date_to: 'Date to',
    filter_all: 'All',
    filter_any_county: 'Any county',
    filter_any_value: 'Any',
    filter_search: 'Search',
    filter_searching: 'Searching…',
    type_tax_deed: 'Tax Deed',
    type_tax_lien: 'Tax Lien',
    type_foreclosure: 'Foreclosure',
    prop_residential: 'Residential',
    prop_commercial: 'Commercial',
    prop_land: 'Land',
    card_min_bid: 'Min Bid',
    card_assessed: 'Assessed',
    card_date: 'Date',
    card_property: 'Property',
    card_no_address: 'Address not available',
    search_results: 'results',
    search_prev: 'Previous',
    search_next: 'Next',
    detail_back: '← Back to search',
    detail_no_address: 'Address not available',
    detail_notes: 'Personal Notes',
    detail_notes_placeholder: 'Add notes about this property…',
    detail_save_notes: 'Save Notes',
    detail_official: 'Official Listing',
    detail_loading: 'Loading…',
    detail_not_found: 'Auction not found.',
    field_min_bid: 'Min Bid',
    field_assessed: 'Assessed Value',
    field_market: 'Market Estimate',
    field_debt: 'Outstanding Debt',
    field_tax: 'Tax Owed',
    field_interest: 'Interest Rate',
    field_date: 'Auction Date',
    field_parcel: 'Parcel ID',
    field_prop_type: 'Property Type',
    field_status: 'Status',
  },
  es: {
    nav_search: 'Búsqueda',
    nav_favorites: 'Favoritos',
    nav_alerts: 'Alertas',
    nav_counties: 'Directorio',
    nav_login: 'Ingresar',
    nav_logout: 'Salir',
    filter_state: 'Estado',
    filter_county: 'Condado',
    filter_type: 'Tipo',
    filter_property: 'Propiedad',
    filter_min_bid: 'Oferta mín. ($)',
    filter_max_bid: 'Oferta máx. ($)',
    filter_date_from: 'Fecha inicio',
    filter_date_to: 'Fecha fin',
    filter_all: 'Todos',
    filter_any_county: 'Cualquier',
    filter_any_value: 'Cualquier',
    filter_search: 'Buscar',
    filter_searching: 'Buscando…',
    type_tax_deed: 'Tax Deed',
    type_tax_lien: 'Tax Lien',
    type_foreclosure: 'Ejecución',
    prop_residential: 'Residencial',
    prop_commercial: 'Comercial',
    prop_land: 'Terreno',
    card_min_bid: 'Oferta Mín.',
    card_assessed: 'Tasado',
    card_date: 'Fecha',
    card_property: 'Propiedad',
    card_no_address: 'Dirección no disponible',
    search_results: 'resultados',
    search_prev: 'Anterior',
    search_next: 'Siguiente',
    detail_back: '← Volver a búsqueda',
    detail_no_address: 'Dirección no disponible',
    detail_notes: 'Notas Personales',
    detail_notes_placeholder: 'Agrega notas sobre esta propiedad…',
    detail_save_notes: 'Guardar Notas',
    detail_official: 'Listado Oficial',
    detail_loading: 'Cargando…',
    detail_not_found: 'Subasta no encontrada.',
    field_min_bid: 'Oferta Mín.',
    field_assessed: 'Valor Tasado',
    field_market: 'Estimado de Mercado',
    field_debt: 'Deuda Pendiente',
    field_tax: 'Impuesto Adeudado',
    field_interest: 'Tasa de Interés',
    field_date: 'Fecha de Subasta',
    field_parcel: 'Parcel ID',
    field_prop_type: 'Tipo de Propiedad',
    field_status: 'Estado',
  },
} satisfies Record<Lang, Record<string, string>>

type T = typeof translations.en

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: T
}

const I18nContext = createContext<I18nCtx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('pt')
  return (
    <I18nContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}

export const LANG_OPTIONS: { value: Lang; flag: string; label: string }[] = [
  { value: 'pt', flag: '🇧🇷', label: 'Português' },
  { value: 'en', flag: '🇺🇸', label: 'English' },
  { value: 'es', flag: '🇪🇸', label: 'Español' },
]
