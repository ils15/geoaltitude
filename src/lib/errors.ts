/** Extrai mensagem legível de um `catch (err)` com tipo desconhecido (strict). */
export function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : 'Erro inesperado. Tente novamente.';
}
