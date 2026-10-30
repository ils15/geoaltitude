# GeoAlt — Roadmap de Evolução

> Plano de trabalho estruturado para a próxima etapa do projeto, na ordem acordada:
> **1** rede de segurança → **2** entrada sem atrito → **3** ferramentas do topógrafo → **4** produto em campo → **5** geodésia profunda.
>
> **Como trabalhar:** cada fase é entregue em commits separados (uma tarefa = um commit), com testes para tudo que for lógica, `npm run lint` + `npm run lint:eslint` + `npm test` + `npm run e2e` + `npm run build` verdes antes de cada push, deploy automático pelo GitHub Pages ao pushar em `main`, e **atualização deste documento** (checkbox ✅ + data) ao concluir cada item.
>
> **Legenda de esforço:** S ≈ até meio dia · M ≈ 1 dia · G ≈ 2+ dias (estimativas com margem para pesquisa).

| Fase | Tema | Itens | Esforço | Status |
|---|---|---|---|---|
| 1 | Rede de segurança (CI + E2E + higiene) | 5 | M–G | ✅ **concluída** (2026-10-30) |
| 2 | Entrada de dados sem atrito | 5 | G | ✅ **concluída** (2026-10-30) |
| 3 | Ferramentas do topógrafo | 5 | G | ✅ **concluída** (2026-10-30) |
| 4 | Produto em campo (PWA, PDF, projeto) | 3 + 1 opcional | M–G | ✅ **concluída** (2026-10-30) |
| 5 | Geodésia profunda | 4 | G | ✅ fechada (F5.1 ✅ · F5.3 ✅ · F5.4 ✅ · F5.2 ⛔ bloqueada externamente — ver nota) |

**Linha de base pós-execução (2026-10-30):** 602 testes unitários + 3 E2E · CI unificado (verify → build → deploy) · ESLint tipo-checado zero erros · `strict: true` · zero `any` estrutural · PWA instalável · deploy contínuo em `https://ils15.github.io/geoaltitude/`.

---

## Fase 1 — Rede de segurança: CI, E2E e higiene de código ✅

**Objetivo:** impedir regressões como as duas que já escaparam para produção (botão do demo desabilitado, malha 3D). Bugs de interação não são pegos por testes unitários — precisam de CI obrigatório + um E2E do fluxo demo.

### F1.1 — Workflow de CI com testes obrigatórios ✅
- [x] Workflow único `ci.yml`: job `verify` (typecheck → unitários → ESLint → E2E) → `build` → `deploy` (só em `main`);
- [x] Deploy só acontece com `verify` verde; antigo `deploy-pages.yml` removido;
- [x] Badge de status no README — *pendente* (adicionar quando conveniente).

**Aceite:** push com teste falhando não publica o site. ✔ (encadeamento por `needs`)

### F1.2 — E2E do fluxo demo com Playwright ✅
- [x] `@playwright/test` + `playwright.config.ts` (Chromium, webServer automático do `npm run dev`);
- [x] Mocks com `page.route` (IBGE/Nominatim determinísticos, tiles abortados);
- [x] 3 E2E: fluxo demo completo (exemplo → processar → 13 resultados → mapa com ⌖), matemática das conversões (SP → 23S 333287.915; H=154), busca de endereço preenchendo GMS;
- [x] `npm run e2e`; roda no CI (só Chromium).

**Aceite:** smoke completo em ~5 s local e no CI. ✔

### F1.3 — ESLint + Prettier ✅
- [x] ESLint 9 flat config com `typescript-eslint` tipo-checado + `eslint-plugin-react-hooks` v6 (regras do Compiler: `set-state-in-effect`, `refs`, `static-components`...) e `no-floating-promises` como erro;
- [x] Prettier (aspas simples, 120 colunas) + formatação aplicada;
- [x] Estoque zerado: **0 erros / 0 warnings** (inclui correções estruturais: tooltips extraídos para escopo de módulo, mutação no render removida, reset por ajuste-de-estado-no-render).

**Aceite:** `npm run lint:eslint` zero. ✔

### F1.4 — TypeScript `strict: true` ✅
- [x] `strict: true` ativo; 56 erros corrigidos (unions discriminadas no painel de conversões, type guards, `@types/react-dom`, `@types/geojson`);
- [x] Handlers do leaflet-draw tipados com `L.DrawEvents.*`.

**Aceite:** `tsc --noEmit` verde com strict. ✔

### F1.5 — Eliminar `any` estrutural ✅
- [x] `shapefileData` → `GeoJSON.FeatureCollection | FeatureCollection[]`;
- [x] `parsedData` → `Record<string, string>[]`;
- [x] RBMC validado campo a campo; respostas de geocoding/openServices narrowed em runtime; declaração própria para `shpjs`.

**Aceite:** nenhum `any` estrutural restante (só `catch` → `errorMessage(err)`). ✔

---

## Fase 2 — Entrada de dados sem atrito ✅

