# GeoAlt | Inteligência Geográfica de Precisão 🌍

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

**GeoAlt** é uma plataforma profissional para conversão de altitudes geodésicas baseada no modelo **hgeoHNOR2020** do IBGE. Desenvolvida para engenheiros, agrimensores e profissionais da geoinformação que buscam precisão, velocidade e uma interface intuitiva.

---

## ✨ Principais Diferenciais

### 1. 🚀 Alta Performance em Lote
Processe milhares de coordenadas simultaneamente via upload de CSV, com mapeamento inteligente de colunas e geocodificação reversa automática (OpenStreetMap).

### 2. 🗺️ Inteligência de Mapa Avançada
- **Clustering de Marcadores**: Visualização fluida de grandes conjuntos de dados.
- **Cores por Altitude**: Identificação visual instantânea da topografia (Azul < 100m, Verde < 500m, Âmbar < 1000m, Vermelho > 1000m).
- **Rede RBMC**: Camada integrada com as estações da Rede Brasileira de Monitoramento Contínuo (IBGE) com links diretos para dados operacionais.
- **Suporte a Shapefiles**: Sobreponha áreas de projeto (.zip) diretamente no mapa.

### 3. 📊 Análise Espacial MDT
Gráfico de dispersão dinâmica para análise de pontos não alinhados, permitindo comparar visualmente a Altitude Geométrica (h), Ortométrica (H) e a Ondulação Geoidal (N).

### 4. 📄 Relatórios Profissionais
Geração de laudos técnicos em PDF com mapas, coordenadas detalhadas e data/hora, prontos para anexar a processos e projetos.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Tailwind CSS, Motion (framer-motion).
- **Mapas**: Leaflet, React-Leaflet, MarkerCluster, WMS IBGE.
- **Dados**: Papaparse (CSV), shpjs (Shapefiles), Recharts (Gráficos).
- **Exportação**: jsPDF, html2canvas (Relatórios).

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
- Node.js (v18 ou superior)
- npm ou yarn

### Instalação
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/geoaltitude.git

# Entre na pasta
cd geoaltitude

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

---

## 📜 Licença

Este projeto está licenciado sob a **Apache License 2.0** - veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 📧 Contato & Suporte

Desenvolvido para transformar dados geodésicos em decisões estratégicas. 

> [!IMPORTANT]
> Os cálculos de altitude baseiam-se na API oficial do IBGE (hgeoHNOR2020). Certifique-se da precisão dos seus dados de entrada (Latitude/Longitude em SIRGAS2000).

---
*GeoAlt - Precisão que mapeia o futuro.*
