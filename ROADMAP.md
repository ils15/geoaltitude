# GeoAlt — Roadmap de Evolução

> Plano de trabalho estruturado para a próxima etapa do projeto, na ordem acordada:
> **1** rede de segurança → **2** entrada sem atrito → **3** ferramentas do topógrafo → **4** produto em campo → **5** geodésia profunda.
>
> **Como trabalhar:** cada fase é entregue em commits separados (uma tarefa = um commit), com testes para tudo que for lógica, `npm run lint` + `npm test` + `npm run build` verdes antes de cada push, deploy automático pelo GitHub Pages ao pushar em `main`, e **atualização deste documento** (checkbox ✅ + data) ao concluir cada item.
>
> **Legenda de esforço:** S ≈ até meio dia · M ≈ 1 dia · G ≈ 2+ dias (estimativas com margem para pesquisa).

| Fase | Tema | Itens | Esforço | Status |
|---|---|---|---|---|
| 1 | Rede de segurança (CI + E2E + higiene) | 5 | M–G | ⬜ não iniciada |
| 2 | Entrada de dados sem atrito | 5 | G | ⬜ não iniciada |
| 3 | Ferramentas do topógrafo | 5 | G | ⬜ não iniciada |
| 4 | Produto em campo (PWA, PDF, projeto) | 3 + 1 opcional | M–G | ⬜ não iniciada |
| 5 | Geodésia profunda | 4 | G | ⬜ não iniciada |

**Linha de base (out/2026):** 561 testes · deploy contínuo em `https://ils15.github.io/geoaltitude/` · núcleo geodésico validado contra PROJ (UTM, datums, ECEF) · modelo geoidal hgeoHNOR (IBGE) + EGM96 local · lote via `/pontos` (~200 pts/chamada).

---

## Fase 1 — Rede de segurança: CI, E2E e higiene de código

**Objetivo:** impedir regressões como as duas que já escaparam para produção (botão do demo desabilitado, malha 3D). Bugs de interação não são pegos por testes unitários — precisam de CI obrigatório + um E2E do fluxo demo.

### F1.1 — Workflow de CI com testes obrigatórios (S)
- [ ] Criar `.github/workflows/ci.yml`: job `verify` (`npm ci` → `npm run lint` → `npx vitest run`) + job `build`, rodando em *push* e *pull request*;
- [ ] Manter o workflow de Pages como está (deploy só acontece com o `verify` verde — encadear com `workflow_run` ou unificar num único workflow com job `deploy` dependente);
- [ ] Badge de status do CI no README.

**Aceite:** push com teste falhando não publica o site; badge visível no README.

### F1.2 — E2E do fluxo demo com Playwright (M)
- [ ] Adicionar `@playwright/test` (devDep) e `playwright.config.ts` (Chromium, `baseURL: http://localhost:3000`, webServer automático do `npm run dev`);
- [ ] Mockar a API do IBGE no teste com `page.route` (`**/hgeohnor/pontos*` → fixture com 13 respostas válidas) — E2E sem rede, determinístico;
- [ ] E2E `demo.spec.ts`: abrir página → aba Lote → clicar "Usar dados de exemplo" → conferir prévia com 13 linhas → "Processar Agora" → aguardar tabela de resultados (13 linhas) → abrir aba Mapa → conferir ⌖ e clusters presentes;
- [ ] E2E `conversoes.spec.ts`: aba Ponto Único & Conversões → sub-abas → UTM conhecido (SP → 23S 333287.915) aparece no resultado → copiar disponível;
- [ ] Script `npm run e2e` + job no CI (somente Chromium, para não estourar o tempo do runner).

**Aceite:** `npm run e2e` roda o smoke completo em < 2 min local e no CI.

### F1.3 — ESLint + Prettier (S)
- [ ] ESLint 9 (flat config) com `typescript-eslint` + `eslint-plugin-react-hooks`; regra de ouro: `@typescript-eslint/no-floating-promises` (classe de bug real no lote/geo);
- [ ] Prettier com o estilo atual (120 colunas, aspas simples) + script `npm run format`;
- [ ] Corrigir o estoque atual de warnings (deve ser pequeno) e plugar no CI (F1.1).

**Aceite:** `npm run lint:eslint` zero warnings; formato idempotente no repositório.

