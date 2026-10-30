# GeoAlt | Enterprise Geodetic Solution 🌐

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Model: hgeoHNOR2020](https://img.shields.io/badge/IBGE-hgeoHNOR2020-green)](https://www.ibge.gov.br/)
[![Standards: SIRGAS2000](https://img.shields.io/badge/Geodesy-SIRGAS2000-gold)](https://www.sirgas.org/)

**GeoAlt** é uma plataforma de inteligência geográfica projetada para a conversão de alta precisão entre altitudes geométricas (GNSS) e ortométricas. Utilizando o motor oficial **hgeoHNOR2020** do IBGE, o sistema provê a ponte fundamental entre a medição satelital e a realidade física do terreno.

🌐 **Demo online:** [ils15.github.io/geoaltitude](https://ils15.github.io/geoaltitude/)

🗓️ **Roadmap de evolução:** [`ROADMAP.md`](ROADMAP.md) — plano estruturado em 5 fases (CI/E2E, entrada de dados, ferramentas do topógrafo, produto em campo, geodésia profunda).

## 🚀 Demo rápido (1 minuto)

1. Abra a aba **Lote (CSV)** e clique em **“Usar dados de exemplo”** — 13 pontos pelo Brasil (do Pão de Açúcar ao Pico da Neblina), com `h` derivada do modelo geoidal real.
2. Confirme o mapeamento e clique em **Processar Agora**: o app consulta o modelo **hgeoHNOR** do IBGE em lote (~200 pontos por chamada) e calcula `H = h − N`.
3. Explore mapa colorido por altitude, perfil altimétrico, superfície 3D e exportação CSV/KML/**DXF em UTM**.
4. Na aba **Conversões**, teste UTM ↔ geográficas, datums (SAD69(96) → SIRGAS2000 com parâmetros oficiais IBGE), altimetria h/H/N e distâncias — tudo offline, validado por 538 testes contra o PROJ.

Arquivo de exemplo: [`public/exemplos/geoalt_demo.csv`](public/exemplos/geoalt_demo.csv) (ou baixe direto do app, na aba Entenda).
Curiosidades dos dados: em Belém o `h` elipsoidal fica **negativo** (N ≈ −25,7 m); no Sul N é **positivo** (+4 a +5 m); no oeste amazônico a API responde com o fallback `MAPGEO2015_OESTE`.

---

## 🏗️ Arquitetura e Fluxo de Dados

```mermaid
graph TD
    A[Upload CSV/Shapefile] --> B{Validação & Mapping}
    B --> C[Processamento em Lote]
    C --> D[API IBGE hgeoHNOR2020]
    D --> E[Geocodificação Reversa OSM]
    E --> F[Dashboard de Análise Espacial]
    F --> G[Relatórios PDF & Exportação]
```

## 📐 Fundamentos Geodéticos

O GeoAlt resolve a complexidade da ondulação geoidal brasileira. Enquanto receptores GNSS medem a distância até o elipsoide matemático (**h**), projetos de engenharia exigem a altitude referenciada ao nível médio do mar (**H**).

**Equação Fundamental:**  
`H = h - N`

Onde:
- **H**: Altitude Ortométrica (Nível Médio do Mar / Imbituba)
- **h**: Altitude Geométrica (GNSS / SIRGAS2000)
- **N**: Ondulação Geoidal (Modelo hgeoHNOR2020)

## 🛡️ Privacidade e Segurança de Dados

O GeoAlt foi desenvolvido com foco absoluto em privacidade industrial:
- **Zero Data Retention**: Seus dados de coordenadas não são armazenados em nossos servidores.
- **Client-Side Heavy**: O processamento de arquivos (CSV/Shapefile) e a geração de relatórios ocorrem diretamente no seu navegador.
- **Transparência**: Conexões externas são realizadas exclusivamente com as APIs oficiais do IBGE e OpenStreetMap (Nominatim).

## 📊 Biblioteca de Gráficos (Frontend)

A visualização dos dashboards é construída com **React + Recharts**, com foco em leitura geoespacial e contexto topografico.

### Componentes Implementados

- **Perfil de Elevação (Perfil H)**
    - Eixo horizontal em distancia acumulada (km), calculada por Haversine
    - Camada dupla: **H** como area com gradiente e **h** como linha pontilhada
    - Exibe de forma visual a relacao geodesica entre h, H e ondulacao geoidal (N)

- **Planimetria (XY)**
    - Trajeto em coordenadas geograficas com colorizacao por altitude
    - Escala cromatica continua para reforcar mudancas altimetricas
    - Proporcao espacial ajustada para reduzir distorcoes visuais da rota

- **Polimento Visual**
    - Grid horizontal sutil (sem linhas verticais)
    - Destaque de ponto apenas no hover com tooltip tecnico
    - Nota tecnica orientando o uso do modo mapa para projecao cartografica fiel

### Referencia de Implementacao

- `src/components/StatsDashboard.tsx`

---

## 📜 Licença e Conformidade

Este software é distribuído sob a **Apache License 2.0**. Ele está em total conformidade com as normas técnicas brasileiras para georreferenciamento e topografia.

---
*GeoAlt - Precisão Milimétrica para Grandes Decisões.*
