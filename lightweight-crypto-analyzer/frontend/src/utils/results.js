import { ALGORITHM_ORDER } from './constants';

/** Sorts results by the fixed algorithm order, then block/key size. */
export function sortResults(results) {
  return [...results].sort(
    (a, b) =>
      a.messageSize - b.messageSize ||
      ALGORITHM_ORDER.indexOf(a.algorithm) - ALGORITHM_ORDER.indexOf(b.algorithm) ||
      a.blockBits - b.blockBits ||
      a.keyBits - b.keyBits,
  );
}

export function isPassed(result) {
  return result?.status === 'passed' && result?.roundTrip?.passed === true;
}

export function messageSizesOf(run) {
  return [...new Set((run?.results ?? []).map((result) => result.messageSize))].sort((a, b) => a - b);
}

/** Lowest (or highest) value among passed results; returns all tied names. */
export function bestOf(results, getValue, better = 'lower') {
  const candidates = results.filter(isPassed).filter((result) => Number.isFinite(getValue(result)));
  if (candidates.length === 0) return null;
  const values = candidates.map(getValue);
  const best = better === 'lower' ? Math.min(...values) : Math.max(...values);
  return { value: best, names: candidates.filter((result) => getValue(result) === best).map((result) => result.displayName) };
}

// Variants of the same algorithm share its colour and are told apart by marker shape.
const MARKERS = ['circle', 'square', 'diamond'];

/** Marker shape for the n-th variant of an algorithm within a chart. */
export function markerFor(index) {
  return MARKERS[index % MARKERS.length];
}