### F1.4 — TypeScript `strict: true` (M)
- [ ] Ativar `"strict": true` no `tsconfig.json` e inventariar os erros;
- [ ] Corrigir primeiro em `src/lib/**` (o núcleo — já quase limpo), depois componentes;
- [ ] Tipar handlers do leaflet-draw com os tipos de `@types/leaflet-draw` (remover os `(e: any)` do MapPreview).

**Aceite:** `tsc --noEmit` verde com strict; nenhum `any` novo no diff.

### F1.5 — Eliminar `any` estrutural (S)
- [ ] `shapefileData` em App/MapPreview → `FeatureCollection` do GeoJSON (tipos próprios ou `geojson` types);
- [ ] `parsedData` no BatchUpload → `Record<string, string>[]`;
- [ ] Resposta do RBMC tipada no `rbmc.ts`.

**Aceite:** `grep -rn ": any" src/` só retorna exceções documentadas (ou nada).

---

## Fase 2 — Entrada de dados sem atrito

**Objetivo:** aceitar os dados do usuário no formato em que eles estão — bloco de notas, planilha, KML — e completar o que falta (altitudes via DEM), com relatório honesto de falhas.

### F2.1 — "Modo colar" no lote (M)
- [ ] Nova lib `src/lib/pasteParser.ts`: recebe texto livre, devolve `{lat, lon, h?}` por linha, aceitando `lat,lon[,h]` com decimais por ponto **ou** vírgula, GMS (`-22°54'28,9" S`), separadores `;` ou tab;
- [ ] Botão "Colar coordenadas" no BatchUpload (ao lado de "Usar dados de exemplo") → textarea → botão interpretar → mostra contagem de linhas válidas/inválidas → entra no mesmo fluxo de mapeamento/processing (`parsedData` sintético);
- [ ] Testes do parser com os formatos do Brasil (vírgula, GMS com O, colado do Excel com tab).

**Aceite:** colar 50 linhas mistas (dec/GMS/vírgula/tab) → todas as válidas processam; inválidas aparecem na contagem antes de processar.

### F2.2 — Importar XLSX (M)
- [ ] Adicionar `xlsx` (SheetJS) como import dinâmico (chunk separado, só carrega ao usar);
- [ ] No BatchUpload: aceitar `.xlsx/.xls` → ler **primeira aba não vazia**, primeira linha como cabeçalho → `parsedData` no mesmo formato do PapaParse;
- [ ] Mapeamento de colunas reutilizado sem mudança.

**Aceite:** planilha com 2 abas importa a primeira; colunas lat/lon/h mapeadas automaticamente pelos mesmos aliases.

### F2.3 — Importar GeoJSON e KML (M)
- [ ] `src/lib/geoImport.ts`: GeoJSON (FeatureCollection/Feature/Geometry) → extrai Points; KML via `DOMParser` (Placemarks → Point coordinates);
- [ ] Botões "Importar GeoJSON/KML" no mesmo fluxo do lote (carregam `parsedData`);
- [ ] Testes com fixtures mínimas de cada formato.

**Aceite:** um `.kml` exportado pelo próprio GeoAlt reimporta com os mesmos pontos.

### F2.4 — Completar altitudes com DEM em lote (M)
- [ ] No passo de mapeamento, se a coluna **h não estiver mapeada**: oferecer "Estimar h com DEM aberto (Copernicus GLO-90 via Open-Meteo, ~100 pts/chamada)";
- [ ] Estender `openServices.ts` com `fetchTerrainElevationBatch(points)` (lotes de 100, respiro entre lotes);
- [ ] Aviso de precisão visível (GLO-90 ≈ ±10 m em relevo acidentado) e origem marcada nos resultados (`h_fonte: 'DEM'`).

**Aceite:** CSV sem coluna h processa com h do DEM; H sai combinado com o N do modelo geoidal; banner indica a origem estimada.

### F2.5 — Relatório de falhas + cancelamento (S)
- [ ] `AbortController` no processamento do lote + botão "Cancelar";
- [ ] Coletar falhas com motivo (`fora_grid`, erro de rede, coord. inválida) → botão "Exportar falhas (.csv)" no painel de progresso/resultados.

**Aceite:** processamento de 500 pontos pode ser cancelado ao meio; CSV de falhas baixa com motivo por linha.

---

## Fase 3 — Ferramentas do topógrafo

