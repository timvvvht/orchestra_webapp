/**
 * Deterministically generate a vibrant CSS linear-gradient string from any seed string.
 * If seed is falsy ⇒ fallback to "default" to guarantee output.
 */
export const generateGradient = (seed: string | null | undefined) => {
  const key = seed || "default";
  const hash = key
    .split("")
    .reduce((acc, ch) => ch.charCodeAt(0) + ((acc << 5) - acc), 0);
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 40 + (hash % 180)) % 360;
  const sat = 80 + (hash % 20); // 80-99
  const l1 = 55 + (hash % 15); // 55-69
  const l2 = 60 + ((hash >> 4) % 15); // 60-74
  const angle = hash % 360;
  return `linear-gradient(${angle}deg, hsl(${h1}, ${sat}%, ${l1}%), hsl(${h2}, ${sat}%, ${l2}%))`;
};