### F2.1 — "Modo colar" no lote ✅
- [x] `src/lib/pasteParser.ts`: decimais (ponto ou vírgula), GMS, separadores vírgula/`;`/tab; resolução da ambiguidade da vírgula pt-BR (pré-normalização de GMS + reemparelhamento quando >3 campos);
- [x] Botão "Colar coordenadas" com diálogo e contagem ao vivo de válidas/inválidas;
- [x] 8 testes (Excel, cabeçalho, lixo, GMS com vírgula).

**Aceite:** colar linhas mistas processa; inválidas contadas antes. ✔ *(2 bugs de ambiguidade pegos pelos testes antes de chegar ao usuário)*

### F2.2 — Importar XLSX ✅
- [x] `xlsx` (SheetJS) com import dinâmico (chunk separado, só carrega ao usar);
- [x] Primeira aba não vazia → mesmo fluxo de mapeamento; aliases reutilizados.

### F2.3 — Importar GeoJSON e KML ✅
- [x] `src/lib/geoImport.ts`: GeoJSON (FC/Feature/geometria — primeiro vértice de polígonos), KML via DOMParser;
- [x] Reimporta o KML exportado pelo próprio app (teste de round-trip);
- [x] 13 testes com fixtures.

**Aceite:** KML do GeoAlt reimporta com os mesmos pontos. ✔

### F2.4 — Completar altitudes com DEM em lote ✅
- [x] `fetchTerrainElevationBatch` (100 coords/chamada, ordem preservada, nulls alinhados);
- [x] Checkbox no mapeamento quando não há coluna h; pontos marcados `h estimada (DEM)`; aviso de precisão (±10 m).

**Aceite:** CSV sem h processa com h do DEM e banner de origem. ✔

### F2.5 — Relatório de falhas + cancelamento ✅
- [x] `AbortController` + botão "Cancelar processamento";
- [x] Falhas com motivo por ponto (não numérico, fora do Brasil, fora da grade, erro IBGE) → botão "Falhas (n)" exporta `geoalt_falhas.csv`.

---

## Fase 3 — Ferramentas do topógrafo ✅

### F3.1 — Distância grade ↔ terreno (fator k) ✅
- [x] `src/lib/gridGround.ts`: k = k_UTM (medido numericamente do nosso núcleo de projeção, par de teste de 500 m L-O) × k_altitude (R/(R+H) com raio médio na latitude);
- [x] **`geodesicDistance` (Vincenty inverso, ~0,5 mm)** adicionada ao núcleo com o caso especial equatorial; vetores: equador 1° = 111 319,4908 m e par pyproj `Geod.inv` = 500,2651 m;
- [x] Card "Distância grade ↔ terreno" na sub-aba Medidas (entrada lat/lon/H/distância, direção grade↔terreno);
- [x] k_Utm em SP = 0.999942 conferido com PROJ (500.2362/500.2651).

**Aceite:** SP 760 m → k combinado ≈ 0.999823. ✔

### F3.2 — LTM (Transversa Local) ✅
- [x] Núcleo generalizado: `transverseMercatorForward/Inverse({lon0, k0, FE, FN})`; UTM virou caso particular (`utmParams`) — regressão UTM toda verde;
- [x] `geographicToLTM/ltmToGeographic` com padrão brasileiro (k0=1, FE 50 km, FN 10 000 km S);
- [x] Modo "LTM (local)" no painel: MC/k0/FE editáveis, direta e inversa lado a lado;
- [x] 3 vetores pyproj `+proj=tmerc` + round-trip em grade (< 1 mm).

### F3.3 — Córrego Alegre ✅
- [x] Fonte oficial localizada no **proj.db/EPSG:6193** — "Corrego Alegre 1970-72 to SIRGAS 2000 (2)": Helmert **(−206.05, +168.28, −3.82)**, acurácia 5 m, elipsoide International 1924;
- [x] `CORREGO_ALEGRE` em `DATUMS` com nota citando EPSG:6193 **e** a grade oficial IBGE `CA7072_003` (R.PR 01/2015, ~2 m) como método de maior exatidão;
- [x] 2 testes com vetores do pipeline equivalente.

### F3.4 — Perfil do terreno ao longo de linha desenhada ✅
- [x] Botão "Perfil do terreno (DEM aberto)" nas medições de polilinha;
- [x] Amostragem a cada ~90 m (teto 220 amostras) → lote no Open-Meteo;
- [x] Gráfico distância × terreno (área verde) sobre o mapa + export CSV + atribuição da fonte.

### F3.5 — DXF enriquecido ✅
- [x] TEXT com rótulo P1..Pn ao lado de cada POINT (camada GEOALT_ROTULOS);
- [x] LWPOLYLINE tracejada da rota (camada GEOALT_ROTA).

---

## Fase 4 — Produto em campo ✅

### F4.1 — PWA instalável e offline ✅
- [x] `vite-plugin-pwa` (autoUpdate), manifest, precache do app shell;
- [x] CacheFirst para o chunk do EGM96 (modelo global offline após 1º uso) e para respostas do DEM;
- [ ] Nota de instalação na aba Entenda — *pequeno texto pendente*.