**Objetivo:** as demandas clássicas do campo que nenhum webapp gratuito brasileiro faz bem — e que usam o núcleo UTM/DEM que já temos.

### F3.1 — Distância grade ↔ terreno (fator k) (M)
- [ ] Nova lib `src/lib/gridGround.ts`: fator combinado `k = k_UTM_local × k_altitude`, onde `k_altitude = R/(R+H)` e `k_UTM_local` é derivado **numericamente do nosso núcleo** (razão entre a distância projetada de dois pontos próximos e a distância geodésica no elipsoide — evita reimplementar a série de escala pontual);
- [ ] Nova sub-seção "Grade ↔ Terreno" na aba Medidas do painel: entrada ponto (lat/lon), H e uma distância plana (ou terreno) → saída com os três fatores e a distância convertida;
- [ ] Testes: fator k_altitude analítico (H=0 → 1; H=1000 → ≈ 0.999843) e consistência numérica do k_UTM (variação suave com a longitude relativa ao MC).

**Aceite:** SP a ~760 m de H mostra fator combinado ≈ 0.99957 (k0 0.9996 × altitude) — conferir numericamente no teste.

### F3.2 — LTM (Transversa Local, fuso sob medida) (M)
- [ ] Generalizar o núcleo: extrair `transverseMercator(lat, lon, { lon0, k0, fe, fn })` em `geodesy.ts` e reescrever UTM como caso particular (`lon0 = MC, k0 = 0.9996, FE 500k, FN hemisfério`);
- [ ] Painel: modo "LTM" com **meridiano central editável** (padrão: longitude arredondada ao grau), k0 = 1, FEs/FNs editáveis;
- [ ] Round-trip e vetores de teste via pyproj com `+proj=tmerc +lon_0=... +k=1` equivalente.

**Aceite:** LTM com MC = −46 reproduz coordenadas do pyproj a < 1 mm; UTM continua passando nos vetores PROJ existentes (regressão garantida pela suíte atual).

### F3.3 — Córrego Alegre (datum legado do interior de SP) (M)
- [ ] Pesquisar os parâmetros oficiais IBGE (documento "Parâmetros de Transformação entre Sistemas de Referência" — **não estão no proj.db**); registrar fonte e acurácia na nota do datum;
- [ ] Adicionar `CORREGO_ALEGRE` em `DATUMS` (Helmert 3 parâmetros → SIRGAS2000);
- [ ] Vetores de teste gerados com pyproj (pipeline equivalente ao parâmetro oficial).

**Aceite:** transformação CA→SIRGAS2000 disponível no painel com nota de fonte; teste verde contra vetor independente.

### F3.4 — Perfil do terreno ao longo de linha desenhada (G)
- [ ] No painel "Medições do desenho": para polilinhas, botão **"Perfil do terreno (DEM)"**;
- [ ] Amostrar o traçado a cada ~90 m (passo do GLO-90) → lotes de 100 coordenadas no `fetchTerrainElevationBatch`;
- [ ] Resultado: perfil distância × altitude do terreno (reusar o gráfico de perfil; fonte "DEM Copernicus") em modal ou painel lateral, com export CSV;
- [ ] Tratamento de linhas longas (limite prático ~20 km por vez, com aviso de chamadas estimadas).

**Aceite:** traçado de 5 km no litoral do Rio → ~55 amostras, perfil coerente (0–900 m na serra), exportável.

### F3.5 — DXF enriquecido (S, opcional nesta fase)
- [ ] TEXT com nome do ponto ao lado de cada POINT;
- [ ] Polilinha da rota (LWPOLYLINE com os pontos em sequência) quando "Ligar pontos" estiver ativo.

**Aceite:** DXF abre no CAD com pontos, rótulos e traçado.

---

## Fase 4 — Produto em campo

**Objetivo:** instalar no celular, trabalhar offline, entregar relatório e não perder o trabalho.

### F4.1 — PWA instalável e offline (M)
- [ ] `vite-plugin-pwa`: manifest (nome, ícones 192/512 — derivar do favicon SVG), service worker com precache do shell;
- [ ] Estratégia de cache: app shell cache-first; tiles dos mapas network-first (sem estourar storage); chunk do EGM96 cacheado após primeiro uso (offline total para o modelo global);
- [ ] Página "Entenda" ganha nota "Instale no celular".

**Aceite:** Lighthouse PWA instalável; app abre e conversores funcionam com a rede desligada (após primeira visita).

