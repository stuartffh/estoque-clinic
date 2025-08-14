/**
 * Extrai uma mensagem de erro padronizada a partir de um objeto de erro.
 */
export function extractErrorMessage(err: any): string {
  return err?.error?.error || err?.error?.message || 'Mensagem padrão';
}