### F4.2 — Relatório técnico em PDF limpo ✅
- [x] PDF programático (jsPDF puro): capa (título, data, modelo(s), contagem, nota DEM), resumo H média/mín/máx, tabela zebrada paginada com lat/lon/h/N/H, rodapé em todas as páginas;
- [x] `html2canvas` removido do projeto (risco oklch eliminado).

### F4.3 — Projeto salvável e compartilhável ✅
- [x] Salvar/abrir `.geoalt.json` (validação de app/version);
- [x] Compartilhar por URL: `#p=` (JSON) ou `#pg=` (gzip via CompressionStream + base64url); App restaura com banner "Sessão compartilhada restaurada".

### F4.4 — (Opcional) Deep-links por aba ⬜ não iniciado

---

## Fase 5 — Geodésia profunda 🔶

### F5.1 — EGM2008 ⬜ aberto
- [ ] Definir fonte da grade (NGA 2.5′/5′) e empacotar em chunk lazy;
- [ ] `GeoidModelId` ganha `'EGM2008'`; âncoras via GeoidEval (padrão do EGM96).

### F5.2 — MAPGEO2015 offline ⬜ aberto (depende de pesquisa)
- [ ] Converter a grade oficial do IBGE para formato compacto lazy (~2–3 MB);
- [ ] Validação cruzada com a API do IBGE (mesma fonte, diferença esperada ≈ 0).

### F5.3 — Shapefile com reprojeção ✅
- [x] Verificado: **shpjs já reprojetar para WGS84 usando o .prj do ZIP**; UI informa o comportamento ("com .prj (ex.: UTM SIRGAS2000), a reprojeção é automática").

### F5.4 — SIRGAS/ITRF com época ✅ (2026-10-30, segunda rodada)
- [x] `src/lib/itrf.ts`: Helmert de 14 parâmetros ITRF2000 ↔ ITRF2014 (T=(−0.7, −1.2, +26.1) mm e taxa (−0.1, −0.1, +1.9) mm/ano, DS=−2.12 ppb/−0.11 ppb/ano, t0=2010.0 — valores EPSG do proj.db), convenção position vector, elipsoide GRS80;
- [x] Validado dígito a dígito contra o pipeline oficial do projinfo executado no pyproj em 3 épocas (2010/2020/2024) — nota de engenharia: o pipeline oficial espera entrada (lat, lon) na ordem nativa do CRS;
- [x] SIRGAS2000/WGS84 tratados como ITRF2000; inversa exata implementada;
- [x] Painel Datum: bloco "Épocas ITRF" com época de observação editável (padrão 2024.0);
- [x] 5 testes (direta em 3 épocas, crescimento temporal, inversa ~0,06 mm).

---

## Backlog (sem data marcada)

- Router/deep-links completos com estado na URL (F4.4);
- Tiles escuros (CartoDB Dark Matter) como opção de camada;
- Testes de regressão visual (screenshot diff) das visualizações 2D/3D;
- Auditoria completa de acessibilidade (foco em teclado no mapa);
- i18n (en/es) se o público ampliar;
- Página de "sobre os dados" (atribuições completas IBGE/OSM/Copernicus/NGA);
- Badge de CI no README; nota de instalação PWA na aba Entenda.

---

## Registro de execução

> Executado em 2026-10-30 (sessão "Execute o roadmap"), do commit mais antigo ao mais recente:

- ✅ F1.1 + F1.2 — CI unificado + 3 E2E Playwright — commits `94d72da`, `9b53ff8`
- ✅ F1.3 + F1.4 + F1.5 — ESLint/Prettier + strict + zero any — commit `99763f8` (CI passou de ponta a ponta)
- ✅ F2.1 — modo colar — commits `560c43a`, `dc30f6b` *(testes pegaram 2 bugs de vírgula pt-BR)*
- ✅ F2.2 + F2.3 — XLSX/GeoJSON/KML — commit `45e4019`
- ✅ F2.4 + F2.5 — DEM em lote + falhas/cancelamento — commit `d0c6215`
- ✅ F3.1 — fator k + Vincenty — commit `d96fae9`
- ✅ F3.2 — LTM — commit `2106af1`
- ✅ F3.3 — Córrego Alegre (EPSG:6193) — commit `f7cbb1f`
- ✅ F3.4 — perfil do terreno por linha — commit `09d24a0`
- ✅ F3.5 — DXF enriquecido — commits `716250d`, `e46a929` *(correção pós-push: campo inexistente)*
- ✅ F4.1 + F4.2 + F4.3 — PWA + PDF + projeto — commit `07e86fe`
- ✅ F5.3 — reprojeção de shapefile (shpjs já faz via .prj) — commit `785eca6`
- ✅ (2ª rodada, 2026-10-30) quick wins: badge CI + nota PWA + deep-links F4.4 — commit `d01270e` (parte)
- ✅ F5.1 — EGM2008 offline (grade NGA 10′ própria) — commit posterior a `28cd248`
- ✅ F5.4 — ITRF com época (14 parâmetros EPSG) — commit posterior a `28cd248`
- 🔶 F5.2 — MAPGEO2015: geoftp indisponível; obter grade pelo portal do MAPGEO (documentado acima)
