import { test, expect, Page } from '@playwright/test';

/**
 * Mock da API do IBGE (hgeohnor/pontos): devolve N plausíveis para qualquer
 * consulta, preservando a ordem — E2E determinístico, sem rede externa.
 * Tiles de mapa são abortados para acelerar.
 */
async function mockServices(page: Page) {
  await page.route('**/api/v1/hgeohnor/**', route => {
    const url = new URL(route.request().url());
    const pontosParam = url.searchParams.get('pontos');
    if (!pontosParam) return route.fulfill({ status: 200, body: '[]' });
    try {
      const pontos = JSON.parse(decodeURIComponent(pontosParam)) as Array<{ lat: number; lon: number }>;
      const body = JSON.stringify(
        pontos.map(p => ({
          fator_conversao: -3.16,
          incerteza: 0.07,
          lat: String(p.lat),
          long: String(p.lon),
          modelo: 'hgeoHNOR_IMBITUBA',
        }))
      );
      return route.fulfill({ status: 200, contentType: 'application/json', body });
    } catch {
      return route.fulfill({ status: 200, body: '[]' });
    }
  });
  await page.route('**/nominatim.openstreetmap.org/**', route => route.fulfill({ status: 200, body: '[]' }));
  await page.route('**/tile.openstreetmap.org/**', route => route.abort());
  await page.route('**/server.arcgisonline.com/**', route => route.abort());
  await page.route('**/tile.opentopomap.org/**', route => route.abort());
  await page.route('**/geoservicos.ibge.gov.br/**', route => route.abort());
  await page.route('**/servicodados.ibge.gov.br/api/v1/malhas/**', route => route.abort());
}

test('fluxo demo: exemplo → processar → resultados → mapa', async ({ page }) => {
  await mockServices(page);
  await page.goto('/');

  // Aba Lote (CSV) é a inicial: carregar o exemplo
  await page.getByRole('button', { name: 'Usar dados de exemplo' }).click();
  await expect(page.getByText('Prévia dos dados (13 linhas)')).toBeVisible();

  // Processar contra o mock do IBGE
  await page.getByRole('button', { name: 'Processar Agora' }).click();
  await expect(page.getByText('Resultados (13)')).toBeVisible({ timeout: 20_000 });

  // Mapa com os pontos encaixados
  await page.getByRole('button', { name: 'Mapa', exact: true }).click();
  await expect(page.getByText('Preview dos Pontos (13)')).toBeVisible();
  await expect(page.getByLabel('Ajustar zoom para os pontos')).toBeAttached();
});

test('conversões: coordenadas padrão (SP) resultam em UTM 23S 333287.915', async ({ page }) => {
  await mockServices(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Ponto Único & Conversões' }).click();

  // Sub-aba Coordenadas é a inicial; entrada padrão é Praça da Sé (SP)
  await expect(page.getByText('23S E 333287.915 N 7394588.319')).toBeVisible();

  // Altimetria: h=144 e N=-10 → H = 154
  await page.getByRole('tab', { name: 'Altimetria' }).click();
  await page.getByLabel('Altitude elipsoidal (h)').fill('144');
  await page.getByLabel('Ondulação geoidal (N)').fill('-10');
  await expect(page.getByText('H = h − N = 144.000 − (-10.000) = 154.000 m')).toBeVisible();
});

test('ponto único via busca de endereço preenche GMS e limpa erros', async ({ page }) => {
  await mockServices(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Ponto Único & Conversões' }).click();

  // Busca mockada: um único resultado (Praça da Sé)
  await page.route('**/nominatim.openstreetmap.org/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { display_name: 'Praça da Sé, Sé, São Paulo, SP, Brasil', lat: '-23.5505', lon: '-46.6333' },
      ]),
    })
  );

  // Modo GMS antes da busca: o resultado preenche graus/min/seg diretamente
  await page.getByRole('button', { name: 'Graus Sexagesimais' }).click();
  await page.getByLabel('Buscar endereço ou lugar').fill('Praca da Se');
  await page.getByRole('button', { name: 'Buscar', exact: true }).first().click();
  await page.getByRole('button', { name: /Praça da Sé, Sé, São Paulo/ }).first().click();

  await expect(page.getByLabel('Latitude: graus')).toHaveValue('-23');
  await expect(page.getByLabel('Latitude: minutos')).toHaveValue('34');
  await expect(page.getByLabel('Longitude: graus')).toHaveValue('-46');
  await expect(page.getByRole('button', { name: 'Calcular Altitude' })).toBeEnabled();
});
