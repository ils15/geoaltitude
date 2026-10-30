# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e
versionamento [SemVer](https://semver.org/lang/pt-BR/) (`MAJOR.MINOR.PATCH`).

## [1.0.0] — 2026-10-30

### Adicionado
- Núcleo geodésico próprio validado contra o PROJ: UTM ↔ geográficas (Krüger 6ª
  ordem), LTM (Transversa Local), ECEF, datums (SIRGAS2000, WGS84, SAD69/96,
  SAD69 clássico, Córrego Alegre EPSG:6193), GMS, unidades (m/km/ft/ftUS/mi),
  distância geodésica de Vincenty e fator k grade ↔ terreno.
- Modelos geoidais: **hgeoHNOR** (API oficial IBGE, lote ~200 pts/chamada),
  **EGM96** e **EGM2008** (NGA, avaliados localmente, offline após 1º uso).
- Altimetria h/H/N com comparação lado a lado entre modelos e incerteza.
- Processamento em lote: CSV, XLSX, GeoJSON, KML e modo colar; altitudes
  estimadas pelo DEM aberto (Copernicus GLO-90 via Open-Meteo); cancelamento e
  relatório de falhas exportável.
- Mapa interativo (Leaflet): clustering, RBMC, shapefile com reprojeção,
  desenho com medições geodésicas e perfil do terreno por linha desenhada.
- Visualizações: Perfil H com faixa de discrepância sincronizada e Discrepância N.
- Conversões offline completas no painel (Coordenadas, Altimetria, Datum,
  Medidas), incluindo ITRF2000 ↔ ITRF2014 com época (14 parâmetros).
- Exportação CSV/KML/DXF (UTM com rótulos e rota) e relatório PDF programático.
- PWA instalável e offline; tema claro/escuro/sistema; demo de 13 pontos com
  tutorial; projeto salvável `.geoalt.json` e sessão compartilhável por URL.
- CI (typecheck + 597 testes + ESLint + E2E Playwright) e deploy automático.

[1.0.0]: https://github.com/ils15/geoaltitude/releases/tag/v1.0.0
