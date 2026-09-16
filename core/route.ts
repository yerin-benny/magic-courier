import { countries } from '../data/countries';
import { seeded, shuffle } from './random';
export function createRoute(visited: readonly string[], seed: number): string[] {
  const r = seeded(seed),
    fresh = shuffle(
      countries.filter((c) => !visited.includes(c.id)),
      r,
    ),
    old = shuffle(
      countries.filter((c) => visited.includes(c.id)),
      r,
    ),
    chosen: typeof countries = [];
  for (const c of fresh)
    if (chosen.length < 4 && !chosen.some((x) => x.continent === c.continent)) chosen.push(c);
  for (const c of fresh) if (chosen.length < 4 && !chosen.includes(c)) chosen.push(c);
  for (const c of old)
    if (chosen.length < 4 && !chosen.some((x) => x.continent === c.continent)) chosen.push(c);
  for (const c of old) if (chosen.length < 4 && !chosen.includes(c)) chosen.push(c);
  return chosen.map((c) => c.id);
}
