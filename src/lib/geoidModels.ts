/**
 * Modelos geoidais suportados na consulta de ondulação (N).
 *
 *  - HGEOHNOR: modelo oficial do IBGE (hgeoHNOR, referido ao RN2015/Imbituba),
 *    consultado pela API pública do IBGE. Retorna modelo/incerteza do ponto.
 *  - EGM96: modelo global aberto da NGA (grade 15′, WW15MGH.DAC) avaliado
 *    localmente no navegador via egm96-universal (dados embutidos, sem rede).
 */
import { getPontoDec, summarizeHgeoResult } from './api';

export type GeoidModelId = 'HGEOHNOR' | 'EGM96';

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
  const res = await getPontoDec(lat, lon);
  const s = summarizeHgeoResult(res);
  if (s.N === null) throw new Error('Ponto fora da grade do modelo hgeoHNOR.');
  return { N: s.N, modelo: s.modelo, fonte: 'API IBGE', incerteza: s.incerteza };
}
