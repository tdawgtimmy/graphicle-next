import { renderHook } from "@testing-library/react"
import {
  bin,
  thresholdFreedmanDiaconis,
  thresholdSturges,
} from "d3-array"
import { describe, expect, it } from "vitest"

import {
  thresholdAuto,
  useScentHistogram,
} from "@/components/ui/scented/use-scent-histogram"

describe("thresholdAuto", () => {
  it("is max(Sturges, Freedman-Diaconis), matching NumPy's bins='auto'", () => {
    // Skewed with an outlier: FD (IQR-based) should dominate Sturges here.
    const values = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 5, 100]
    const min = Math.min(...values)
    const max = Math.max(...values)

    const sturges = thresholdSturges(values)
    const fd = thresholdFreedmanDiaconis(values, min, max)
    expect(thresholdAuto(values, min, max)).toBe(Math.max(sturges, fd))
    expect(fd).toBeGreaterThan(sturges)
  })

  it("falls back to Sturges when Freedman-Diaconis would under-bin", () => {
    // Small, tightly clustered sample: FD returns 1 (see d3-array source,
    // `c && d ? ... : 1`), so Sturges should be the one that wins.
    const values = [5, 5, 5]
    const sturges = thresholdSturges(values)
    expect(thresholdAuto(values, 5, 5)).toBe(sturges)
  })
})

describe("useScentHistogram", () => {
  it("every item lands in exactly one bin", () => {
    const values = Array.from({ length: 50 }, (_, i) => i)
    const { result } = renderHook(() =>
      useScentHistogram(values, (v: number) => v)
    )

    const total = result.current.reduce((sum, b) => sum + b.count, 0)
    expect(total).toBe(values.length)
  })

  it("scales bin counts to a 0-1 ratio, highest count -> 1", () => {
    // Heavily concentrate values into one bin's range so it has a
    // distinctly higher count than the rest.
    const values = [
      ...Array.from({ length: 40 }, () => 5),
      10,
      20,
      30,
      40,
    ]
    const { result } = renderHook(() =>
      useScentHistogram(values, (v: number) => v)
    )

    const maxCount = Math.max(...result.current.map((b) => b.count))
    const maxBin = result.current.find((b) => b.count === maxCount)!
    expect(maxBin.ratio).toBe(1)

    for (const b of result.current) {
      expect(b.ratio).toBeGreaterThanOrEqual(0)
      expect(b.ratio).toBeLessThanOrEqual(1)
    }
  })

  it("getValue always wins over a custom operator's own .value()", () => {
    interface Item {
      wrong: number
      right: number
    }
    const items: Item[] = [
      { wrong: 999, right: 1 },
      { wrong: 999, right: 2 },
      { wrong: 999, right: 3 },
    ]

    const customOperator = bin<Item, number>().value((d) => d.wrong)

    const { result } = renderHook(() =>
      useScentHistogram(items, (item: Item) => item.right, customOperator)
    )

    const total = result.current.reduce((sum, b) => sum + b.count, 0)
    expect(total).toBe(items.length)
    // If `.value(d => d.wrong)` had won, every item (all wrong=999) would
    // collapse into a single degenerate bin instead of spreading 1-3.
    expect(result.current.length).toBeGreaterThan(1)
  })

  it("respects a fully custom bin operator's thresholds", () => {
    const values = [1, 5, 11, 15, 21, 25]
    const customOperator = bin<number, number>()
      .thresholds([10, 20])
      .domain([0, 30])

    const { result } = renderHook(() =>
      useScentHistogram(values, (v: number) => v, customOperator)
    )

    expect(result.current).toHaveLength(3)
    expect(result.current.map((b) => b.count)).toEqual([2, 2, 2])
  })

  it("returns an empty array for an empty input, instead of d3.bin()'s own degenerate single bin", () => {
    const { result } = renderHook(() =>
      useScentHistogram([] as number[], (v: number) => v)
    )
    expect(result.current).toEqual([])
  })
})
