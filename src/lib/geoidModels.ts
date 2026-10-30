/**
 * Modelos geoidais suportados na consulta de ondulação (N).
 *
 *  - HGEOHNOR: modelo oficial do IBGE (hgeoHNOR, referido ao RN2015/Imbituba),
 *    consultado pela API pública do IBGE. Retorna modelo/incerteza do ponto.
 *  - EGM96: modelo global aberto da NGA (grade 15′, WW15MGH.DAC) avaliado
 *    localmente no navegador via egm96-universal (dados embutidos, sem rede).
 */
import { getPontoDec, summarizeHgeoResult } from './api';
import { createEgm2008Model } from './egm2008';

export type GeoidModelId = 'HGEOHNOR' | 'EGM96' | 'EGM2008';

export interface GeoidModelInfo {
  id: GeoidModelId;
  label: string;
  description: string;
  requiresInternet: boolean;
}

export const GEOID_MODELS: GeoidModelInfo[] = [
  {
    id: 'HGEOHNOR',
    label: 'hgeoHNOR — IBGE (oficial BR)',
    description: 'Modelo oficial do SGB, referido ao RN2015 (Imbituba). Consulta a API do IBGE.',
    requiresInternet: true,
  },
  {
    id: 'EGM96',
    label: 'EGM96 — NGA (global, aberto)',
    description: 'Modelo global aberto (grade 15′ da NGA) avaliado no navegador, sem internet. Compatível com KML.',
    requiresInternet: false,
  },
  {
    id: 'EGM2008',
    label: 'EGM2008 — NGA (global, mais recente)',
    description:
      'Grade 10′ reamostrada da oficial 5′ do NGA, avaliada no navegador. Baixada sob demanda (~4,7 MB) e cacheada.',
    requiresInternet: false,
  },
];

export interface UndulationResult {
  N: number;
  modelo: string;
  fonte: string;
  incerteza: number | null;
}

type Egm96Module = typeof import('egm96-universal');
let egm96ModulePromise: Promise<Egm96Module> | null = null;

function loadEgm96(): Promise<Egm96Module> {
  if (!egm96ModulePromise) {
    // chunk pesado (grade NGA embutida) — carregado só quando o usuário escolhe EGM96
    egm96ModulePromise = import('egm96-universal');
  }
  return egm96ModulePromise;
}

interface Egm2008Model {
  undulation(lat: number, lon: number): number;
}
let egm2008Promise: Promise<Egm2008Model> | null = null;

function loadEgm2008(): Promise<Egm2008Model> {
  if (!egm2008Promise) {
    // bin próprio (~4,7 MB) — baixado sob demanda e cacheado pelo service worker
    egm2008Promise = (async () => {
      const response = await fetch('geoid/egm2008-10.bin');
      if (!response.ok) throw new Error('Falha ao baixar a grade EGM2008.');
      const buffer = await response.arrayBuffer();
      return createEgm2008Model(buffer);
    })();
  }
  return egm2008Promise;
}

/** Ondulação geoidal N (m) no modelo escolhido. Lança erro se o ponto estiver fora da grade. */
export async function fetchUndulation(model: GeoidModelId, lat: number, lon: number): Promise<UndulationResult> {
  if (model === 'EGM96') {
    const egm96 = await loadEgm96();
    return {
      N: egm96.meanSeaLevel(lat, lon),
      modelo: 'EGM96 (NGA 15′)',
      fonte: 'dados locais (NGA)',
      incerteza: null,
    };
  }
  if (model === 'EGM2008') {
    const egm2008 = await loadEgm2008();
    return {
      N: egm2008.undulation(lat, lon),
      modelo: 'EGM2008 (NGA 10′)',
      fonte: 'dados locais (NGA, reamostrado)',
      incerteza: null,
    };
  }
  const res = await getPontoDec(lat, lon);
  const s = summarizeHgeoResult(res);
  if (s.N === null) throw new Error('Ponto fora da grade do modelo hgeoHNOR.');
  return { N: s.N, modelo: s.modelo, fonte: 'API IBGE', incerteza: s.incerteza };
}
