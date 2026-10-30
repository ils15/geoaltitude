# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demo.spec.ts >> ponto único via busca de endereço preenche GMS e limpa erros
- Location: tests/e2e/demo.spec.ts:70:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  getByLabel('Latitude: minutos')
Expected: "34"
Received: "33"
Timeout:  5000ms

Call log:
  - Expect "toHaveValue" getByLabel('Latitude: minutos') with timeout 5000ms
  - waiting for getByLabel('Latitude: minutos')
    14 × locator resolved to <input value="33" type="number" placeholder="Minutos" aria-label="Latitude: minutos" class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-ibge-blue focus:border-ibge-blue outline-none transition-all"/>
       - unexpected value "33"

```

```yaml
- 'spinbutton "Latitude: minutos"': "33"
```

# Test source

```ts
  1  | import { test, expect, Page } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * Mock da API do IBGE (hgeohnor/pontos): devolve N plausíveis para qualquer
  5  |  * consulta, preservando a ordem — E2E determinístico, sem rede externa.
  6  |  * Tiles de mapa são abortados para acelerar.
  7  |  */
  8  | async function mockServices(page: Page) {
  9  |   await page.route('**/api/v1/hgeohnor/**', route => {
  10 |     const url = new URL(route.request().url());
  11 |     const pontosParam = url.searchParams.get('pontos');
  12 |     if (!pontosParam) return route.fulfill({ status: 200, body: '[]' });
  13 |     try {
  14 |       const pontos = JSON.parse(decodeURIComponent(pontosParam)) as Array<{ lat: number; lon: number }>;
  15 |       const body = JSON.stringify(
  16 |         pontos.map(p => ({
  17 |           fator_conversao: -3.16,
  18 |           incerteza: 0.07,
  19 |           lat: String(p.lat),
  20 |           long: String(p.lon),
  21 |           modelo: 'hgeoHNOR_IMBITUBA',
  22 |         }))
  23 |       );
  24 |       return route.fulfill({ status: 200, contentType: 'application/json', body });
  25 |     } catch {
  26 |       return route.fulfill({ status: 200, body: '[]' });
  27 |     }
  28 |   });
  29 |   await page.route('**/nominatim.openstreetmap.org/**', route => route.fulfill({ status: 200, body: '[]' }));
  30 |   await page.route('**/tile.openstreetmap.org/**', route => route.abort());
  31 |   await page.route('**/server.arcgisonline.com/**', route => route.abort());
  32 |   await page.route('**/tile.opentopomap.org/**', route => route.abort());
  33 |   await page.route('**/geoservicos.ibge.gov.br/**', route => route.abort());
  34 |   await page.route('**/servicodados.ibge.gov.br/api/v1/malhas/**', route => route.abort());
  35 | }
  36 | 
  37 | test('fluxo demo: exemplo → processar → resultados → mapa', async ({ page }) => {
  38 |   await mockServices(page);
  39 |   await page.goto('/');
  40 | 
  41 |   // Aba Lote (CSV) é a inicial: carregar o exemplo
  42 |   await page.getByRole('button', { name: 'Usar dados de exemplo' }).click();
  43 |   await expect(page.getByText('Prévia dos dados (13 linhas)')).toBeVisible();
  44 | 
  45 |   // Processar contra o mock do IBGE
  46 |   await page.getByRole('button', { name: 'Processar Agora' }).click();
  47 |   await expect(page.getByText('Resultados (13)')).toBeVisible({ timeout: 20_000 });
  48 | 
  49 |   // Mapa com os pontos encaixados
  50 |   await page.getByRole('button', { name: 'Mapa', exact: true }).click();
  51 |   await expect(page.getByText('Preview dos Pontos (13)')).toBeVisible();
  52 |   await expect(page.getByLabel('Ajustar zoom para os pontos')).toBeAttached();
  53 | });
  54 | 
  55 | test('conversões: coordenadas padrão (SP) resultam em UTM 23S 333287.915', async ({ page }) => {
  56 |   await mockServices(page);
  57 |   await page.goto('/');
  58 |   await page.getByRole('button', { name: 'Ponto Único & Conversões' }).click();
  59 | 
  60 |   // Sub-aba Coordenadas é a inicial; entrada padrão é Praça da Sé (SP)
  61 |   await expect(page.getByText('23S E 333287.915 N 7394588.319')).toBeVisible();
  62 | 
  63 |   // Altimetria: h=144 e N=-10 → H = 154
  64 |   await page.getByRole('tab', { name: 'Altimetria' }).click();
  65 |   await page.getByLabel('Altitude elipsoidal (h)').fill('144');
  66 |   await page.getByLabel('Ondulação geoidal (N)').fill('-10');
  67 |   await expect(page.getByText('H = h − N = 144.000 − (-10.000) = 154.000 m')).toBeVisible();
  68 | });
  69 | 
  70 | test('ponto único via busca de endereço preenche GMS e limpa erros', async ({ page }) => {
  71 |   await mockServices(page);
  72 |   await page.goto('/');
  73 |   await page.getByRole('button', { name: 'Ponto Único & Conversões' }).click();
  74 | 
  75 |   // Busca mockada: um único resultado (Praça da Sé)
  76 |   await page.route('**/nominatim.openstreetmap.org/**', route =>
  77 |     route.fulfill({
  78 |       status: 200,
  79 |       contentType: 'application/json',
  80 |       body: JSON.stringify([
  81 |         { display_name: 'Praça da Sé, Sé, São Paulo, SP, Brasil', lat: '-23.5505', lon: '-46.6333' },
  82 |       ]),
  83 |     })
  84 |   );
  85 | 
  86 |   // Modo GMS antes da busca: o resultado preenche graus/min/seg diretamente
  87 |   await page.getByRole('button', { name: 'Graus Sexagesimais' }).click();
  88 |   await page.getByLabel('Buscar endereço ou lugar').fill('Praca da Se');
  89 |   await page.getByRole('button', { name: 'Buscar', exact: true }).first().click();
  90 |   await page.getByRole('button', { name: /Praça da Sé, Sé, São Paulo/ }).first().click();
  91 | 
  92 |   await expect(page.getByLabel('Latitude: graus')).toHaveValue('-23');
> 93 |   await expect(page.getByLabel('Latitude: minutos')).toHaveValue('34');
     |                                                      ^ Error: expect(locator).toHaveValue(expected) failed
  94 |   await expect(page.getByLabel('Longitude: graus')).toHaveValue('-46');
  95 |   await expect(page.getByRole('button', { name: 'Calcular Altitude' })).toBeEnabled();
  96 | });
  97 | 
```