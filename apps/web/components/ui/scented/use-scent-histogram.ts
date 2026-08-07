"use client";

import * as React from "react";
import {
  bin,
  thresholdFreedmanDiaconis,
  thresholdSturges,
  type HistogramGeneratorNumber,
} from "d3-array";

import {
  computeScentRatios,
  zeroBasedScale,
  type ScentScaleFactory,
} from "@/components/ui/scented/scent-scale";

export interface ScentBin {
  x0: number;
  x1: number;
  count: number;
  ratio: number;
}

export interface LayeredScentBin extends ScentBin {
  /** Count of items in this bin that fall inside the selected range. */
  selectedCount: number;
  /**
   * `selectedCount` normalized against the *same* denominator as `ratio`, so
   * `selectedRatio <= ratio` always holds and the selected portion reads as
   * a fraction of the whole bin rather than its own independent bar.
   */
  selectedRatio: number;
}

/**
 * Default bin-count rule: `max(Sturges, Freedman–Diaconis)`, mirroring
 * NumPy's `bins='auto'`.
 *
 * Freedman–Diaconis scales with the IQR, so it stays sensible on skewed data
 * and data with outliers — neither of which arbitrary filter fields can be
 * assumed to be free of. Its weakness is the low end: it under-bins small
 * samples, and d3's implementation collapses to a single bin whenever the
 * IQR is 0 (many repeated values), which would flatten the histogram
 * entirely. Sturges depends only on sample size, so it can't collapse that
 * way; taking the larger of the two uses it as a floor.
 *
 * See `notes/scented-slider.md`.
 */
export function thresholdAuto(
  values: ArrayLike<number>,
  min: number,
  max: number
): number {
  return Math.max(
    thresholdSturges(values),
    thresholdFreedmanDiaconis(values, min, max)
  );
}

/**
 * Bins `items` by a numeric value extracted via `getValue`, then scales each
 * bin's count to a 0–1 ratio via the same primitive `useScentedItems` uses
 * (`computeScentRatios`) — the shared "counts → comparable bar sizes" logic
 * across all scented widgets, applied here to histogram bins instead of
 * per-item counts.
 *
 * `getValue` always wins over whatever `.value()` a custom `binOperator`
 * may already have configured — it's applied on top, every time, so callers
 * never have to redundantly wire up their own accessor to customize
 * `.domain()`/`.thresholds()`.
 *
 * Defaults to `zeroBasedScale()` rather than the sqrt `defaultScentScale`
 * used for dropdown items — see that helper for why bars want zero-based
 * linear scaling.
 */
export function useScentHistogram<Item>(
  items: readonly Item[],
  getValue: (item: Item) => number,
  binOperator?: HistogramGeneratorNumber<Item, number>,
  scale?: ScentScaleFactory
): ScentBin[] {
  return React.useMemo(() => {
    if (items.length === 0) return [];

    const operator = (
      binOperator ?? bin<Item, number>().thresholds(thresholdAuto)
    ).value(getValue);

    const bins = operator(items);
    const counts = bins.map((b) => b.length);
    const toRatio = computeScentRatios(counts, scale ?? zeroBasedScale());

    return bins.map((b) => ({
      x0: b.x0 ?? 0,
      x1: b.x1 ?? 0,
      count: b.length,
      ratio: toRatio(b.length),
    }));
  }, [items, getValue, binOperator, scale]);
}

/**
 * Bins `items` once over a fixed `domain`, then reports — per bin — both the
 * full count and how much of it falls inside `range`. This is the data model
 * for a two-layer scent histogram: a fixed "shadow" bar showing the whole
 * distribution, and a "primary" bar showing the selected portion of it.
 *
 * Two invariants make the layering read correctly, both of which fall out of
 * doing the work here rather than in two independent histograms:
 *
 * - **Bin alignment.** The selected subset is binned against the *same*
 *   materialized thresholds as the full set, so bin `i` covers the same
 *   `[x0, x1)` in both layers. Re-deriving thresholds from a filtered subset
 *   (which any count- or rule-based `thresholds` would do) would shift the
 *   boundaries as the selection moves.
 * - **Shared normalization.** `selectedRatio` is scaled against the full
 *   set's peak count, never the subset's own, so a selected bar can never
 *   out-grow its shadow and bars don't resize relative to each other as the
 *   selection changes.
 *
 * Partial bins need no special handling: a bin straddling a range boundary
 * simply contains fewer selected items, so its fill is proportional to where
 * the data points actually fall, not to a linear sweep across the bin's width.
 */
export function useLayeredScentHistogram<Item>(
  items: readonly Item[],
  getValue: (item: Item) => number,
  domain: readonly [number, number],
  range: readonly [number, number] | null | undefined,
  binOperator?: HistogramGeneratorNumber<Item, number>,
  scale?: ScentScaleFactory
): LayeredScentBin[] {
  const [domainMin, domainMax] = domain;
  const rangeMin = range?.[0];
  const rangeMax = range?.[1];

  return React.useMemo(() => {
    if (items.length === 0) return [];

    // The domain is forced (rather than left to d3's default data extent) so
    // bins span the full track, not just the range the data happens to cover.
    const operator = (
      binOperator ?? bin<Item, number>().thresholds(thresholdAuto)
    )
      .value(getValue)
      .domain([domainMin, domainMax]);

    const bins = operator(items);
    const counts = bins.map((b) => b.length);
    // Zero-based, so an empty bin — not merely the smallest one — reads as
    // zero. Both layers then run through this one function, which is what
    // makes `selectedRatio <= ratio` hold: it's monotonic, and
    // `selectedCount <= count` by construction.
    const baseScale = scale ?? zeroBasedScale();
    const toRatio = computeScentRatios(counts, (d) => baseScale([0, d[1]]));

    return bins.map((b) => {
      const selectedCount =
        rangeMin === undefined || rangeMax === undefined
          ? 0
          : b.reduce((n, item) => {
              const v = getValue(item);
              return v >= rangeMin && v <= rangeMax ? n + 1 : n;
            }, 0);

      return {
        x0: b.x0 ?? 0,
        x1: b.x1 ?? 0,
        count: b.length,
        ratio: toRatio(b.length),
        selectedCount,
        selectedRatio: toRatio(selectedCount),
      };
    });
  }, [
    items,
    getValue,
    domainMin,
    domainMax,
    rangeMin,
    rangeMax,
    binOperator,
    scale,
  ]);
}
