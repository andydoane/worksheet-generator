function hash(text: string, seed: number): number {
  let value = (seed >>> 0) ^ 2166136261;
  for (const char of text) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** Fisher–Yates; enforce a different visible order when possible. */
export function shuffledIndices(length: number, content: string, seed: number): number[] {
  const indices = Array.from({ length }, (_, index) => index);
  let state = hash(content, seed) || 1;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let index = length - 1; index > 0; index--) {
    const swap = Math.floor(next() * (index + 1));
    [indices[index], indices[swap]] = [indices[swap], indices[index]];
  }
  if (length > 1 && indices.every((item, index) => item === index)) {
    indices.push(indices.shift()!);
  }
  return indices;
}

