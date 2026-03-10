export function toBigIntSafe(
  value: string | number | bigint | null | undefined
): bigint {
  if (value === null || value === undefined || value === '') {
    return BigInt(0);
  }

  return BigInt(value);
}

export function toNullableBigIntInput(
  value: unknown
): bigint | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  return BigInt(value as string | number | bigint);
}
