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
    const data = await response.json();
    
    // Map to our interface if needed, but usually it matches
    return data.map((s: any) => ({
      id: s.id,
      nome: s.nome,
      sigla: s.sigla,
      situacao: s.situacao,
      latitude: s.latitude,
      longitude: s.longitude,
      municipio: s.municipio,
      uf: s.uf
    }));
  } catch (error) {
    console.error('Error fetching RBMC stations:', error);
    return [];
  }
}
