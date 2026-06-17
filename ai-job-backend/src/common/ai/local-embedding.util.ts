export function generateLocalHashEmbedding(input: string, dimension = 256): number[] {
  if (!Number.isInteger(dimension) || dimension <= 0) {
    throw new Error(`Embedding dimension must be a positive integer, got: ${dimension}`);
  }

  const vector = new Array<number>(dimension).fill(0);
  for (const token of tokenizeForLocalEmbedding(input)) {
    const hash = fnv1a(token);
    const index = hash % dimension;
    const sign = hash % 2 === 0 ? 1 : -1;
    vector[index] += sign;
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) {
    vector[0] = 1;
    return vector;
  }

  return vector.map((value) => Number((value / norm).toFixed(8)));
}

export function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  if (length === 0) return 0;

  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += left[index] * right[index];
  }
  return sum;
}

function tokenizeForLocalEmbedding(input: string): string[] {
  const normalized = input.toLowerCase();
  const latinTokens = normalized.match(/[a-z0-9_+#.-]+/g) ?? [];
  const cjkChars = Array.from(normalized.match(/[\u3400-\u9fff]/g)?.join('') ?? '');
  const cjkBigrams: string[] = [];

  for (let index = 0; index < cjkChars.length - 1; index += 1) {
    cjkBigrams.push(`${cjkChars[index]}${cjkChars[index + 1]}`);
  }

  return [...latinTokens, ...cjkChars, ...cjkBigrams];
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
