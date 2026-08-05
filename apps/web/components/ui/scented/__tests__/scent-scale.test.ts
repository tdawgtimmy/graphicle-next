import { describe, expect, it } from "vitest"

import { computeScentRatios } from "@/components/ui/scented/scent-scale"

describe("computeScentRatios", () => {
  it("maps the max value to 1 and the min value to 0", () => {
    const toRatio = computeScentRatios([4, 15, 62, 90, 120, 210, 340])
    expect(toRatio(340)).toBe(1)
    expect(toRatio(4)).toBe(0)
  })

  it("matches the sqrt-scale math for a known domain", () => {
    // domain [4, 340]; sqrt(120) normalized against sqrt(4)..sqrt(340)
    const toRatio = computeScentRatios([4, 340, 120])
    const expected =
      (Math.sqrt(120) - Math.sqrt(4)) / (Math.sqrt(340) - Math.sqrt(4))
    expect(toRatio(120)).toBeCloseTo(expected, 10)
  })

  it("handles a degenerate domain (all equal, > 0) without NaN", () => {
    const toRatio = computeScentRatios([7, 7, 7])
    expect(toRatio(7)).toBe(1)
  })

  it("handles a degenerate domain of all zeros without NaN", () => {
    const toRatio = computeScentRatios([0, 0, 0])
    expect(toRatio(0)).toBe(0)
  })

  it("supports a custom scale factory", () => {
    const toRatio = computeScentRatios([0, 100], (domain) => (value) => {
      const [min, max] = domain
      return (value - min) / (max - min)
    })
    expect(toRatio(50)).toBe(0.5)
  })

  it("clamps a custom scale's output to [0, 1], even if it doesn't clamp itself", () => {
    // A deliberately non-conforming scale: unbounded linear, no clamping,
    // called with values outside the domain it was built from.
    const toRatio = computeScentRatios([0, 100], (domain) => (value) => {
      const [min, max] = domain
      return (value - min) / (max - min)
    })
    expect(toRatio(500)).toBe(1)
    expect(toRatio(-500)).toBe(0)
  })
})
