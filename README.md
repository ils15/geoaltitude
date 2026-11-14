# OpenGeoaltitude

Converte altitude geométrica (GNSS) em ortométrica com o modelo geoidal oficial do IBGE — para topógrafos e engenheiros que precisam fechar nivelamento em campo e em escritório.

[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![Demo](https://img.shields.io/badge/demo-ao%20vivo-2ea44f)](https://ils15.github.io/geoaltitude/)
[![Stack](https://img.shields.io/badge/stack-React%2019%20%2B%20TypeScript%20%2B%20Vite-3178c6)](package.json)
[![Geoides](https://img.shields.io/badge/geoides-hgeoHNOR%20%C2%B7%20EGM96%20%C2%B7%20EGM2008-green)](https://servicodados.ibge.gov.br/api/docs)

## O que é

Receptor GNSS entrega altitude elipsoidal (h); projeto, cadastro e obra exigem altitude referida ao nível médio do mar (H). A ponte entre as duas é a ondulação geoidal N, pela relação `H = h − N`, e no Brasil quem define N é o hgeoHNOR do IBGE, referido ao RN2015/Imbituba.

O app resolve isso em lote: importa CSV, KML, GeoJSON, XLSX ou Shapefile, consulta o modelo oficial pela API pública do IBGE, calcula H e mostra mapa, perfil altimétrico e gráfico de discrepância. Para pontos fora da grade ou trabalho sem rede, avalia EGM96 e EGM2008 localmente no navegador.

A aba de conversões cobre UTM, LTM, ECEF, datum (SIRGAS2000, WGS84, SAD69(96), SAD69 clássico, Córrego Alegre) e ITRF2000 ↔ ITRF2014 com época — tudo offline. Do navegador só saem as coordenadas enviadas ao IBGE, ao Nominatim (endereço aproximado) e ao Open-Meteo (elevação de DEM).

## Demo

<https://ils15.github.io/geoaltitude/> — na aba de lote, clique em *Usar dados de exemplo* (13 pontos pelo Brasil) e depois em *Processar Agora*.

Arquivo de exemplo: [`public/exemplos/geoalt_demo.csv`](public/exemplos/geoalt_demo.csv).

## Instalação

```bash
npm install
npm run dev      # Vite em http://localhost:3000
```

Não há chave de API nem backend: a consulta ao IBGE é pública e o processamento é client-side.

## Uso

Na interface, envie um arquivo de pontos com latitude, longitude e altitude elipsoidal:

```csv
latitude,longitude,altitude_elipsoidal,descricao
-22.9492,-43.1545,-1.07,"Rio de Janeiro - Pão de Açúcar (RJ)"
-23.5505,-46.6333,756.84,"São Paulo - Praça da Sé (SP)"
```

O resultado traz N, H e a incerteza do modelo por ponto, com exportação para CSV, KML, DXF em UTM (Z = H) e relatório técnico em PDF. Para gerar a versão de produção:

```bash
npm run build
npm run preview
```

## Estrutura

```
src/lib/          geodésia, modelos geoidais, importação/exportação, relatório PDF
src/components/   mapa, lote, conversões, gráficos
public/geoid/     grade EGM2008 (4,7 MB, baixada sob demanda)
tests/e2e/        Playwright
```

## Licença

Apache 2.0 — veja [`LICENSE`](LICENSE).
