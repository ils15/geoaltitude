export interface RBMCStation {
  id: number;
  nome: string;
  sigla: string;
  situacao: string;
  latitude: number;
  longitude: number;
  municipio: string;
  uf: string;
}

export async function fetchRBMCStations(): Promise<RBMCStation[]> {
  try {
    const response = await fetch('https://servicodados.ibge.gov.br/api/v1/rbmc/estacoes');
    if (!response.ok) throw new Error('Failed to fetch RBMC stations');

    // The API documentation says it returns a list of stations
    const data: unknown = await response.json();

    if (!Array.isArray(data)) return [];
    const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
    return data.map((s) => {
      const st = s as Record<string, unknown>;
      return {
        id: Number(st.id),
        nome: str(st.nome),
        sigla: str(st.sigla),
        situacao: str(st.situacao),
        latitude: Number(st.latitude),
        longitude: Number(st.longitude),
        municipio: str(st.municipio),
        uf: str(st.uf),
      };
    });
  } catch (error) {
    console.error('Error fetching RBMC stations:', error);
    return [];
  }
}
