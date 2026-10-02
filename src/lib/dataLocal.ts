/** Data de hoje ('YYYY-MM-DD') no fuso de Brasília. */
export function hojeLocal(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

/** true quando a data ('YYYY-MM-DD') é posterior a hoje em Brasília. */
export function isDataFutura(data: string): boolean {
  return data > hojeLocal();
}
