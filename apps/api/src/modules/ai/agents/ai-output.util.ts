/** LLM output is untrusted: these helpers coerce it to the shapes the rest of the code assumes. */
export const asArray = <T = unknown>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export const asStringArray = (v: unknown): string[] =>
  [...new Set(asArray(v).map((s) => (typeof s === 'string' || typeof s === 'number' ? String(s).trim() : '')).filter(Boolean))];

export const asNumber = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'string' && v.trim() === '' ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const asString = (v: unknown, fallback = ''): string =>
  typeof v === 'string' && v.trim() ? v.trim() : fallback;
