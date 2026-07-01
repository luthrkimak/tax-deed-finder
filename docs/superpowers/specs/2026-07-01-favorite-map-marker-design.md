# Design: Marcador de Estrela para Favoritos no Mapa

**Data:** 2026-07-01
**Status:** Aprovado

## Objetivo

Quando um usuário favorita um leilão, o marcador correspondente no mapa de busca deve virar uma estrela dourada, para que favoritos sejam fáceis de identificar visualmente entre os demais pins.

## Contexto

- O mapa (`frontend/src/components/AuctionMap.tsx`) usa `react-leaflet` + `react-leaflet-cluster`, com ícones `L.divIcon` customizados por tipo de leilão (`PIN_COLORS`, `makeIcon`, `ICONS`).
- Os pins vêm do endpoint público `GET /auctions/pins` (`PinData`: `id, lat, lng, type, state, address, min_bid, assessed_value, approximate?`) — não inclui status de favorito, pois é um endpoint sem autenticação.
- `Search.tsx` já mantém localmente o estado `favoriteIds: Set<string>` (populado via `apiClient.listFavorites()` quando há sessão ativa) e a função `toggleFavorite(auction)`, hoje usados apenas para o `AuctionCard`. `AuctionMap` não recebe esse estado.
- Não há necessidade de alterar o backend: o cliente já tem os dados de favoritos disponíveis; basta propagá-los para o componente de mapa.

## Escopo

- `AuctionMap` é usado apenas em `Search.tsx`. Esta é a única tela afetada.
- Fora do escopo: variante de ícone para favoritos "aproximados" (pins sem geocode exato, no centro do condado) — recebem a mesma estrela cheia dos demais, sem tratamento visual diferenciado para a aproximação.
- Fora do escopo: alterações no endpoint `/auctions/pins` ou no schema do backend.

## Mudanças

### 1. Refactor: `toggleFavorite` passa a receber `auctionId: string`

Hoje, em `Search.tsx`, `toggleFavorite(auction: Auction)` usa apenas `auction.id` internamente. Como os pins do mapa (`PinData`) não carregam o objeto `Auction` completo, a assinatura muda para `toggleFavorite(auctionId: string)`. O único outro call site (`AuctionCard`) é ajustado para passar `auction.id` em vez do objeto.

### 2. Novas props em `AuctionMap`

`AuctionMap` passa a receber:
- `favoriteIds: Set<string>`
- `onToggleFavorite: (auctionId: string) => void`

`Search.tsx` passa seu estado/função já existentes:
```tsx
<AuctionMap filters={filters} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} />
```

### 3. Ícone de estrela dourada

Novo ícone `L.divIcon` (estrela cheia, dourado/amarelo — ex: `#eab308`), construído com o mesmo padrão de `makeIcon` já existente, adicionado ao lookup `ICONS` (ex: chave `favorite`).

### 4. Seleção de ícone no marcador

Na renderização de cada `<Marker>`, se `favoriteIds.has(pin.id)`, usa `ICONS.favorite` — substituindo completamente o ícone por tipo/aproximação (não há combinação de estrela + cor de tipo).

```tsx
icon={
  favoriteIds.has(pin.id)
    ? ICONS.favorite
    : pin.approximate ? (ICONS[`${pin.type}_approx`] ?? ICONS.default_approx) : (ICONS[pin.type] ?? ICONS.default)
}
```

### 5. Botão de remover favorito no popup

O conteúdo do `<Popup>` de um marcador favoritado ganha um botão "Remover dos favoritos", que chama `onToggleFavorite(pin.id)`. Marcadores não favoritados mantêm o popup como está hoje (sem botão de favoritar a partir do mapa — favoritar continua sendo feito pelo `AuctionCard`).

### 6. Legenda do mapa

A legenda existente (baseada em `PIN_COLORS`) ganha uma entrada extra para "Favorito" com a cor/ícone de estrela.

## Testes

- Feature é de UI (mapa interativo) — validação principal é manual: rodar o dev server, favoritar um leilão pelo `AuctionCard`, confirmar que o pin correspondente vira estrela dourada no mapa, abrir o popup e remover o favorito pelo botão, confirmar que o pin volta ao ícone por tipo.
- Testes automatizados (se o projeto já tiver testes de componente para `AuctionMap`/`Search`) devem cobrir: seleção do ícone `ICONS.favorite` quando `favoriteIds.has(pin.id)` é verdadeiro; chamada de `onToggleFavorite` ao clicar no botão do popup.
