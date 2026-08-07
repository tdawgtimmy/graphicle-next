import { extent } from "d3-array";
import { scaleLinear, scaleSqrt } from "d3-scale";

export type ScentScaleFactory = (
  domain: [number, number]
) => (value: number) => number;

export const defaultScentScale: ScentScaleFactory = (domain) =>
  scaleSqrt().domain(domain).range([0, 1]).clamp(true);

/**
 * A zero-based linear scale — the right default for *bar* scent (histograms),
 * where `defaultScentScale` is not:
 *
 * - Zero-based, because a sqrt scale over `[min, max]` renders the smallest
 *   bin at ratio 0 (invisible). A bar's length should be proportional to its
 *   count, so an empty bin — not the smallest one — is what reads as zero.
 * - Linear, because layered bars must read as "this much *of* that bar."
 *   Under sqrt, a bin that is half selected renders at ~71% of its shadow's
 *   height, overstating the selection.
 *
 * Pass `max` to pin the top of the domain to an external reference (the
 * shadow layer's peak count) so a second layer is normalized against the
 * same denominator instead of its own subset's max.
 */
export function zeroBasedScale(max?: number): ScentScaleFactory {
  return (domain) =>
    scaleLinear()
      .domain([0, max ?? domain[1]])
      .range([0, 1])
      .clamp(true);
}

function clampRatio(ratio: number) {
  return Math.min(1, Math.max(0, ratio));
}

/**
 * Computes a function mapping a raw scent value to a normalized 0–1 ratio,
 * given the full set of values it should be scaled against. Shared by
 * `useScentedItems` (dropdown item counts) and `useScentHistogram` (bin
 * counts) — anywhere a set of counts needs to become comparable bar sizes.
 *
 * The result is always clamped to `[0, 1]`, regardless of `scale` — this is
 * the one place every scented widget's ratio passes through, so consumers
 * (bars, labels, whatever future widgets add) can trust the value instead of
 * each independently defending against a custom scale that doesn't clamp,
 * or floating-point rounding at a domain boundary.
 */
export function computeScentRatios(
  values: readonly number[],
  scale: ScentScaleFactory = defaultScentScale
): (value: number) => number {
  const [min, max] = extent(values);
  const domain: [number, number] =
    min === undefined || max === undefined
      ? [0, 0]
      : min === max
        ? [0, max]
        : [min, max];

  if (domain[0] === domain[1]) {
    const ratio = domain[1] > 0 ? 1 : 0;
    return () => ratio;
  }
  const toRatio = scale(domain);
  return (value) => clampRatio(toRatio(value));
}
