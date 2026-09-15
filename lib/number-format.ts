const numberFormatters = new Map<string, Intl.NumberFormat>();

/** Formats amounts using Peru's numeric conventions, including thousands separators. */
export function formatAmount(value: number, fractionDigits = 2): string {
  const key = String(fractionDigits);
  let formatter = numberFormatters.get(key);

  if (!formatter) {
    formatter = new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      useGrouping: true
    });
    numberFormatters.set(key, formatter);
  }

  return formatter.format(value);
}

export function formatSoles(value: number, fractionDigits = 2): string {
  return `S/ ${formatAmount(value, fractionDigits)}`;
}
