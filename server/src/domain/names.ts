export function cleanName(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

export function normalizeText(value: string): string {
  return cleanName(value).toLocaleLowerCase('es-AR').normalize('NFD').replace(/[\u0300-\u036f]/gu, '');
}
