export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomPick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function randomShuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function randomSubset<T>(list: T[], count: number): T[] {
  return randomShuffle(list).slice(0, count);
}
