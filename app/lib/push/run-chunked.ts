// Tiny bounded-concurrency helper.
//
// Process `items` by running `fn` against them in chunks of size
// `concurrency`. Within each chunk, all calls run in parallel via
// Promise.all. Between chunks, we await the prior chunk to settle
// before starting the next.
//
// Why this exists: the push dispatcher and Live Activity update loop
// used to await each per-subscriber send sequentially. At ~30 subs ×
// 10 live playoff games × 6 events per scan that's thousands of
// serialized network round-trips per cron tick, and the cron times
// out before it finishes. Bounded parallelism lets us send ~10 at a
// time so the wall clock matches the slowest single send, not the
// sum of all sends — without blowing up Upstash, the push services,
// or APNs with an unbounded fan-out.
//
// No external dependency (the user explicitly asked for a simple
// inline helper). Drop-in replacement for any `for (...) { await
// fn(item); }` loop where ordering doesn't matter.

export async function runChunked<T, R>(
  items: ReadonlyArray<T>,
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const limit = Math.max(1, Math.floor(concurrency));
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}
