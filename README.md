# GeoAlt | Enterprise Geodetic Solution 🌐

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Model: hgeoHNOR2020](https://img.shields.io/badge/IBGE-hgeoHNOR2020-green)](https://www.ibge.gov.br/)
[![Standards: SIRGAS2000](https://img.shields.io/badge/Geodesy-SIRGAS2000-gold)](https://www.sirgas.org/)

**GeoAlt** é uma plataforma de inteligência geográfica projetada para a conversão de alta precisão entre altitudes geométricas (GNSS) e ortométricas. Utilizando o motor oficial **hgeoHNOR2020** do IBGE, o sistema provê a ponte fundamental entre a medição satelital e a realidade física do terreno.

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

---

## 📜 Licença e Conformidade

Este software é distribuído sob a **Apache License 2.0**. Ele está em total conformidade com as normas técnicas brasileiras para georreferenciamento e topografia.

---
*GeoAlt - Precisão Milimétrica para Grandes Decisões.*
