export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function formatMoney(
  value: string | number | bigint | null | undefined
): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  return Number(value).toLocaleString();
}
