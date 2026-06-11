export interface RngState {
  seed: number;
  value: number;
}

const MODULUS = 2_147_483_647;
const MULTIPLIER = 48_271;

export function createRng(seed: number): RngState {
  const normalizedSeed = Math.max(1, Math.floor(Math.abs(seed)) % MODULUS);
  return {
    seed: normalizedSeed,
    value: normalizedSeed,
  };
}

export function nextRandom(rng: RngState): number {
  rng.value = (rng.value * MULTIPLIER) % MODULUS;
  return rng.value / MODULUS;
}

export function randomInt(rng: RngState, min: number, max: number): number {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  if (upper <= lower) {
    return lower;
  }
  return lower + Math.floor(nextRandom(rng) * (upper - lower + 1));
}

export function pickOne<T>(rng: RngState, items: T[]): T {
  if (items.length === 0) {
    throw new Error('pickOne requires at least one item.');
  }
  return items[randomInt(rng, 0, items.length - 1)];
}

export function pickWeighted<T>(rng: RngState, items: T[], getWeight: (item: T) => number): T {
  if (items.length === 0) {
    throw new Error('pickWeighted requires at least one item.');
  }

  const totalWeight = items.reduce((sum, item) => sum + Math.max(0, getWeight(item)), 0);
  if (totalWeight <= 0) {
    return pickOne(rng, items);
  }

  let cursor = nextRandom(rng) * totalWeight;
  for (const item of items) {
    cursor -= Math.max(0, getWeight(item));
    if (cursor <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

export function shuffle<T>(rng: RngState, items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(rng, 0, index);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}
