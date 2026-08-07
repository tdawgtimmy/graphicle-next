import { renderHook } from "@testing-library/react";
import { bin } from "d3-array";
import { describe, expect, it } from "vitest";

import { useLayeredScentHistogram } from "@/components/ui/scented/use-scent-histogram";

const identity = (v: number) => v;

describe("useLayeredScentHistogram", () => {
  it("bins across the full domain, not just the data's extent", () => {
    // Data only occupies 40-60, but the bars must span the whole track.
    const values = [40, 45, 50, 55, 60];
    const { result } = renderHook(() =>
      useLayeredScentHistogram(values, identity, [0, 100], null)
    );

    expect(result.current[0].x0).toBe(0);
    expect(result.current[result.current.length - 1].x1).toBe(100);
  });

  it("keeps bin boundaries fixed as the selected range moves", () => {
    const values = Array.from({ length: 200 }, (_, i) => i % 100);
    const edgesFor = (range: [number, number] | null) => {
      const { result } = renderHook(() =>
        useLayeredScentHistogram(values, identity, [0, 100], range)
      );
      return result.current.map((b) => [b.x0, b.x1]);
    };

    const unselected = edgesFor(null);
    expect(edgesFor([0, 10])).toEqual(unselected);
    expect(edgesFor([45, 55])).toEqual(unselected);
    expect(edgesFor([90, 100])).toEqual(unselected);
  });

  it("never lets the selected layer out-grow its shadow", () => {
    const values = Array.from({ length: 300 }, (_, i) => (i * 7) % 100);

    for (const range of [
      [0, 5],
      [12, 37],
      [50, 51],
      [0, 100],
    ] as [number, number][]) {
      const { result } = renderHook(() =>
        useLayeredScentHistogram(values, identity, [0, 100], range)
      );
      for (const b of result.current) {
        expect(b.selectedRatio).toBeLessThanOrEqual(b.ratio);
        expect(b.selectedCount).toBeLessThanOrEqual(b.count);
      }
    }
  });

  it("does not rescale the shadow layer when the selection changes", () => {
    const values = Array.from({ length: 300 }, (_, i) => (i * 7) % 100);
    const ratiosFor = (range: [number, number] | null) =>
      renderHook(() =>
        useLayeredScentHistogram(values, identity, [0, 100], range)
      ).result.current.map((b) => b.ratio);

    const base = ratiosFor(null);
    expect(ratiosFor([10, 20])).toEqual(base);
    expect(ratiosFor([0, 100])).toEqual(base);
  });

  it("fills a boundary bin by where its points actually fall, not by bin width", () => {
    // One bin per 10 units. The 20-30 bin holds four points, clustered low.
    const values = [21, 22, 23, 24, 35, 45, 55, 65];
    const operator = bin<number, number>().thresholds([
      10, 20, 30, 40, 50, 60, 70,
    ]);

    const { result } = renderHook(() =>
      // A cut at 28 is 80% of the way across the 20-30 bin, but *all four*
      // of its points sit below 25 — so the fill must be 100%, not 80%.
      useLayeredScentHistogram(values, identity, [0, 80], [0, 28], operator)
    );

    const boundaryBin = result.current.find((b) => b.x0 === 20)!;
    expect(boundaryBin.count).toBe(4);
    expect(boundaryBin.selectedCount).toBe(4);
    expect(boundaryBin.selectedRatio).toBe(boundaryBin.ratio);
  });

  it("partially fills a boundary bin when only some points are selected", () => {
    const values = [21, 22, 27, 28, 35, 45];
    const operator = bin<number, number>().thresholds([
      10, 20, 30, 40, 50, 60, 70,
    ]);

    const { result } = renderHook(() =>
      useLayeredScentHistogram(values, identity, [0, 80], [0, 25], operator)
    );

    const boundaryBin = result.current.find((b) => b.x0 === 20)!;
    expect(boundaryBin.count).toBe(4);
    expect(boundaryBin.selectedCount).toBe(2);
    expect(boundaryBin.selectedRatio).toBeCloseTo(boundaryBin.ratio / 2, 10);
  });

  it("reports a zero selected layer when nothing is selected", () => {
    const values = Array.from({ length: 50 }, (_, i) => i);
    const { result } = renderHook(() =>
      useLayeredScentHistogram(values, identity, [0, 100], null)
    );

    expect(result.current.length).toBeGreaterThan(0);
    for (const b of result.current) {
      expect(b.selectedCount).toBe(0);
      expect(b.selectedRatio).toBe(0);
    }
  });

  it("scales bars from zero, so only an empty bin is zero-height", () => {
    const values = [
      ...Array.from({ length: 20 }, () => 5),
      ...Array.from({ length: 4 }, () => 15),
    ];
    const operator = bin<number, number>().thresholds([10, 20, 30]);

    const { result } = renderHook(() =>
      useLayeredScentHistogram(values, identity, [0, 30], null, operator)
    );

    const busiest = result.current.find((b) => b.count === 20)!;
    const quiet = result.current.find((b) => b.count === 4)!;
    const empty = result.current.find((b) => b.count === 0);

    expect(busiest.ratio).toBe(1);
    // The smallest *non-empty* bin must stay visible, at its true proportion.
    expect(quiet.ratio).toBeCloseTo(0.2, 10);
    if (empty) expect(empty.ratio).toBe(0);
  });

  it("returns an empty array for empty input", () => {
    const { result } = renderHook(() =>
      useLayeredScentHistogram([] as number[], identity, [0, 100], [0, 50])
    );
    expect(result.current).toEqual([]);
  });
});