### F4.2 — Relatório técnico em PDF limpo (M–G)
- [ ] Substituir o html2canvas por **PDF gerado programaticamente com jsPDF** (resolve o risco oklch de vez): capa (título, data, área, contagem), parâmetros usados (modelo geoidal, fonte de h, incertezas), mapa estático (captura do container Leaflet forçando tema claro — ou tela via `map` → canvas nativo do Leaflet), tabela de pontos paginada, rodapé com versão/data;
- [ ] Templates: "Relatório de conversão" e "Perfil do terreno";
- [ ] Teste de geração em node (jsPDF roda em node) validando número de páginas e presença de textos-chave.

**Aceite:** PDF abre no Acrobat/Chrome, acentos corretos, tabela paginada, sem depender de screenshot do DOM.

### F4.3 — Projeto salvável e compartilhável (M)
- [ ] Exportar/importar `.geoalt.json` (resultados + metadados + data/hora) — botões no painel de resultados;
- [ ] Compartilhar por URL: codificar resultados no hash da página (JSON → `CompressionStream` gzip → base64url; fallback sem compressão) com aviso de tamanho máx. (~8 kB prático para dezenas de pontos);
- [ ] Ao abrir link com hash: restaurar resultados e mostrar banner "sessão compartilhada".

**Aceite:** refresh não perde resultados; link compartilhado reabre os mesmos 13 pontos do demo.

### F4.4 — (Opcional) Deep-links por aba (S)
- [ ] `#/mapa`, `#/conversoes`… via `hashchange` (sem router pesado) para links diretos às seções.

---

## Fase 5 — Geodésia profunda

**Objetivo:** cobertura total de modelos e suporte a dados legados/recentes sem API.

### F5.1 — EGM2008 (M–G)
- [ ] Pesquisar fonte da grade (NGA 2.5′/5′ binária ou conversão de `.pgm`); implementar no padrão do EGM96 (`GeoidModelId` ganha `'EGM2008'`), chunk lazy igual;
- [ ] Âncoras independentes via GeoidEval (GeographicLib) para os testes.

**Aceite:** seletor com 3 modelos; N(EGM2008) em SP/Manaus/Belém bate com GeoidEval a ≤ 15 cm.

### F5.2 — MAPGEO2015 offline (G, depende de pesquisa)
- [ ] Baixar a grade oficial do IBGE e converter para formato compacto (int16 × 0,1 mm) em chunk lazy (~2–3 MB estimado);
- [ ] Interpolação bilinear local; `GeoidModelId` ganha `'MAPGEO2015'` (funciona onde a API responde `MAPGEO2015_OESTE`, e offline);
- [ ] Validação cruzada com a API do IBGE em grade de pontos (diferença esperada ≈ 0 — é a mesma fonte).

**Aceite:** consulta local idêntica à API dentro de ±2 cm numa grade de 100 pontos.

### F5.3 — Shapefile com reprojeção (S)
- [ ] `proj4js`: ler o `.prj` do zip (shpjs expõe?) e reprojetar para WGS84 no upload; se não houver `.prj`, avisar e assumir WGS84 explicitamente.

**Aceite:** um .shp salvo em UTM 23S entra no mapa no lugar certo.

### F5.4 — SIRGAS/ITRF com época (G, opcional)
- [ ] Helmert com velocidades (7+3 parâmetros) ITRF2014↔SIRGAS2000 (valores IERS/IBGE documentados) e campo "época" no painel de datum;
- [ ] Nota clara de aplicabilidade (campanhas GNSS de precisão).

**Aceite:** transformação com época 2015.0 vs 2024.0 difere conforme as velocidades publicadas; documentado com fonte.

---

## Backlog (sem data marcada)

- Router/deep-links completos com estado na URL;
- Tiles escuros (CartoDB Dark Matter) como opção de camada;
- Testes de regressão visual (screenshot diff) das visualizações 2D/3D;
- Auditoria completa de acessibilidade (foco em teclado no mapa);
- i18n (en/es) se o público ampliar;
- Página de "sobre os dados" (atribuições completas IBGE/OSM/Copernicus/NGA).

---

## Registro de execução

> Preencher ao concluir cada item: `✅ F1.1 — 2026-XX-XX — commit abc1234 — observação`

- (vazio — aguardando início da Fase 1)
